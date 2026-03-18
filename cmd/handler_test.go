package main

import (
	"bytes"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
)

type mockGenerator struct {
	lastReq  generateRequest
	response string
	err      error
}

func (m *mockGenerator) generate(req generateRequest) (string, error) {
	m.lastReq = req
	return m.response, m.err
}

func newTestApp(mock *mockGenerator) *application {
	return &application{
		config: config{},
		logger: slog.New(slog.NewJSONHandler(os.Stdout, nil)),
		ai: func(provider string, cfg config) generator {
			return mock
		},
	}
}

func TestHandleGenerateCommit(t *testing.T) {
	tests := []struct {
		name                string
		body                map[string]string
		mockResponse        string
		mockErr             error
		wantStatus          int
		wantSuggestion      string
		wantPreviousMessage string
	}{
		{
			name:           "basic diff without suggestion",
			body:           map[string]string{"diff": "some diff"},
			mockResponse:   "feat: add new feature",
			wantStatus:     http.StatusOK,
			wantSuggestion: "",
		},
		{
			name:                "diff with suggestion and previous message",
			body:                map[string]string{"diff": "some diff", "suggestion": "focus on the bug fix", "previousMessage": "feat: old message"},
			mockResponse:        "fix: resolve null pointer in auth",
			wantStatus:          http.StatusOK,
			wantSuggestion:      "focus on the bug fix",
			wantPreviousMessage: "feat: old message",
		},
		{
			name:           "empty suggestion treated as no suggestion",
			body:           map[string]string{"diff": "some diff", "suggestion": ""},
			mockResponse:   "feat: add new feature",
			wantStatus:     http.StatusOK,
			wantSuggestion: "",
		},
		{
			name:       "empty diff returns bad request",
			body:       map[string]string{"diff": ""},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "invalid provider returns bad request",
			body:       map[string]string{"diff": "some diff", "provider": "invalid"},
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mock := &mockGenerator{response: tt.mockResponse, err: tt.mockErr}
			app := newTestApp(mock)

			jsonBody, _ := json.Marshal(tt.body)
			req := httptest.NewRequest(http.MethodPost, "/", bytes.NewReader(jsonBody))
			req.Header.Set("Content-Type", "application/json")
			rr := httptest.NewRecorder()

			app.handleGenerateCommit(rr, req)

			if rr.Code != tt.wantStatus {
				t.Errorf("status = %d, want %d", rr.Code, tt.wantStatus)
			}

			if tt.wantStatus == http.StatusOK {
				if mock.lastReq.Suggestion != tt.wantSuggestion {
					t.Errorf("suggestion = %q, want %q", mock.lastReq.Suggestion, tt.wantSuggestion)
				}
				if mock.lastReq.PreviousMessage != tt.wantPreviousMessage {
					t.Errorf("previousMessage = %q, want %q", mock.lastReq.PreviousMessage, tt.wantPreviousMessage)
				}

				var resp map[string]string
				json.NewDecoder(rr.Body).Decode(&resp)
				if resp["message"] != tt.mockResponse {
					t.Errorf("message = %q, want %q", resp["message"], tt.mockResponse)
				}
			}
		})
	}
}

func TestHandleGenerateCommitBackwardCompatibility(t *testing.T) {
	mock := &mockGenerator{response: "feat: add feature"}
	app := newTestApp(mock)

	body := []byte(`{"diff": "some diff", "provider": "gemini"}`)
	req := httptest.NewRequest(http.MethodPost, "/", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	app.handleGenerateCommit(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("status = %d, want %d", rr.Code, http.StatusOK)
	}
	if mock.lastReq.Suggestion != "" {
		t.Errorf("suggestion = %q, want empty", mock.lastReq.Suggestion)
	}
	if mock.lastReq.PreviousMessage != "" {
		t.Errorf("previousMessage = %q, want empty", mock.lastReq.PreviousMessage)
	}
}
