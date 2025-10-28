package main

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/wajeht/commit/assets"
)

func stripTrailingSlashMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/") && r.URL.Path != "/static/" {
			http.Error(w, "The requested resource could not be found", http.StatusNotFound)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func corsMiddleware(next http.Handler) http.Handler {
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

func handleHealthz(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/plain")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("ok"))
}

func handleFavicon(w http.ResponseWriter, r *http.Request) {
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

func handleRobotsTxt(w http.ResponseWriter, r *http.Request) {
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

func handleInstallSh(w http.ResponseWriter, r *http.Request) {
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

func handleHome(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.Error(w, "The requested resource could not be found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "text/plain")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("home"))
}

func main() {
	serverAddr := GetInt("APP_PORT", 80)

	mux := http.NewServeMux()
	mux.Handle("GET /static/", stripTrailingSlashMiddleware(http.FileServer(http.FS(assets.Embeddedfiles))))
	mux.HandleFunc("GET /healthz", handleHealthz)
	mux.HandleFunc("GET /robots.txt", handleRobotsTxt)
	mux.HandleFunc("GET /favicon.ico", handleFavicon)
	mux.HandleFunc("GET /install.sh", handleInstallSh)
	mux.HandleFunc("GET /", handleHome)

	server := &http.Server{
		Addr: fmt.Sprintf(":%d", serverAddr),
		Handler: corsMiddleware(mux),
	}

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		log.Printf("Server starting on http://localhost:%d", serverAddr)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("Server failed: %v", err)
		}
	}()

	<-quit
	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Printf("Server forced to shutdown: %v", err)
	}

	log.Println("Server stopped")
}
