package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

type config struct {
	appPort      int
	appIPS       string
	appEnv       string
	openaiAPIKey string
	geminiAPIKey string
	notifyURL    string
	notifyAPIKey string
}

type application struct {
	config config
	logger *slog.Logger
}

func (app *application) serve() error {
	server := &http.Server{
		Addr:    fmt.Sprintf(":%d", app.config.appPort),
		Handler: app.routes(),
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

	app.logger.Info("server starting", "addr", server.Addr)

	err := server.ListenAndServe()
	if !errors.Is(err, http.ErrServerClosed) {
		return err
	}

	err = <-shutdownErrorChan
	if err != nil {
		return err
	}

	app.logger.Info("server stopped", "addr", server.Addr)

	return nil
}
