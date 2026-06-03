package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const prompt = `Write commit messages as:
<type>(<scope>): <short imperative intent>

Types:
- feat: new feature
- fix: bug fix
- docs: documentation changes
- style: format-only changes
- refactor: code restructuring without behavior change
- perf: performance improvements
- test: adding or updating tests
- build: build system or dependency changes
- ci: ci configuration changes
- chore: maintenance/tooling changes
- revert: revert a previous commit

Scope:
- include when it clarifies ownership: daemon, http, config, docs
- omit when obvious or repo-wide

Summary:
- lowercase
- imperative-ish
- no period
- describe intent, not file mechanics
- keep it under ~72 chars

Examples:
fix(daemon): retry failed deploys once per cycle
refactor(daemon): keep sync worker wiring in sync
test(daemon): cover same-commit reconciliation
docs: align daemon wiring map
chore(ci): pin node setup version`

type generateRequest struct {
	Diff            string
	DiffStat        string
	APIKey          string
	Suggestion      string
	PreviousMessage string
}

type generator interface {
	generate(req generateRequest) (string, error)
}

type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatRequest struct {
	Model       string        `json:"model"`
	Messages    []chatMessage `json:"messages"`
	Temperature float64       `json:"temperature"`
	MaxTokens   int           `json:"max_tokens"`
}

type chatChoice struct {
	Message struct {
		Content string `json:"content"`
	} `json:"message"`
}

type chatResponse struct {
	Choices []chatChoice `json:"choices"`
}

type apiError struct {
	Error struct {
		Message string `json:"message"`
	} `json:"error"`
}

func buildMessages(diff, diffStat, suggestion, previousMessage string) []chatMessage {
	systemPrompt := prompt

	if strings.TrimSpace(suggestion) != "" && strings.TrimSpace(previousMessage) != "" {
		systemPrompt = fmt.Sprintf(`%s

The developer rejected this commit message: "%s"
The developer wants the commit message to: %s
Generate a completely new commit message that incorporates the developer's feedback. Still follow all formatting rules above.`, prompt, previousMessage, suggestion)
	}

	userContent := diff
	if strings.TrimSpace(diffStat) != "" {
		userContent = fmt.Sprintf("Summary of changed files (git diff --stat --summary):\n%s\n\nFull diff:\n%s", diffStat, diff)
	}

	return []chatMessage{
		{Role: "system", Content: systemPrompt},
		{Role: "user", Content: userContent},
	}
}

var httpClient = &http.Client{
	Timeout: 30 * time.Second,
}

func chatCompletion(apiURL, apiKey, model string, messages []chatMessage) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	reqBody := chatRequest{
		Model:       model,
		Messages:    messages,
		Temperature: 0.2,
		MaxTokens:   200,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("marshaling request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, apiURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("creating request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("sending request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("reading response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", parseAPIError(body, resp.StatusCode)
	}

	var result chatResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return "", fmt.Errorf("parsing response: %w", err)
	}

	if len(result.Choices) == 0 {
		return "", errors.New("no choices in api response")
	}

	return strings.TrimSpace(result.Choices[0].Message.Content), nil
}

func parseAPIError(body []byte, statusCode int) error {
	// try object format: {"error": {"message": "..."}}
	var objErr apiError
	if json.Unmarshal(body, &objErr) == nil && objErr.Error.Message != "" {
		return errors.New(objErr.Error.Message)
	}

	// try array format: [{"error": {"message": "..."}}]
	var arrErr []apiError
	if json.Unmarshal(body, &arrErr) == nil && len(arrErr) > 0 && arrErr[0].Error.Message != "" {
		return errors.New(arrErr[0].Error.Message)
	}

	return fmt.Errorf("api error: status %d", statusCode)
}

type openAI struct {
	config config
	url    string
}

func (s *openAI) generate(req generateRequest) (string, error) {
	apiKey := req.APIKey
	if strings.TrimSpace(apiKey) == "" {
		apiKey = s.config.openaiAPIKey
	}

	apiURL := s.url
	if apiURL == "" {
		apiURL = "https://api.openai.com/v1/chat/completions"
	}

	return chatCompletion(apiURL, apiKey, "gpt-3.5-turbo", buildMessages(req.Diff, req.DiffStat, req.Suggestion, req.PreviousMessage))
}

type gemini struct {
	config config
	url    string
}

func (s *gemini) generate(req generateRequest) (string, error) {
	apiKey := req.APIKey
	if strings.TrimSpace(apiKey) == "" {
		apiKey = s.config.geminiAPIKey
	}

	apiURL := s.url
	if apiURL == "" {
		apiURL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
	}

	return chatCompletion(apiURL, apiKey, "gemini-2.5-flash-lite", buildMessages(req.Diff, req.DiffStat, req.Suggestion, req.PreviousMessage))
}

func ai(provider string, cfg config) generator {
	switch provider {
	case "openai":
		return &openAI{config: cfg}
	case "gemini":
		return &gemini{config: cfg}
	default:
		return &gemini{config: cfg}
	}
}
