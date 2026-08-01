package main

import (
	"bytes"
	"fmt"
	"html/template"
	"io"
	"net/http"
	"strings"

	"github.com/wajeht/commit/assets"
)

var (
	homeTemplate    = pageTemplate("templates/index.html")
	installTemplate = pageTemplate("templates/install.html")
)

type pageData struct {
	Title   string
	Domain  string
	Command string
}

func pageTemplate(page string) *template.Template {
	return template.Must(template.ParseFS(assets.Embeddedfiles, "templates/base.html", page))
}

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
	domain := app.domain(r)

	userAgent := r.Header.Get("User-Agent")
	isCurl := strings.Contains(userAgent, "curl")

	if !isCurl {
		command := fmt.Sprintf("curl -s %s/install.sh | bash", domain)
		message := "Run this command from your terminal:"
		accept := r.Header.Get("Accept")

		if strings.Contains(accept, "application/json") {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			fmt.Fprintf(w, `{"message":"%s %s"}`, message, command)
			return
		}

		var page bytes.Buffer
		if err := installTemplate.ExecuteTemplate(&page, "base.html", pageData{
			Title:   "Install Commit",
			Domain:  domain,
			Command: command,
		}); err != nil {
			app.serverError(w, r, err)
			return
		}

		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.WriteHeader(http.StatusOK)
		if _, err := page.WriteTo(w); err != nil {
			app.reportServerError(r, err)
		}
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

func (app *application) handleHome(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		app.notFound(w, r)
		return
	}

	domain := app.domain(r)

	userAgent := r.Header.Get("User-Agent")
	isCurl := strings.Contains(userAgent, "curl")

	if !isCurl {
		command := fmt.Sprintf("curl -s %s | bash", domain)
		message := "Run this command from your terminal:"
		accept := r.Header.Get("Accept")

		if strings.Contains(accept, "application/json") {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			fmt.Fprintf(w, `{"message":"%s %s"}`, message, command)
			return
		}

		var page bytes.Buffer
		if err := homeTemplate.ExecuteTemplate(&page, "base.html", pageData{
			Title:  "Commit",
			Domain: domain,
		}); err != nil {
			app.serverError(w, r, err)
			return
		}

		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.WriteHeader(http.StatusOK)
		if _, err := page.WriteTo(w); err != nil {
			app.reportServerError(r, err)
		}
		return
	}

	file, err := assets.Embeddedfiles.Open("sh/commit.sh")
	if err != nil {
		app.serverError(w, r, err)
		return
	}
	defer file.Close()

	content, err := io.ReadAll(file)
	if err != nil {
		app.serverError(w, r, err)
		return
	}

	modifiedContent := strings.ReplaceAll(string(content), "http://localhost", domain)

	w.Header().Set("Content-Type", "text/plain")
	w.Header().Set("Content-Disposition", "attachment; filename=commit.sh")
	w.Header().Set("Cache-Control", "public, max-age=2592000")
	w.WriteHeader(http.StatusOK)
	if _, err := w.Write([]byte(modifiedContent)); err != nil {
		app.reportServerError(r, err)
	}
}
