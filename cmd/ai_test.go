package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
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
		wantMsgCount    int
	}{
		{
			name:         "without suggestion sends 2 messages",
			wantMsgCount: 2,
		},
		{
			name:            "with suggestion and previous message sends 4 messages",
			suggestion:      "focus on the refactor",
			previousMessage: "feat: old message",
			wantMsgCount:    4,
		},
		{
			name:         "suggestion without previous message sends 2 messages",
			suggestion:   "focus on the refactor",
			wantMsgCount: 2,
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

			if len(captured.Messages) != tt.wantMsgCount {
				t.Errorf("message count = %d, want %d", len(captured.Messages), tt.wantMsgCount)
			}

			if tt.wantMsgCount == 4 {
				if captured.Messages[2].Role != "assistant" {
					t.Errorf("messages[2].role = %q, want assistant", captured.Messages[2].Role)
				}
				if captured.Messages[2].Content != tt.previousMessage {
					t.Errorf("messages[2].content = %q, want %q", captured.Messages[2].Content, tt.previousMessage)
				}
				if captured.Messages[3].Role != "user" {
					t.Errorf("messages[3].role = %q, want user", captured.Messages[3].Role)
				}
			}
		})
	}
}

func TestGeminiGenerate(t *testing.T) {
	tests := []struct {
		name            string
		suggestion      string
		previousMessage string
		wantMsgCount    int
	}{
		{
			name:         "without suggestion sends 2 messages",
			wantMsgCount: 2,
		},
		{
			name:            "with suggestion and previous message sends 4 messages",
			suggestion:      "mention the auth module",
			previousMessage: "fix: old message",
			wantMsgCount:    4,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var captured chatRequest
			server := newMockAPIServer(t, &captured, "fix: test")
			defer server.Close()

			g := &gemini{config: config{geminiAPIKey: "test-key"}, url: server.URL}
			_, err := g.generate(generateRequest{
				Diff:            "diff content",
				Suggestion:      tt.suggestion,
				PreviousMessage: tt.previousMessage,
			})
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			if len(captured.Messages) != tt.wantMsgCount {
				t.Errorf("message count = %d, want %d", len(captured.Messages), tt.wantMsgCount)
			}
		})
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
	t.Run("base case", func(t *testing.T) {
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

	t.Run("with suggestion and previous message", func(t *testing.T) {
		msgs := buildMessages("my diff", "be concise", "feat: old")
		if len(msgs) != 4 {
			t.Fatalf("got %d messages, want 4", len(msgs))
		}
		if msgs[2].Role != "assistant" || msgs[2].Content != "feat: old" {
			t.Errorf("msgs[2] = %+v, want assistant/feat: old", msgs[2])
		}
		if msgs[3].Role != "user" {
			t.Errorf("msgs[3].role = %q, want user", msgs[3].Role)
		}
	})

	t.Run("suggestion without previous message is ignored", func(t *testing.T) {
		msgs := buildMessages("my diff", "be concise", "")
		if len(msgs) != 2 {
			t.Fatalf("got %d messages, want 2", len(msgs))
		}
	})
}
