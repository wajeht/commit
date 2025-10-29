package main

import (
	"net/http"
	"strings"
)

func (app *application) stripTrailingSlashMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/") && r.URL.Path != "/static/" {
			app.notFound(w, r)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (app *application) corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-API-Key")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func (app *application) limitIPsMiddleware(next http.Handler) http.Handler {
	allowedIPs := make(map[string]bool)
	for ip := range strings.SplitSeq(app.config.appIPS, ",") {
		allowedIPs[strings.TrimSpace(ip)] = true
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		apiKey := r.Header.Get("X-API-Key")
		if apiKey == "" {
			apiKey = r.URL.Query().Get("apiKey")
		}

		if apiKey != "" {
			next.ServeHTTP(w, r)
			return
		}

		clientIP := getIpAddress(r)

		if !allowedIPs[clientIP] {
			app.logger.Info("Unauthorized access attempt", "ip", clientIP)
			app.forbidden(w, r)
			return
		}

		next.ServeHTTP(w, r)
	})
}
