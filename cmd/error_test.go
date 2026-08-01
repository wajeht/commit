package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestErrorPages(t *testing.T) {
	tests := []struct {
		name       string
		statusCode int
		statusText string
		message    string
	}{
		{"bad request", http.StatusBadRequest, "Bad Request", "The request was invalid"},
		{"forbidden", http.StatusForbidden, "Forbidden", "Access is not allowed"},
		{"not found", http.StatusNotFound, "Not Found", "The page could not be found"},
		{"server error", http.StatusInternalServerError, "Internal Server Error", "Something went wrong"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "http://commit.jaw.dev/missing", nil)
			req.Header.Set("User-Agent", "Mozilla/5.0")
			rr := httptest.NewRecorder()

			respond(rr, req, tt.statusCode, tt.message)

			if rr.Code != tt.statusCode {
				t.Fatalf("status = %d, want %d", rr.Code, tt.statusCode)
			}
			if got := rr.Header().Get("Content-Type"); got != "text/html; charset=utf-8" {
				t.Errorf("Content-Type = %q, want text/html; charset=utf-8", got)
			}

			body := rr.Body.String()
			for _, want := range []string{
				"<!DOCTYPE html>",
				tt.statusText,
				tt.message,
				"Back home",
				"Report an issue",
			} {
				if !strings.Contains(body, want) {
					t.Errorf("response does not contain %q", want)
				}
			}
		})
	}
}

func TestNotFoundRouteUsesErrorPage(t *testing.T) {
	app := newTestApp(&mockGenerator{})
	req := httptest.NewRequest(http.MethodGet, "http://commit.jaw.dev/missing", nil)
	req.Header.Set("User-Agent", "Mozilla/5.0")
	rr := httptest.NewRecorder()

	app.routes().ServeHTTP(rr, req)

	if rr.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want %d", rr.Code, http.StatusNotFound)
	}
	if !strings.Contains(rr.Body.String(), "<h1>Not Found</h1>") {
		t.Error("response does not contain the styled not-found page")
	}
}

func TestErrorResponseJSON(t *testing.T) {
	tests := []struct {
		name      string
		setHeader func(*http.Request)
	}{
		{
			name: "accept header",
			setHeader: func(r *http.Request) {
				r.Header.Set("Accept", "application/json")
			},
		},
		{
			name: "curl user agent",
			setHeader: func(r *http.Request) {
				r.Header.Set("User-Agent", "curl/8.0.0")
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "http://commit.jaw.dev/missing", nil)
			tt.setHeader(req)
			rr := httptest.NewRecorder()

			respond(rr, req, http.StatusNotFound, "The page could not be found")

			if rr.Code != http.StatusNotFound {
				t.Fatalf("status = %d, want %d", rr.Code, http.StatusNotFound)
			}
			if got := rr.Header().Get("Content-Type"); got != "application/json" {
				t.Errorf("Content-Type = %q, want application/json", got)
			}

			var body map[string]string
			if err := json.NewDecoder(rr.Body).Decode(&body); err != nil {
				t.Fatal(err)
			}
			if body["message"] != "The page could not be found" {
				t.Errorf("message = %q, want %q", body["message"], "The page could not be found")
			}
		})
	}
}

func TestErrorPageEscapesMessage(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "http://commit.jaw.dev/missing", nil)
	rr := httptest.NewRecorder()

	respond(rr, req, http.StatusBadRequest, `<script>alert("no")</script>`)

	if strings.Contains(rr.Body.String(), `<script>alert("no")</script>`) {
		t.Error("response contains an unescaped error message")
	}
	if !strings.Contains(rr.Body.String(), "&lt;script&gt;") {
		t.Error("response does not contain the escaped error message")
	}
}
