package ingestion

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os/exec"
	"sync"
	"sync/atomic"
	"time"
)

type MCPClient struct {
	cmd        *exec.Cmd
	stdin      io.WriteCloser
	stdout     *bufio.Reader
	pendingMu  sync.Mutex
	pending    map[int64]chan []byte
	reqCounter atomic.Int64
	httpClient *http.Client
	useStdio   bool
}

type jsonrpcRequest struct {
	JSONRPC string         `json:"jsonrpc"`
	ID      int64          `json:"id"`
	Method  string         `json:"method"`
	Params  map[string]any `json:"params,omitempty"`
}

type jsonrpcResponse struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      int64           `json:"id"`
	Result  json.RawMessage `json:"result,omitempty"`
	Error   *struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

func NewMCPClient(ctx context.Context, configPath string, tryStdio bool) (*MCPClient, error) {
	client := &MCPClient{
		pending:    make(map[int64]chan []byte),
		httpClient: &http.Client{Timeout: 10 * time.Second},
	}

	if tryStdio {
		args := []string{"sportsdata-mcp"}
		if configPath != "" {
			args = append(args, "--config", configPath)
		}
		args = append(args, "serve")

		cmd := exec.CommandContext(ctx, "uvx", args...)
		stdin, err := cmd.StdinPipe()
		if err == nil {
			stdoutPipe, err := cmd.StdoutPipe()
			if err == nil {
				if err := cmd.Start(); err == nil {
					client.cmd = cmd
					client.stdin = stdin
					client.stdout = bufio.NewReader(stdoutPipe)
					client.useStdio = true
					go client.readLoop()
					log.Printf("MCP stdio client connected via uvx sportsdata-mcp serve")
					return client, nil
				}
			}
		}
		log.Printf("MCP stdio process not available; falling back to direct HTTP sports APIs")
	}

	return client, nil
}

func (c *MCPClient) readLoop() {
	for {
		line, err := c.stdout.ReadBytes('\n')
		if err != nil {
			return
		}

		var resp jsonrpcResponse
		if err := json.Unmarshal(line, &resp); err != nil {
			continue
		}

		c.pendingMu.Lock()
		ch, exists := c.pending[resp.ID]
		if exists {
			delete(c.pending, resp.ID)
		}
		c.pendingMu.Unlock()

		if exists && ch != nil {
			ch <- resp.Result
		}
	}
}

func (c *MCPClient) CallTool(ctx context.Context, toolName string, arguments map[string]any) (json.RawMessage, error) {
	if c.useStdio && c.stdin != nil {
		reqID := c.reqCounter.Add(1)
		req := jsonrpcRequest{
			JSONRPC: "2.0",
			ID:      reqID,
			Method:  "tools/call",
			Params: map[string]any{
				"name":      toolName,
				"arguments": arguments,
			},
		}

		data, err := json.Marshal(req)
		if err != nil {
			return nil, err
		}

		resCh := make(chan []byte, 1)
		c.pendingMu.Lock()
		c.pending[reqID] = resCh
		c.pendingMu.Unlock()

		if _, err := c.stdin.Write(append(data, '\n')); err != nil {
			c.pendingMu.Lock()
			delete(c.pending, reqID)
			c.pendingMu.Unlock()
			return nil, err
		}

		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(10 * time.Second):
			return nil, fmt.Errorf("timeout waiting for tool %s response", toolName)
		case res := <-resCh:
			return res, nil
		}
	}

	// Direct HTTP Fallback for known tools if stdio is not attached
	return c.httpFallback(ctx, toolName, arguments)
}

func (c *MCPClient) httpFallback(ctx context.Context, toolName string, args map[string]any) (json.RawMessage, error) {
	var url string
	switch toolName {
	case "espn_scores", "espn_football_scoreboard":
		sport := "soccer"
		league := "eng.1"
		if s, ok := args["sport"].(string); ok && s != "" {
			sport = s
		}
		if l, ok := args["league"].(string); ok && l != "" {
			league = l
		}
		url = fmt.Sprintf("https://site.api.espn.com/apis/site/v2/sports/%s/%s/scoreboard", sport, league)
	case "nba_scoreboard":
		url = "https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json"
	case "openligadb_matches":
		url = "https://api.openligadb.de/getmatchdata/bl1"
	default:
		return nil, fmt.Errorf("unsupported fallback tool: %s", toolName)
	}

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "not365-client/1.0")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("upstream returned status %d for %s", resp.StatusCode, url)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	return body, nil
}
