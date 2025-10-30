package main

import (
	"net/http"

	"github.com/wajeht/commit/assets"
)

func (app *application) routes() http.Handler {
	mux := http.NewServeMux()
	mux.Handle("GET /static/", app.stripTrailingSlashMiddleware(http.FileServer(http.FS(assets.Embeddedfiles))))
	mux.HandleFunc("GET /healthz", app.handleHealthz)
	mux.HandleFunc("GET /robots.txt", app.handleRobotsTxt)
	mux.HandleFunc("GET /favicon.ico", app.handleFavicon)
	mux.HandleFunc("GET /install.sh", app.handleInstallSh)
	mux.Handle("POST /", app.limitIPsMiddleware(http.HandlerFunc(app.handleGenerateCommit)))
	mux.HandleFunc("GET /", app.handleHome)

	return app.corsMiddleware(mux)
}
