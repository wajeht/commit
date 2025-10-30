package main

import (
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

	app.notify(message, trace)
}

func (app *application) serverError(w http.ResponseWriter, r *http.Request, err error) {
	app.reportServerError(r, err)

	message := "The server encountered a problem and could not process your request"
	respond(w, r, http.StatusInternalServerError, message)
}

func (app *application) notFound(w http.ResponseWriter, r *http.Request) {
	message := "The requested resource could not be found"
	respond(w, r, http.StatusNotFound, message)
}

func (app *application) badRequest(w http.ResponseWriter, r *http.Request, err error) {
	respond(w, r, http.StatusBadRequest, err.Error())
}

func (app *application) forbidden(w http.ResponseWriter, r *http.Request) {
	respond(w, r, http.StatusForbidden, "Forbidden")
}
