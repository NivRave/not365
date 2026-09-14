package store

import (
	"context"
	"fmt"
	"sort"
	"time"

	"github.com/NivRave/not365/backend/internal/domain"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

type MongoStore struct {
	client    *mongo.Client
	db        *mongo.Database
	timelines *mongo.Collection
	snapshots *mongo.Collection
}

func NewMongoStore(ctx context.Context, uri, dbName string) (*MongoStore, error) {
	clientOpts := options.Client().ApplyURI(uri)
	client, err := mongo.Connect(clientOpts)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to mongodb: %w", err)
	}

	if err := client.Ping(ctx, nil); err != nil {
		return nil, fmt.Errorf("failed to ping mongodb: %w", err)
	}

	db := client.Database(dbName)
	timelines := db.Collection("match_timelines")
	snapshots := db.Collection("match_snapshots")

	// Create Indexes
	_, err = timelines.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{
			Keys: bson.D{
				{Key: "sport", Value: 1},
				{Key: "start_time", Value: 1},
			},
		},
		{
			Keys: bson.D{
				{Key: "league_id", Value: 1},
			},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create mongo indexes for timelines: %w", err)
	}

	_, err = snapshots.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{
			{Key: "match_id", Value: 1},
			{Key: "sequence", Value: 1},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create mongo indexes for snapshots: %w", err)
	}

	return &MongoStore{
		client:    client,
		db:        db,
		timelines: timelines,
		snapshots: snapshots,
	}, nil
}

func (s *MongoStore) Close(ctx context.Context) error {
	return s.client.Disconnect(ctx)
}

func (s *MongoStore) UpsertMatchTimeline(ctx context.Context, match *domain.MatchEvent) error {
	opts := options.UpdateOne().SetUpsert(true)
	filter := bson.M{"_id": match.ID}

	update := bson.M{
		"$set": bson.M{
			"sport":       match.Sport,
			"league_id":   match.LeagueID,
			"league_name": match.LeagueName,
			"home_team":   match.HomeTeam,
			"away_team":   match.AwayTeam,
			"status":      match.Status,
			"start_time":  match.StartTime,
			"score":       match.Score,
			"clock":       match.Clock,
			"sequence":    match.Sequence,
			"updated_at":  match.UpdatedAt,
		},
	}

	if len(match.Events) > 0 {
		update["$set"].(bson.M)["events"] = match.Events
	}

	_, err := s.timelines.UpdateOne(ctx, filter, update, opts)
	return err
}

func (s *MongoStore) GetMatchTimeline(ctx context.Context, matchID string) (*domain.MatchEvent, error) {
	filter := bson.M{"_id": matchID}
	var match domain.MatchEvent
	err := s.timelines.FindOne(ctx, filter).Decode(&match)
	if err != nil {
		return nil, err
	}
	return &match, nil
}

func (s *MongoStore) AppendEvents(ctx context.Context, matchID string, events []domain.Event, newSequence int64) error {
	if len(events) == 0 {
		return nil
	}

	filter := bson.M{"_id": matchID}
	update := bson.M{
		"$push": bson.M{
			"events": bson.M{
				"$each": events,
			},
		},
		"$set": bson.M{
			"sequence":   newSequence,
			"updated_at": time.Now().UTC(),
		},
	}

	_, err := s.timelines.UpdateOne(ctx, filter, update)
	return err
}

func (s *MongoStore) GetEventsSince(ctx context.Context, matchID string, sinceSequence int64) ([]domain.Event, error) {
	match, err := s.GetMatchTimeline(ctx, matchID)
	if err != nil {
		return nil, err
	}

	var missed []domain.Event
	for _, ev := range match.Events {
		// Return events that happened chronologically or all events if full resync
		missed = append(missed, ev)
	}

	return missed, nil
}

func (s *MongoStore) ListMatches(ctx context.Context, f domain.MatchFilter) ([]domain.MatchEvent, error) {
	filter := bson.M{}

	if f.Sport != "" {
		filter["sport"] = f.Sport
	}

	if f.LeagueID != "" {
		filter["league_id"] = f.LeagueID
	}

	if f.Status != "" && f.Status != "all" {
		switch f.Status {
		case "live":
			filter["status"] = bson.M{"$in": []string{string(domain.StatusLive), string(domain.StatusHalftime)}}
		case "upcoming", "scheduled":
			filter["status"] = domain.StatusScheduled
		case "finished":
			filter["status"] = domain.StatusFinished
		default:
			filter["status"] = f.Status
		}
	}

	if f.StartDate != nil || f.EndDate != nil {
		dateFilter := bson.M{}
		if f.StartDate != nil {
			dateFilter["$gte"] = *f.StartDate
		}
		if f.EndDate != nil {
			dateFilter["$lte"] = *f.EndDate
		}
		filter["start_time"] = dateFilter
	}

	if f.TeamID != "" {
		filter["$or"] = []bson.M{
			{"home_team.id": f.TeamID},
			{"away_team.id": f.TeamID},
		}
	} else if len(f.TeamIDs) > 0 {
		filter["$or"] = []bson.M{
			{"home_team.id": bson.M{"$in": f.TeamIDs}},
			{"away_team.id": bson.M{"$in": f.TeamIDs}},
		}
	}

	if f.Search != "" {
		searchPattern := bson.M{"$regex": f.Search, "$options": "i"}
		filter["$or"] = []bson.M{
			{"home_team.name": searchPattern},
			{"away_team.name": searchPattern},
			{"league_name": searchPattern},
		}
	}

	opts := options.Find().SetSort(bson.D{{Key: "start_time", Value: 1}})
	if f.Limit > 0 {
		opts.SetLimit(int64(f.Limit))
	}

	cursor, err := s.timelines.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var matches []domain.MatchEvent
	if err := cursor.All(ctx, &matches); err != nil {
		return nil, err
	}
	return matches, nil
}

func (s *MongoStore) ListMatchesBySportAndDate(ctx context.Context, sport domain.Sport, start, end time.Time) ([]domain.MatchEvent, error) {
	return s.ListMatches(ctx, domain.MatchFilter{
		Sport:     sport,
		StartDate: &start,
		EndDate:   &end,
	})
}

func (s *MongoStore) ListTeams(ctx context.Context, sport domain.Sport, leagueID string) ([]domain.Team, error) {
	filter := bson.M{}
	if sport != "" {
		filter["sport"] = sport
	}
	if leagueID != "" {
		filter["league_id"] = leagueID
	}

	cursor, err := s.timelines.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	teamMap := make(map[string]domain.Team)
	for cursor.Next(ctx) {
		var m domain.MatchEvent
		if err := cursor.Decode(&m); err == nil {
			if m.HomeTeam.ID != "" {
				teamMap[m.HomeTeam.ID] = m.HomeTeam
			}
			if m.AwayTeam.ID != "" {
				teamMap[m.AwayTeam.ID] = m.AwayTeam
			}
		}
	}

	teams := make([]domain.Team, 0, len(teamMap))
	for _, t := range teamMap {
		teams = append(teams, t)
	}

	sort.Slice(teams, func(i, j int) bool {
		return teams[i].Name < teams[j].Name
	})

	return teams, nil
}

func (s *MongoStore) GetTeamDetail(ctx context.Context, teamID string) (*domain.Team, []domain.MatchEvent, error) {
	filter := bson.M{
		"$or": []bson.M{
			{"home_team.id": teamID},
			{"away_team.id": teamID},
		},
	}

	opts := options.Find().SetSort(bson.D{{Key: "start_time", Value: 1}})
	cursor, err := s.timelines.Find(ctx, filter, opts)
	if err != nil {
		return nil, nil, err
	}
	defer cursor.Close(ctx)

	var matches []domain.MatchEvent
	if err := cursor.All(ctx, &matches); err != nil {
		return nil, nil, err
	}

	var team *domain.Team
	for _, m := range matches {
		if m.HomeTeam.ID == teamID {
			t := m.HomeTeam
			team = &t
			break
		}
		if m.AwayTeam.ID == teamID {
			t := m.AwayTeam
			team = &t
			break
		}
	}

	return team, matches, nil
}

func (s *MongoStore) GetLeagueStandings(ctx context.Context, leagueID string) ([]domain.StandingsRow, error) {
	filter := bson.M{"league_id": leagueID}
	opts := options.Find().SetSort(bson.D{{Key: "start_time", Value: 1}})
	cursor, err := s.timelines.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	table := make(map[string]*domain.StandingsRow)

	for cursor.Next(ctx) {
		var m domain.MatchEvent
		if err := cursor.Decode(&m); err != nil {
			continue
		}

		if _, exists := table[m.HomeTeam.ID]; !exists && m.HomeTeam.ID != "" {
			table[m.HomeTeam.ID] = &domain.StandingsRow{
				Team: m.HomeTeam,
				Form: []string{},
			}
		}
		if _, exists := table[m.AwayTeam.ID]; !exists && m.AwayTeam.ID != "" {
			table[m.AwayTeam.ID] = &domain.StandingsRow{
				Team: m.AwayTeam,
				Form: []string{},
			}
		}

		if m.Status == domain.StatusFinished && m.Score != nil {
			hRow := table[m.HomeTeam.ID]
			aRow := table[m.AwayTeam.ID]

			if hRow != nil && aRow != nil {
				hRow.Played++
				aRow.Played++
				hRow.GoalsFor += m.Score.Home
				hRow.GoalsAgainst += m.Score.Away
				hRow.GoalDifference = hRow.GoalsFor - hRow.GoalsAgainst
				aRow.GoalsFor += m.Score.Away
				aRow.GoalsAgainst += m.Score.Home
				aRow.GoalDifference = aRow.GoalsFor - aRow.GoalsAgainst

				if m.Score.Home > m.Score.Away {
					hRow.Won++
					hRow.Points += 3
					hRow.Form = append(hRow.Form, "W")
					aRow.Lost++
					aRow.Form = append(aRow.Form, "L")
				} else if m.Score.Home < m.Score.Away {
					aRow.Won++
					aRow.Points += 3
					aRow.Form = append(aRow.Form, "W")
					hRow.Lost++
					hRow.Form = append(hRow.Form, "L")
				} else {
					hRow.Drawn++
					hRow.Points++
					hRow.Form = append(hRow.Form, "D")
					aRow.Drawn++
					aRow.Points++
					aRow.Form = append(aRow.Form, "D")
				}
			}
		}
	}

	rows := make([]domain.StandingsRow, 0, len(table))
	for _, r := range table {
		if len(r.Form) > 5 {
			r.Form = r.Form[len(r.Form)-5:]
		}
		rows = append(rows, *r)
	}

	sort.Slice(rows, func(i, j int) bool {
		if rows[i].Points != rows[j].Points {
			return rows[i].Points > rows[j].Points
		}
		if rows[i].GoalDifference != rows[j].GoalDifference {
			return rows[i].GoalDifference > rows[j].GoalDifference
		}
		return rows[i].GoalsFor > rows[j].GoalsFor
	})

	for i := range rows {
		rows[i].Position = i + 1
	}

	return rows, nil
}

func (s *MongoStore) GetMatchH2H(ctx context.Context, homeTeamID, awayTeamID string) ([]domain.H2HEncounter, error) {
	filter := bson.M{
		"$or": []bson.M{
			{"$and": []bson.M{{"home_team.id": homeTeamID}, {"away_team.id": awayTeamID}}},
			{"$and": []bson.M{{"home_team.id": awayTeamID}, {"away_team.id": homeTeamID}}},
		},
		"status": domain.StatusFinished,
	}

	opts := options.Find().SetSort(bson.D{{Key: "start_time", Value: -1}}).SetLimit(10)
	cursor, err := s.timelines.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var encounters []domain.H2HEncounter
	for cursor.Next(ctx) {
		var m domain.MatchEvent
		if err := cursor.Decode(&m); err == nil && m.Score != nil {
			winner := "draw"
			if m.Score.Home > m.Score.Away {
				winner = "home"
			} else if m.Score.Away > m.Score.Home {
				winner = "away"
			}
			encounters = append(encounters, domain.H2HEncounter{
				ID:         m.ID,
				Date:       m.StartTime,
				LeagueName: m.LeagueName,
				HomeTeam:   m.HomeTeam,
				AwayTeam:   m.AwayTeam,
				HomeScore:  m.Score.Home,
				AwayScore:  m.Score.Away,
				Winner:     winner,
			})
		}
	}

	return encounters, nil
}

