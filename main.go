package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"runtime/debug"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/wajeht/commit/assets"
)

func GetString(key string, defaultValue string) string {
	value, exists := os.LookupEnv(key)
	if !exists {
		return defaultValue
	}

	return value
}

func GetInt(key string, defaultValue int) int {
	value, exists := os.LookupEnv(key)
	if !exists {
		return defaultValue
	}

	intValue, err := strconv.Atoi(value)
	if err != nil {
		panic(err)
	}

	return intValue
}

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
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

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
	http.Error(w, message, http.StatusInternalServerError)
}

func (app *application) notFound(w http.ResponseWriter, _ *http.Request) {
	message := "The requested resource could not be found"
	http.Error(w, message, http.StatusNotFound)
}

func (app *application) badRequest(w http.ResponseWriter, _ *http.Request, err error) {
	http.Error(w, err.Error(), http.StatusBadRequest)
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
	w.Header().Set("Cache-Control", "public, max-age=2592000") // cache for 30 days
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
		app.badRequest(w, r, errors.New("Diff must not be empty!"))
		return
	}

	if input.Provider != "" {
		validProviders := map[string]bool{
			"openai": true,
			"gemini": true,
		}
		if !validProviders[input.Provider] {
			app.badRequest(w, r, errors.New("Invalid provider specified!"))
			return
		}
	}

	provider := input.Provider
	if provider == "" {
		provider = "gemini"
	}

	message, err := ai(provider).generate(input.Diff, input.ApiKey)
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
		command := fmt.Sprintf("curl -s %s | sh -- -k 'YOUR_OPEN_API_KEY'", domain)
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
	w.Header().Set("Cache-Control", "public, max-age=2592000") // cache for 30 days
	w.WriteHeader(http.StatusOK)
	if _, err := io.Copy(w, file); err != nil {
		app.reportServerError(r, err)
	}
}

type config struct {
	appPort int
	appIPS  string
	appEnv  string
}

type application struct {
	config config
	logger *slog.Logger
}

func main() {
	cfg := config{
		appEnv:  GetString("APP_ENV", "production"),
		appPort: GetInt("APP_PORT", 80),
		appIPS:  GetString("APP_IPS", "::1"),
	}

	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	app := &application{
		config: cfg,
		logger: logger,
	}

	mux := http.NewServeMux()
	mux.Handle("GET /static/", app.stripTrailingSlashMiddleware(http.FileServer(http.FS(assets.Embeddedfiles))))
	mux.HandleFunc("GET /healthz", app.handleHealthz)
	mux.HandleFunc("GET /robots.txt", app.handleRobotsTxt)
	mux.HandleFunc("GET /favicon.ico", app.handleFavicon)
	mux.HandleFunc("GET /install.sh", app.handleInstallSh)
	mux.HandleFunc("GET /commit.sh", app.handleHome)
	mux.HandleFunc("GET /", app.handleHome)
	mux.HandleFunc("POST /", app.handleGenerateCommit)

	server := &http.Server{
		Addr:    fmt.Sprintf(":%d", app.config.appPort),
		Handler: app.corsMiddleware(mux),
	}

	shutdownErrorChan := make(chan error)

	go func() {
		quitChan := make(chan os.Signal, 1)
		signal.Notify(quitChan, syscall.SIGINT, syscall.SIGTERM)
		<-quitChan

		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		shutdownErrorChan <- server.Shutdown(ctx)
	}()

	app.logger.Info("Server starting", "addr", server.Addr)

	err := server.ListenAndServe()
	if !errors.Is(err, http.ErrServerClosed) {
		app.logger.Error("Server failed", "error", err)
		os.Exit(1)
	}

	err = <-shutdownErrorChan
	if err != nil {
		app.logger.Error("Server forced to shutdown", "error", err)
		os.Exit(1)
	}

	app.logger.Info("Server stopped", "addr", server.Addr)
}
