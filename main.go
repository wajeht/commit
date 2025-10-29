package main

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
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
			http.Error(w, "The requested resource could not be found", http.StatusNotFound)
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

func (app *application) handleHealthz(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/plain")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("ok"))
}

func (app *application) handleFavicon(w http.ResponseWriter, r *http.Request) {
	file, err := assets.Embeddedfiles.Open("static/favicon.ico")
	if err != nil {
		log.Printf("Error opening favicon: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	defer file.Close()

	w.Header().Set("Content-Type", "image/x-icon")
	if _, err := io.Copy(w, file); err != nil {
		log.Printf("Error serving favicon: %v", err)
	}
}

func (app *application) handleRobotsTxt(w http.ResponseWriter, r *http.Request) {
	file, err := assets.Embeddedfiles.Open("static/robots.txt")
	if err != nil {
		log.Printf("Error opening robots.txt: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	defer file.Close()

	w.Header().Set("Content-Type", "text/plain")
	if _, err := io.Copy(w, file); err != nil {
		log.Printf("Error serving robots.txt: %v", err)
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
		log.Printf("Error opening install.sh: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	defer file.Close()

	w.Header().Set("Content-Type", "text/plain")
	w.Header().Set("Content-Disposition", "attachment; filename=install.sh")
	w.Header().Set("Cache-Control", "public, max-age=2592000") // cache for 30 days
	w.WriteHeader(http.StatusOK)
	if _, err := io.Copy(w, file); err != nil {
		log.Printf("Error serving install.sh: %v", err)
	}
}

func (app *application) handleHome(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.Error(w, "The requested resource could not be found", http.StatusNotFound)
		return
	}

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
		log.Printf("Error opening commit.sh: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	defer file.Close()

	w.Header().Set("Content-Type", "text/plain")
	w.Header().Set("Content-Disposition", "attachment; filename=commit.sh")
	w.Header().Set("Cache-Control", "public, max-age=2592000") // cache for 30 days
	w.WriteHeader(http.StatusOK)
	if _, err := io.Copy(w, file); err != nil {
		log.Printf("Error serving commit.sh: %v", err)
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
	var cfg config

	cfg.appEnv = GetString("APP_ENV", "production")
	cfg.appPort = GetInt("APP_PORT", 80)
	cfg.appIPS = GetString("APP_IPS", "::1")

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
	mux.HandleFunc("GET /", app.handleHome)

	server := &http.Server{
		Addr:    fmt.Sprintf(":%d", cfg.appPort),
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

	log.Printf("Server starting on http://localhost:%d", cfg.appPort)

	err := server.ListenAndServe()
	if !errors.Is(err, http.ErrServerClosed) {
		log.Fatalf("Server failed: %v", err)
	}

	err = <-shutdownErrorChan
	if err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server stopped")
}
