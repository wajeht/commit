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
