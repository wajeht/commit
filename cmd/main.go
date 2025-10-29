package main

import (
	"log/slog"
	"os"
)

func main() {
	cfg := config{
		appEnv:       GetString("APP_ENV", "production"),
		appPort:      GetInt("APP_PORT", 80),
		appIPS:       GetString("APP_IPS", "::1"),
		openaiAPIKey: GetString("OPENAI_API_KEY", ""),
		geminiAPIKey: GetString("GEMINI_API_KEY", ""),
	}

	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	app := &application{
		config: cfg,
		logger: logger,
	}

	err := app.serve()
	if err != nil {
		app.logger.Error("server failed", "error", err)
		os.Exit(1)
	}
}
