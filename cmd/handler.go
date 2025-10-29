package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/wajeht/commit/assets"
)

func (app *application) handleHealthz(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/plain")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("ok"))
}

func (app *application) handleFavicon(w http.ResponseWriter, r *http.Request) {
	file, err := assets.Embeddedfiles.Open("static/favicon.ico")
	if err != nil {
		app.serverError(w, r, err)
		return
	}
	defer file.Close()

	w.Header().Set("Content-Type", "image/x-icon")
	if _, err := io.Copy(w, file); err != nil {
		app.reportServerError(r, err)
	}
}

func (app *application) handleRobotsTxt(w http.ResponseWriter, r *http.Request) {
	file, err := assets.Embeddedfiles.Open("static/robots.txt")
	if err != nil {
		app.serverError(w, r, err)
		return
	}
	defer file.Close()

	w.Header().Set("Content-Type", "text/plain")
	if _, err := io.Copy(w, file); err != nil {
		app.reportServerError(r, err)
	}
}

func (app *application) handleInstallSh(w http.ResponseWriter, r *http.Request) {
	domain := r.Host

	if r.TLS != nil {
		domain = "https://" + domain
	} else {
		domain = "http://" + domain
	}

	userAgent := r.Header.Get("User-Agent")
	isCurl := strings.Contains(userAgent, "curl")

	if !isCurl {
		command := fmt.Sprintf("curl -s %s/install.sh | sh", domain)
		message := "Run this command from your terminal:"

		contentType := r.Header.Get("Content-Type")
		if contentType == "application/json" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			fmt.Fprintf(w, `{"message":"%s %s"}`, message, command)
			return
		}

		w.Header().Set("Content-Type", "text/html")
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, `%s <mark>%s</mark>`, message, command)
		return
	}

	file, err := assets.Embeddedfiles.Open("sh/install.sh")
	if err != nil {
		app.serverError(w, r, err)
		return
	}
	defer file.Close()

	w.Header().Set("Content-Type", "text/plain")
	w.Header().Set("Content-Disposition", "attachment; filename=install.sh")
	w.Header().Set("Cache-Control", "public, max-age=2592000")
	w.WriteHeader(http.StatusOK)
	if _, err := io.Copy(w, file); err != nil {
		app.reportServerError(r, err)
	}
}

func (app *application) handleGenerateCommit(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Diff     string `json:"diff"`
		Provider string `json:"provider"`
		ApiKey   string `json:"apiKey"`
	}

	err := json.NewDecoder(r.Body).Decode(&input)
	if err != nil {
		app.badRequest(w, r, err)
		return
	}

	if strings.TrimSpace(input.Diff) == "" {
		app.badRequest(w, r, errors.New("diff must not be empty"))
		return
	}

	if input.Provider != "" {
		validProviders := map[string]bool{
			"openai": true,
			"gemini": true,
		}
		if !validProviders[input.Provider] {
			app.badRequest(w, r, errors.New("invalid provider specified"))
			return
		}
	}

	message, err := ai(input.Provider, app.config).generate(input.Diff, input.ApiKey)
	if err != nil {
		app.badRequest(w, r, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"message": message,
	})
}

func (app *application) handleHome(w http.ResponseWriter, r *http.Request) {
	domain := r.Host

	if r.TLS != nil {
		domain = "https://" + domain
	} else {
		domain = "http://" + domain
	}

	userAgent := r.Header.Get("User-Agent")
	isCurl := strings.Contains(userAgent, "curl")

	if !isCurl {
		command := fmt.Sprintf("curl -s %s | sh -- -k 'YOUR_GEMINI_API_KEY'", domain)
		message := "Run this command from your terminal:"

		contentType := r.Header.Get("Content-Type")
		if contentType == "application/json" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			fmt.Fprintf(w, `{"message":"%s %s"}`, message, command)
			return
		}

		w.Header().Set("Content-Type", "text/html")
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, `%s <mark>%s</mark>`, message, command)
		return
	}

	file, err := assets.Embeddedfiles.Open("sh/commit.sh")
	if err != nil {
		app.serverError(w, r, err)
		return
	}
	defer file.Close()

	w.Header().Set("Content-Type", "text/plain")
	w.Header().Set("Content-Disposition", "attachment; filename=commit.sh")
	w.Header().Set("Cache-Control", "public, max-age=2592000")
	w.WriteHeader(http.StatusOK)
	if _, err := io.Copy(w, file); err != nil {
		app.reportServerError(r, err)
	}
}
