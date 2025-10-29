package main

import (
	"bytes"
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

const prompt = `Generate a single-line git commit message based on the provided information about staged and committed files, and the full diff. Adhere strictly to these specifications:
1. Format: <type>: <subject> OR <type>(<scope>): <subject>
   - <scope> is optional and should only be used when it adds significant clarity
2. Maximum length: 72 characters (including type and scope)
3. Use present tense and imperative mood
4. Capitalize the first letter of the subject
5. No period at the end
6. Message in only English language

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation changes
- style: Code style changes (formatting, missing semi colons, etc)
- refactor: Code refactoring
- perf: Performance improvements
- test: Adding or updating tests
- build: Build system or external dependency changes
- ci: CI configuration changes
- chore: Other changes that don't modify src or test files
- revert: Revert a previous commit

Guidelines:
- Be specific, concise, clear, and descriptive
- Focus on why the change was made, not how
- Use consistent terminology
- Avoid redundant information
- Analyze the file extensions to determine the appropriate type:
  - .ts, .tsx: TypeScript code (possibly React for .tsx)
  - .js, .jsx: JavaScript code (possibly React for .jsx)
  - .py: Python code
  - .go: Go code
  - .rb: Ruby code
  - .java: Java code
  - .cs: C# code
  - .cpp, .hpp, .h: C++ code
  - .md, .txt: Documentation
  - .yml, .yaml: Configuration files
  - .json: JSON data or configuration
  - .css, .scss, .less: Styling
  - .html: HTML markup
  - test.*, spec.*: Test files
- Consider both staged and committed files in determining the scope and nature of the change
- Analyze the full diff to understand the context and extent of the changes
- Only include scope when it significantly clarifies the change and fits within the character limit

Examples:
- feat(auth): Add user authentication feature
- fix(api): Resolve null pointer exception in login process
- docs: Update API endpoints documentation
- refactor(data): Simplify data processing algorithm
- test(utils): Add unit tests for string manipulation functions
- style: Format code according to style guide
- perf: Optimize database query for faster results

IMPORTANT: Respond ONLY with the commit message. Do not include any other text, explanations, or metadata. The entire response should be a single line containing only the commit message.`

type aiService interface {
	generate(diff string, apiKey string) (string, error)
}

type openAI struct {
	config config
}

func (s *openAI) generate(diff string, apiKey string) (string, error) {
	if strings.TrimSpace(apiKey) == "" {
		apiKey = s.config.openaiAPIKey
	}

	reqBody := map[string]any{
		"model": "gpt-3.5-turbo",
		"messages": []map[string]string{
			{"role": "system", "content": prompt},
			{"role": "user", "content": diff},
		},
		"temperature": 0.7,
		"max_tokens":  200,
	}

	jsonData, _ := json.Marshal(reqBody)
	req, _ := http.NewRequest("POST", "https://api.openai.com/v1/chat/completions", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	var result map[string]any
	json.Unmarshal(body, &result)

	if resp.StatusCode != http.StatusOK {
		if errObj, ok := result["error"].(map[string]any); ok {
			return "", errors.New(errObj["message"].(string))
		}
		return "", fmt.Errorf("api error: status code %d", resp.StatusCode)
	}

	choices := result["choices"].([]any)
	if len(choices) == 0 {
		return "", errors.New("no response from openai api")
	}

	message := choices[0].(map[string]any)["message"].(map[string]any)["content"].(string)
	return strings.ToLower(strings.TrimSpace(message)), nil
}

type gemini struct {
	config config
}

func (s *gemini) generate(diff string, apiKey string) (string, error) {
	if strings.TrimSpace(apiKey) == "" {
		apiKey = s.config.geminiAPIKey
	}

	reqBody := map[string]any{
		"model": "gemini-2.0-flash",
		"messages": []map[string]string{
			{"role": "system", "content": prompt},
			{"role": "user", "content": diff},
		},
		"temperature": 0.7,
		"max_tokens":  200,
	}

	jsonData, _ := json.Marshal(reqBody)
	req, _ := http.NewRequest("POST", "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	var result map[string]any
	json.Unmarshal(body, &result)

	if resp.StatusCode != http.StatusOK {
		if errObj, ok := result["error"].(map[string]any); ok {
			return "", errors.New(errObj["message"].(string))
		}
		return "", fmt.Errorf("api error: status code %d", resp.StatusCode)
	}

	choices := result["choices"].([]any)
	if len(choices) == 0 {
		return "", errors.New("no response from gemini api")
	}

	message := choices[0].(map[string]any)["message"].(map[string]any)["content"].(string)
	return strings.ToLower(strings.TrimSpace(message)), nil
}

func ai(provider string, cfg config) aiService {
	switch provider {
	case "openai":
		return &openAI{config: cfg}
	case "gemini":
		return &gemini{config: cfg}
	default:
		return &gemini{config: cfg}
	}
}

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
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-API-Key")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func (app *application) limitIPsMiddleware(next http.Handler) http.Handler {
	allowedIPs := make(map[string]bool)
	for ip := range strings.SplitSeq(app.config.appIPS, ",") {
		allowedIPs[strings.TrimSpace(ip)] = true
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		apiKey := r.Header.Get("X-API-Key")
		if apiKey == "" {
			apiKey = r.URL.Query().Get("apiKey")
		}

		if apiKey != "" {
			next.ServeHTTP(w, r)
			return
		}

		clientIP := r.RemoteAddr
		if colonIndex := strings.LastIndex(clientIP, ":"); colonIndex != -1 {
			clientIP = clientIP[:colonIndex]
		}
		clientIP = strings.Trim(clientIP, "[]")

		if !allowedIPs[clientIP] {
			app.logger.Info("Unauthorized access attempt", "ip", clientIP)
			app.forbidden(w, r)
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

func (app *application) forbidden(w http.ResponseWriter, _ *http.Request) {
	message := "Forbidden"
	http.Error(w, message, http.StatusForbidden)
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
		app.badRequest(w, r, errors.New("diff must not be empty"))
		return
	}

	if input.Provider != "" {
		validProviders := map[string]bool{
			"openai": true,
			"gemini": true,
		}
		if !validProviders[input.Provider] {
			app.badRequest(w, r, errors.New("invalid provider specified"))
			return
		}
	}

	message, err := ai(input.Provider, app.config).generate(input.Diff, input.ApiKey)
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
	appPort      int
	appIPS       string
	appEnv       string
	openaiAPIKey string
	geminiAPIKey string
}

type application struct {
	config config
	logger *slog.Logger
}

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

	mux := http.NewServeMux()
	mux.Handle("GET /static/", app.stripTrailingSlashMiddleware(http.FileServer(http.FS(assets.Embeddedfiles))))
	mux.HandleFunc("GET /healthz", app.handleHealthz)
	mux.HandleFunc("GET /robots.txt", app.handleRobotsTxt)
	mux.HandleFunc("GET /favicon.ico", app.handleFavicon)
	mux.HandleFunc("GET /install.sh", app.handleInstallSh)
	mux.HandleFunc("GET /commit.sh", app.handleHome)
	mux.HandleFunc("GET /", app.handleHome)
	mux.Handle("POST /", app.limitIPsMiddleware(http.HandlerFunc(app.handleGenerateCommit)))

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

	app.logger.Info("server starting", "addr", server.Addr)

	err := server.ListenAndServe()
	if !errors.Is(err, http.ErrServerClosed) {
		app.logger.Error("server failed", "error", err)
		os.Exit(1)
	}

	err = <-shutdownErrorChan
	if err != nil {
		app.logger.Error("server forced to shutdown", "error", err)
		os.Exit(1)
	}

	app.logger.Info("server stopped", "addr", server.Addr)
}
