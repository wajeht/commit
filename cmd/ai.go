package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
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

type generator interface {
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
