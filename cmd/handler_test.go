package main

import (
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
)

func newTestApp() *application {
	return &application{
		config: config{},
		logger: slog.New(slog.NewJSONHandler(os.Stdout, nil)),
	}
}

func TestHandleHomeHTML(t *testing.T) {
	app := newTestApp()
	req := httptest.NewRequest(http.MethodGet, "http://commit.jaw.dev/", nil)
	req.Header.Set("User-Agent", "Mozilla/5.0")
	rr := httptest.NewRecorder()

	app.handleHome(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rr.Code, http.StatusOK)
	}
	if got := rr.Header().Get("Content-Type"); got != "text/html; charset=utf-8" {
		t.Errorf("Content-Type = %q, want text/html; charset=utf-8", got)
	}

	body := rr.Body.String()
	for _, want := range []string{
		"<!DOCTYPE html>",
		"<title>Commit</title>",
		"<h1>🤖 Commit</h1>",
		"<h2>Basic Usage</h2>",
		"<h2>Options</h2>",
		"curl -fsSL http://commit.jaw.dev | bash",
		"curl -fsSL http://commit.jaw.dev | bash -s -- --dry-run",
		"curl -fsSL http://commit.jaw.dev/install.sh | bash",
		"<footer>",
	} {
		if !strings.Contains(body, want) {
			t.Errorf("response does not contain %q", want)
		}
	}
	if strings.Contains(body, "<style") || strings.Contains(body, "prefers-color-scheme") {
		t.Error("response should use browser-default styles without a dark theme")
	}
}

func TestHandleInstallHTML(t *testing.T) {
	app := newTestApp()
	req := httptest.NewRequest(http.MethodGet, "http://commit.jaw.dev/install.sh", nil)
	req.Header.Set("User-Agent", "Mozilla/5.0")
	rr := httptest.NewRecorder()

	app.handleInstallSh(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rr.Code, http.StatusOK)
	}
	body := rr.Body.String()
	for _, want := range []string{
		"<title>Install Commit</title>",
		"<h1>Install Commit</h1>",
		"curl -fsSL http://commit.jaw.dev/install.sh | bash",
		"← Back to home",
		"<footer>",
	} {
		if !strings.Contains(body, want) {
			t.Errorf("response does not contain %q", want)
		}
	}
}

func TestHandleHomeJSON(t *testing.T) {
	app := newTestApp()
	req := httptest.NewRequest(http.MethodGet, "http://commit.jaw.dev/", nil)
	req.Header.Set("Accept", "application/json")
	rr := httptest.NewRecorder()

	app.handleHome(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rr.Code, http.StatusOK)
	}
	if got := rr.Header().Get("Content-Type"); got != "application/json" {
		t.Errorf("Content-Type = %q, want application/json", got)
	}
	if !strings.Contains(rr.Body.String(), "curl -fsSL http://commit.jaw.dev | bash") {
		t.Error("response does not contain the argument-safe commit command")
	}
}

func TestHandleHomeCurl(t *testing.T) {
	app := newTestApp()
	req := httptest.NewRequest(http.MethodGet, "http://commit.jaw.dev/", nil)
	req.Header.Set("User-Agent", "curl/8.0.0")
	rr := httptest.NewRecorder()

	app.handleHome(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rr.Code, http.StatusOK)
	}
	if got := rr.Header().Get("Content-Type"); got != "text/plain" {
		t.Errorf("Content-Type = %q, want text/plain", got)
	}

	body, err := io.ReadAll(rr.Body)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(body), "http://commit.jaw.dev") {
		t.Error("script does not contain the request domain")
	}
	if strings.Contains(string(body), "<!DOCTYPE html>") {
		t.Error("curl response should remain a shell script")
	}
}
