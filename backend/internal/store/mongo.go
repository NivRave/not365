package store

import (
	"context"
	"fmt"
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

func (s *MongoStore) ListMatchesBySportAndDate(ctx context.Context, sport domain.Sport, start, end time.Time) ([]domain.MatchEvent, error) {
	filter := bson.M{
		"sport": sport,
		"start_time": bson.M{
			"$gte": start,
			"$lte": end,
		},
	}

	opts := options.Find().SetSort(bson.D{{Key: "start_time", Value: 1}})
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
