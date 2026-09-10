package adapter_test

import (
	"encoding/json"
	"testing"

	"github.com/NivRave/not365/backend/internal/adapter"
	"github.com/NivRave/not365/backend/internal/domain"
)

func TestESPNSoccerAdapter(t *testing.T) {
	fixture := `{
		"leagues": [{"id": "eng.1", "name": "English Premier League", "slug": "epl"}],
		"events": [{
			"id": "401547389",
			"date": "2026-09-10T19:00:00Z",
			"name": "Manchester City vs Arsenal",
			"status": {
				"clock": 72.0,
				"displayClock": "72'",
				"period": 2,
				"type": {"id": "2", "name": "STATUS_IN_PROGRESS", "state": "in", "completed": false, "description": "In Progress"}
			},
			"competitions": [{
				"id": "401547389",
				"competitors": [
					{
						"id": "382",
						"homeAway": "home",
						"score": "2",
						"team": {"id": "382", "name": "Manchester City", "shortDisplayName": "Man City", "abbreviation": "MCI"}
					},
					{
						"id": "359",
						"homeAway": "away",
						"score": "1",
						"team": {"id": "359", "name": "Arsenal", "shortDisplayName": "Arsenal", "abbreviation": "ARS"}
					}
				],
				"details": [
					{
						"type": {"text": "Goal"},
						"clock": {"displayValue": "23'"},
						"team": {"id": "382"},
						"athletesInvolved": [{"displayName": "Erling Haaland"}]
					}
				]
			}]
		}]
	}`

	adp := adapter.NewESPNSoccerAdapter()
	matches, err := adp.ParseScoreboard(json.RawMessage(fixture))
	if err != nil {
		t.Fatalf("ParseScoreboard failed: %v", err)
	}

	if len(matches) != 1 {
		t.Fatalf("Expected 1 match, got %d", len(matches))
	}

	m := matches[0]
	if m.ID != "football:espn:401547389" {
		t.Errorf("Unexpected ID: %s", m.ID)
	}
	if m.Status != domain.StatusLive {
		t.Errorf("Expected status live, got %s", m.Status)
	}
	if m.Score.Home != 2 || m.Score.Away != 1 {
		t.Errorf("Expected score 2-1, got %d-%d", m.Score.Home, m.Score.Away)
	}
	if len(m.Events) != 1 || m.Events[0].Player != "Erling Haaland" {
		t.Errorf("Unexpected events: %+v", m.Events)
	}
}

func TestNBAAdapter(t *testing.T) {
	fixture := `{
		"scoreboard": {
			"gameDate": "2026-09-10",
			"games": [{
				"gameId": "0022400123",
				"gameCode": "20260910/BOSMIA",
				"gameStatus": 2,
				"gameStatusText": "Q3 4:22",
				"period": 3,
				"gameClock": "PT04M22.00S",
				"gameTimeUTC": "2026-09-10T23:30:00Z",
				"homeTeam": {
					"teamId": 1610612748,
					"teamName": "Heat",
					"teamCity": "Miami",
					"teamTricode": "MIA",
					"score": 78,
					"periods": [{"period": 1, "periodType": "REGULAR", "score": 28}]
				},
				"awayTeam": {
					"teamId": 1610612738,
					"teamName": "Celtics",
					"teamCity": "Boston",
					"teamTricode": "BOS",
					"score": 82,
					"periods": [{"period": 1, "periodType": "REGULAR", "score": 30}]
				}
			}]
		}
	}`

	adp := adapter.NewNBAAdapter()
	matches, err := adp.ParseScoreboard(json.RawMessage(fixture))
	if err != nil {
		t.Fatalf("ParseScoreboard failed: %v", err)
	}

	if len(matches) != 1 {
		t.Fatalf("Expected 1 match, got %d", len(matches))
	}

	m := matches[0]
	if m.ID != "basketball:nba:0022400123" {
		t.Errorf("Unexpected ID: %s", m.ID)
	}
	if m.Status != domain.StatusLive {
		t.Errorf("Expected status live, got %s", m.Status)
	}
	if m.Score.Home != 78 || m.Score.Away != 82 {
		t.Errorf("Expected score 78-82, got %d-%d", m.Score.Home, m.Score.Away)
	}
}

func TestOpenLigaDBAdapter(t *testing.T) {
	fixture := `[{
		"matchID": 68123,
		"matchDateTimeUTC": "2026-09-10T18:30:00Z",
		"leagueName": "1. Fussball-Bundesliga",
		"team1": {"teamId": 7, "teamName": "Borussia Dortmund", "shortName": "BVB"},
		"team2": {"teamId": 40, "teamName": "FC Bayern München", "shortName": "Bayern"},
		"matchIsFinished": true,
		"matchResults": [
			{"resultName": "Halbzeitergebnis", "pointsTeam1": 1, "pointsTeam2": 1, "resultOrderID": 1},
			{"resultName": "Endergebnis", "pointsTeam1": 2, "pointsTeam2": 1, "resultOrderID": 2}
		],
		"goals": [
			{"goalID": 99812, "scoreTeam1": 1, "scoreTeam2": 0, "matchMinute": 14, "goalGetterName": "Brandt"}
		]
	}]`

	adp := adapter.NewOpenLigaDBAdapter()
	matches, err := adp.ParseScoreboard(json.RawMessage(fixture))
	if err != nil {
		t.Fatalf("ParseScoreboard failed: %v", err)
	}

	if len(matches) != 1 {
		t.Fatalf("Expected 1 match, got %d", len(matches))
	}

	m := matches[0]
	if m.ID != "football:openligadb:68123" {
		t.Errorf("Unexpected ID: %s", m.ID)
	}
	if m.Status != domain.StatusFinished {
		t.Errorf("Expected status finished, got %s", m.Status)
	}
	if m.Score.Home != 2 || m.Score.Away != 1 {
		t.Errorf("Expected score 2-1, got %d-%d", m.Score.Home, m.Score.Away)
	}
}
