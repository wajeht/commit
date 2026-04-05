package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestMaxBodySizeLimit(t *testing.T) {
	mock := &mockGenerator{response: "feat: test", err: nil}
	app := newTestApp(mock)

	largeBody := make([]byte, maxBodySize+1)
	for i := range largeBody {
		largeBody[i] = 'a'
	}

	jsonBody, _ := json.Marshal(map[string]string{"diff": string(largeBody)})
	req := httptest.NewRequest(http.MethodPost, "/", bytes.NewReader(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	app.handleGenerateCommit(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want %d (large body should be rejected)", rr.Code, http.StatusBadRequest)
	}
}
