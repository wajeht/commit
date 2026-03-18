package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func newMockAPIServer(t *testing.T, captured *chatRequest, response string) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		if err := json.Unmarshal(body, captured); err != nil {
			t.Fatalf("failed to unmarshal request: %v", err)
		}

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(chatResponse{
			Choices: []chatChoice{
				{Message: struct {
					Content string `json:"content"`
				}{Content: response}},
			},
		})
	}))
}

func TestOpenAIGenerate(t *testing.T) {
	tests := []struct {
		name            string
		suggestion      string
		previousMessage string
	}{
		{
			name: "without suggestion",
		},
		{
			name:            "with suggestion and previous message",
			suggestion:      "focus on the refactor",
			previousMessage: "feat: old message",
		},
		{
			name:       "suggestion without previous message",
			suggestion: "focus on the refactor",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var captured chatRequest
			server := newMockAPIServer(t, &captured, "feat: test")
			defer server.Close()

			o := &openAI{config: config{openaiAPIKey: "test-key"}, url: server.URL}
			_, err := o.generate(generateRequest{
				Diff:            "diff content",
				Suggestion:      tt.suggestion,
				PreviousMessage: tt.previousMessage,
			})
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			if len(captured.Messages) != 2 {
				t.Errorf("message count = %d, want 2", len(captured.Messages))
			}
			if captured.Messages[0].Role != "system" {
				t.Errorf("messages[0].role = %q, want system", captured.Messages[0].Role)
			}
			if captured.Messages[1].Role != "user" {
				t.Errorf("messages[1].role = %q, want user", captured.Messages[1].Role)
			}
		})
	}
}

func TestGeminiGenerate(t *testing.T) {
	var captured chatRequest
	server := newMockAPIServer(t, &captured, "fix: test")
	defer server.Close()

	g := &gemini{config: config{geminiAPIKey: "test-key"}, url: server.URL}
	_, err := g.generate(generateRequest{
		Diff:            "diff content",
		Suggestion:      "mention auth",
		PreviousMessage: "fix: old message",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(captured.Messages) != 2 {
		t.Errorf("message count = %d, want 2", len(captured.Messages))
	}
}

func TestAIFactory(t *testing.T) {
	cfg := config{}

	tests := []struct {
		provider string
		wantType string
	}{
		{"openai", "*main.openAI"},
		{"gemini", "*main.gemini"},
		{"", "*main.gemini"},
		{"unknown", "*main.gemini"},
	}

	for _, tt := range tests {
		t.Run(tt.provider, func(t *testing.T) {
			gen := ai(tt.provider, cfg)
			if got := fmt.Sprintf("%T", gen); got != tt.wantType {
				t.Errorf("ai(%q) type = %s, want %s", tt.provider, got, tt.wantType)
			}
		})
	}
}

func TestBuildMessages(t *testing.T) {
	t.Run("base case returns 2 messages", func(t *testing.T) {
		msgs := buildMessages("my diff", "", "")
		if len(msgs) != 2 {
			t.Fatalf("got %d messages, want 2", len(msgs))
		}
		if msgs[0].Role != "system" {
			t.Errorf("msgs[0].role = %q, want system", msgs[0].Role)
		}
		if msgs[1].Content != "my diff" {
			t.Errorf("msgs[1].content = %q, want 'my diff'", msgs[1].Content)
		}
	})

	t.Run("with suggestion bakes into system prompt", func(t *testing.T) {
		msgs := buildMessages("my diff", "be concise", "feat: old")
		if len(msgs) != 2 {
			t.Fatalf("got %d messages, want 2", len(msgs))
		}
		sys := msgs[0].Content
		if !strings.Contains(sys, "be concise") {
			t.Error("system prompt should contain suggestion")
		}
		if !strings.Contains(sys, "feat: old") {
			t.Error("system prompt should contain previous message")
		}
	})

	t.Run("suggestion without previous message is ignored", func(t *testing.T) {
		msgs := buildMessages("my diff", "be concise", "")
		if strings.Contains(msgs[0].Content, "be concise") {
			t.Error("system prompt should not contain suggestion without previous message")
		}
	})

	t.Run("always returns exactly 2 messages", func(t *testing.T) {
		for _, tc := range []struct{ sug, prev string }{
			{"", ""},
			{"hint", ""},
			{"hint", "prev"},
		} {
			msgs := buildMessages("diff", tc.sug, tc.prev)
			if len(msgs) != 2 {
				t.Errorf("suggestion=%q previous=%q: got %d messages, want 2", tc.sug, tc.prev, len(msgs))
			}
		}
	})
}
