package main

import (
	"net/http"

	"github.com/wajeth/commit/assets"
)

func routes(app *application) http.Handler {
	mux := http.NewServeMux()

	fileServer := http.FileServer(http.FS(assets.EmbddedFiles))

	mux.Handle("GET /static/", fileServer)
	mux.HandleFunc("GET /{$}", app.homeHandler)

}
