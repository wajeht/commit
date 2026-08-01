package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"strings"
)

var errorTemplate = pageTemplate("templates/error.html")

type errorPageData struct {
	Title      string
	StatusCode int
	Message    string
}

func (app *application) domain(r *http.Request) string {
	host := r.Host
	var proto string

	if app.config.appEnv == "production" {
		proto = "https"
	} else {
		proto = r.Header.Get("X-Forwarded-Proto")
		if proto == "" {
			if r.TLS != nil {
				proto = "https"
			} else {
				proto = "http"
			}
		}
	}

	return proto + "://" + host
}

func respond(w http.ResponseWriter, r *http.Request, statusCode int, message string) {
	accept := r.Header.Get("Accept")
	userAgent := r.Header.Get("User-Agent")

	if strings.Contains(accept, "application/json") || strings.Contains(userAgent, "curl") {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(statusCode)
		if err := json.NewEncoder(w).Encode(map[string]string{"message": message}); err != nil {
			return
		}
		return
	}

	statusText := http.StatusText(statusCode)
	if statusText == "" {
		statusText = "Error"
	}

	var page bytes.Buffer
	if err := errorTemplate.ExecuteTemplate(&page, "base.html", errorPageData{
		Title:      statusText,
		StatusCode: statusCode,
		Message:    message,
	}); err != nil {
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(statusCode)
	if _, err := page.WriteTo(w); err != nil {
		return
	}
}
