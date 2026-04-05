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

const prompt = `Generate a single-line git commit message based on the provided information about staged and committed files, and the full diff. Adhere strictly to these specifications:
1. Format: <type>: <subject> OR <type>(<scope>): <subject>
   - <scope> is optional and should only be used when it adds significant clarity.
2. Never capitalize scope or type.
3. Maximum length: 72 characters (including type and scope)
4. Use present tense and imperative mood
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
- feat(auth): add user authentication feature
- fix(api): resolve null pointer exception in login process
- docs: update API endpoints documentation
- refactor(data): simplify data processing algorithm
- test(utils): add unit tests for string manipulation functions
- style: format code according to style guide
- perf: optimize database query for faster results

IMPORTANT: Respond ONLY with the commit message. Do not include any other text, explanations, or metadata. The entire response should be a single line containing only the commit message. Prefer to do explain WHY something was done from a developer perspective instead of WHAT was done!`

type generateRequest struct {
	Diff            string
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

func buildMessages(diff, suggestion, previousMessage string) []chatMessage {
	systemPrompt := prompt

	if strings.TrimSpace(suggestion) != "" && strings.TrimSpace(previousMessage) != "" {
		systemPrompt = fmt.Sprintf(`%s

The developer rejected this commit message: "%s"
The developer wants the commit message to: %s
Generate a completely new commit message that incorporates the developer's feedback. Still follow all formatting rules above.`, prompt, previousMessage, suggestion)
	}

	return []chatMessage{
		{Role: "system", Content: systemPrompt},
		{Role: "user", Content: diff},
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
		Temperature: 0.7,
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

	return chatCompletion(apiURL, apiKey, "gpt-3.5-turbo", buildMessages(req.Diff, req.Suggestion, req.PreviousMessage))
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

	return chatCompletion(apiURL, apiKey, "gemini-2.5-flash-lite", buildMessages(req.Diff, req.Suggestion, req.PreviousMessage))
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
