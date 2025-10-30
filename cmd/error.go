package main

import (
	"fmt"
	"log/slog"
	"net/http"
	"runtime/debug"
)

func (app *application) reportServerError(r *http.Request, err error) {
	var (
		message = err.Error()
		method  = r.Method
		url     = r.URL.String()
		trace   = string(debug.Stack())
	)

	requestAttrs := slog.Group("request", "method", method, "url", url)
	app.logger.Error(message, requestAttrs, "trace", trace)

	// TODO: use notify to send
}

func (app *application) serverError(w http.ResponseWriter, r *http.Request, err error) {
	app.reportServerError(r, err)

	message := "The server encountered a problem and could not process your request"
	w.Header().Set("Content-Type", "text/html")
	w.WriteHeader(http.StatusInternalServerError)
	fmt.Fprint(w, html(message))
}

func (app *application) notFound(w http.ResponseWriter, _ *http.Request) {
	message := "The requested resource could not be found"
	w.Header().Set("Content-Type", "text/html")
	w.WriteHeader(http.StatusNotFound)
	fmt.Fprint(w, html(message))
}

func (app *application) badRequest(w http.ResponseWriter, _ *http.Request, err error) {
	w.Header().Set("Content-Type", "text/html")
	w.WriteHeader(http.StatusBadRequest)
	fmt.Fprint(w, html(err.Error()))
}

func (app *application) forbidden(w http.ResponseWriter, _ *http.Request) {
	message := "Forbidden"
	w.Header().Set("Content-Type", "text/html")
	w.WriteHeader(http.StatusForbidden)
	fmt.Fprint(w, html(message))
}
