package main

import (
	"log/slog"
	"os"
	"runtime/debug"
	"sync"

	"github.com/wajeth/commit/internal/env"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))

	err := run(logger)

	if err != nil {
		trace := string(debug.Stack())
		logger.Error(err.Error(), "trace", trace)
		os.Exit(1)
	}
}

type config struct {
	baseUrl  string
	httpPort int
}

type application struct {
	config config
	logger *slog.Logger
	wg     sync.WaitGroup
}

func run(logger *slog.Logger) error {
	var cfg config

	cfg.baseUrl = env.GetString("BASE_URL", "http://localhost:80")
	cfg.httpPort = env.GetInt("HTTP_PORT", 3536)

	app := &application{
		config: cfg,
		logger: logger,
	}

	return app.serveHTTP()
}
