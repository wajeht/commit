package main

import (
	"bytes"
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"

	"github.com/wajeht/commit/assets"
)

func TestCommitScriptHelpWithArguments(t *testing.T) {
	script, err := assets.Embeddedfiles.ReadFile("sh/commit.sh")
	if err != nil {
		t.Fatal(err)
	}

	cmd := exec.Command("bash", "-s", "--", "--help")
	cmd.Stdin = bytes.NewReader(script)
	output, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("commit script help failed: %v\n%s", err, output)
	}

	for _, want := range []string{
		"Usage: commit.sh [options]",
		"--dry-run",
		"--no-verify",
		"--ai-provider",
		"--verbose",
		"--setup",
		"| bash -s -- --dry-run",
	} {
		if !strings.Contains(string(output), want) {
			t.Errorf("help output does not contain %q", want)
		}
	}
}

func TestCommitScriptRunsFirstSetupAndCallsProviderDirectly(t *testing.T) {
	script, err := assets.Embeddedfiles.ReadFile("sh/commit.sh")
	if err != nil {
		t.Fatal(err)
	}

	root := t.TempDir()
	repo := filepath.Join(root, "repo")
	configDir := filepath.Join(root, "config", "commit")
	binDir := filepath.Join(root, "bin")
	if err := os.MkdirAll(repo, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(binDir, 0o755); err != nil {
		t.Fatal(err)
	}

	configPath := filepath.Join(configDir, "config.json")
	setupInputPath := filepath.Join(root, "setup-input")
	setupOutputPath := filepath.Join(root, "setup-output")
	if err := os.WriteFile(setupInputPath, []byte("gemini\n\ngemini-secret\n"), 0o600); err != nil {
		t.Fatal(err)
	}

	requestPath := filepath.Join(root, "request.json")
	argsPath := filepath.Join(root, "curl-args")
	fakeCurl := `#!/bin/bash
printf '%s\n' "$@" > "$CAPTURE_ARGS"
cat > "$CAPTURE_REQUEST"
printf '{"choices":[{"message":{"content":"feat: test direct provider"}}]}\n200'
`
	if err := os.WriteFile(filepath.Join(binDir, "curl"), []byte(fakeCurl), 0o755); err != nil {
		t.Fatal(err)
	}

	runGit(t, repo, "init", "-q")
	if err := os.WriteFile(filepath.Join(repo, "feature.txt"), []byte("new feature\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	runGit(t, repo, "add", "feature.txt")

	cmd := exec.Command("bash", "-s", "--", "--dry-run")
	cmd.Dir = repo
	cmd.Stdin = bytes.NewReader(script)
	cmd.Env = append(os.Environ(),
		"PATH="+binDir+":"+os.Getenv("PATH"),
		"XDG_CONFIG_HOME="+filepath.Join(root, "config"),
		"GEMINI_API_KEY=",
		"COMMIT_PROVIDER=",
		"COMMIT_TTY_INPUT="+setupInputPath,
		"COMMIT_TTY_OUTPUT="+setupOutputPath,
		"CAPTURE_ARGS="+argsPath,
		"CAPTURE_REQUEST="+requestPath,
	)
	output, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("commit script failed: %v\n%s", err, output)
	}
	if !strings.Contains(string(output), "feat: test direct provider") {
		t.Fatalf("output does not contain generated message:\n%s", output)
	}

	configData, err := os.ReadFile(configPath)
	if err != nil {
		t.Fatal(err)
	}
	var config map[string]string
	if err := json.Unmarshal(configData, &config); err != nil {
		t.Fatal(err)
	}
	if config["provider"] != "gemini" || config["gemini_api_key"] != "gemini-secret" {
		t.Errorf("unexpected generated config: %#v", config)
	}
	configInfo, err := os.Stat(configPath)
	if err != nil {
		t.Fatal(err)
	}
	if configInfo.Mode().Perm() != 0o600 {
		t.Errorf("config permissions = %o, want 600", configInfo.Mode().Perm())
	}
	configDirInfo, err := os.Stat(configDir)
	if err != nil {
		t.Fatal(err)
	}
	if configDirInfo.Mode().Perm() != 0o700 {
		t.Errorf("config directory permissions = %o, want 700", configDirInfo.Mode().Perm())
	}

	args, err := os.ReadFile(argsPath)
	if err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{
		"https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
		"Authorization: Bearer gemini-secret",
	} {
		if !strings.Contains(string(args), want) {
			t.Errorf("curl arguments do not contain %q", want)
		}
	}

	requestData, err := os.ReadFile(requestPath)
	if err != nil {
		t.Fatal(err)
	}
	var request struct {
		Model    string `json:"model"`
		Messages []struct {
			Role    string `json:"role"`
			Content string `json:"content"`
		} `json:"messages"`
	}
	if err := json.Unmarshal(requestData, &request); err != nil {
		t.Fatal(err)
	}
	if request.Model != "gemini-2.5-flash-lite" {
		t.Errorf("model = %q", request.Model)
	}
	if len(request.Messages) != 2 || !strings.Contains(request.Messages[1].Content, "feature.txt") {
		t.Errorf("request does not contain the staged diff: %+v", request.Messages)
	}
}

func TestCommitScriptUsesSubscriptionProviders(t *testing.T) {
	script, err := assets.Embeddedfiles.ReadFile("sh/commit.sh")
	if err != nil {
		t.Fatal(err)
	}

	tests := []struct {
		provider   string
		modelField string
		model      string
		message    string
		loginCheck string
		wantArgs   []string
	}{
		{
			provider:   "codex",
			modelField: "codex_model",
			model:      "test-codex-model",
			message:    "feat: use codex subscription",
			loginCheck: `if [ "$1" = "login" ] && [ "$2" = "status" ]; then printf 'Logged in using ChatGPT\n'; exit 0; fi`,
			wantArgs:   []string{"exec", "--ephemeral", "--sandbox", "read-only", "--model", "test-codex-model"},
		},
		{
			provider:   "claude",
			modelField: "claude_model",
			model:      "test-claude-model",
			message:    "feat: use claude subscription",
			loginCheck: `if [ "$1" = "auth" ] && [ "$2" = "status" ]; then printf '{"loggedIn":true,"authMethod":"claude.ai"}\n'; exit 0; fi`,
			wantArgs:   []string{"-p", "--safe-mode", "--tools", "--model", "test-claude-model"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.provider, func(t *testing.T) {
			root := t.TempDir()
			repo := filepath.Join(root, "repo")
			configDir := filepath.Join(root, "config", "commit")
			binDir := filepath.Join(root, "bin")
			for _, dir := range []string{repo, configDir, binDir} {
				if err := os.MkdirAll(dir, 0o700); err != nil {
					t.Fatal(err)
				}
			}

			config := map[string]string{"provider": tt.provider, tt.modelField: tt.model}
			configData, _ := json.Marshal(config)
			if err := os.WriteFile(filepath.Join(configDir, "config.json"), configData, 0o600); err != nil {
				t.Fatal(err)
			}

			requestPath := filepath.Join(root, "request")
			argsPath := filepath.Join(root, "args")
			fakeCLI := "#!/bin/bash\n" + tt.loginCheck + "\n" +
				`printf '%s\n' "$@" > "$CAPTURE_ARGS"
cat > "$CAPTURE_REQUEST"
printf '%s\n' "$FAKE_MESSAGE"
`
			if err := os.WriteFile(filepath.Join(binDir, tt.provider), []byte(fakeCLI), 0o755); err != nil {
				t.Fatal(err)
			}

			runGit(t, repo, "init", "-q")
			if err := os.WriteFile(filepath.Join(repo, "feature.txt"), []byte("subscription change\n"), 0o644); err != nil {
				t.Fatal(err)
			}
			runGit(t, repo, "add", "feature.txt")

			cmd := exec.Command("bash", "-s", "--", "--dry-run")
			cmd.Dir = repo
			cmd.Stdin = bytes.NewReader(script)
			cmd.Env = append(os.Environ(),
				"PATH="+binDir+":"+os.Getenv("PATH"),
				"XDG_CONFIG_HOME="+filepath.Join(root, "config"),
				"COMMIT_PROVIDER=",
				"CAPTURE_ARGS="+argsPath,
				"CAPTURE_REQUEST="+requestPath,
				"FAKE_MESSAGE="+tt.message,
			)
			output, err := cmd.CombinedOutput()
			if err != nil {
				t.Fatalf("commit script failed: %v\n%s", err, output)
			}
			if !strings.Contains(string(output), tt.message) {
				t.Fatalf("output does not contain generated message:\n%s", output)
			}

			args, err := os.ReadFile(argsPath)
			if err != nil {
				t.Fatal(err)
			}
			for _, want := range tt.wantArgs {
				if !strings.Contains(string(args), want) {
					t.Errorf("CLI arguments do not contain %q", want)
				}
			}
			request, err := os.ReadFile(requestPath)
			if err != nil {
				t.Fatal(err)
			}
			if !strings.Contains(string(request), "feature.txt") {
				t.Error("subscription provider did not receive the staged diff")
			}
		})
	}
}

func TestCommitScriptSetupSkipsKeyForSubscription(t *testing.T) {
	script, err := assets.Embeddedfiles.ReadFile("sh/commit.sh")
	if err != nil {
		t.Fatal(err)
	}

	root := t.TempDir()
	binDir := filepath.Join(root, "bin")
	if err := os.MkdirAll(binDir, 0o700); err != nil {
		t.Fatal(err)
	}
	fakeCodex := "#!/bin/bash\nprintf 'Logged in using ChatGPT\\n'\n"
	if err := os.WriteFile(filepath.Join(binDir, "codex"), []byte(fakeCodex), 0o755); err != nil {
		t.Fatal(err)
	}
	inputPath := filepath.Join(root, "setup-input")
	outputPath := filepath.Join(root, "setup-output")
	if err := os.WriteFile(inputPath, []byte("\n\n"), 0o600); err != nil {
		t.Fatal(err)
	}

	cmd := exec.Command("bash", "-s", "--", "--setup")
	cmd.Stdin = bytes.NewReader(script)
	cmd.Env = append(os.Environ(),
		"PATH="+binDir+":"+os.Getenv("PATH"),
		"XDG_CONFIG_HOME="+filepath.Join(root, "config"),
		"COMMIT_PROVIDER=",
		"COMMIT_TTY_INPUT="+inputPath,
		"COMMIT_TTY_OUTPUT="+outputPath,
	)
	if output, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("setup failed: %v\n%s", err, output)
	}

	configData, err := os.ReadFile(filepath.Join(root, "config", "commit", "config.json"))
	if err != nil {
		t.Fatal(err)
	}
	var config map[string]string
	if err := json.Unmarshal(configData, &config); err != nil {
		t.Fatal(err)
	}
	if config["provider"] != "codex" {
		t.Errorf("provider = %q, want codex", config["provider"])
	}
	if _, exists := config["codex_api_key"]; exists {
		t.Error("subscription config should not contain an API key")
	}
}

func TestCommitScriptRejectsNonSubscriptionLogin(t *testing.T) {
	script, err := assets.Embeddedfiles.ReadFile("sh/commit.sh")
	if err != nil {
		t.Fatal(err)
	}

	tests := []struct {
		provider string
		status   string
	}{
		{"codex", "Logged in using an API key"},
		{"claude", `{"loggedIn":true,"authMethod":"console"}`},
	}

	for _, tt := range tests {
		t.Run(tt.provider, func(t *testing.T) {
			root := t.TempDir()
			configDir := filepath.Join(root, "config", "commit")
			binDir := filepath.Join(root, "bin")
			for _, dir := range []string{configDir, binDir} {
				if err := os.MkdirAll(dir, 0o700); err != nil {
					t.Fatal(err)
				}
			}
			if err := os.WriteFile(filepath.Join(configDir, "config.json"), []byte(`{"provider":"`+tt.provider+`"}`), 0o600); err != nil {
				t.Fatal(err)
			}
			fakeCLI := "#!/bin/bash\nprintf '%s\\n' '" + tt.status + "'\n"
			if err := os.WriteFile(filepath.Join(binDir, tt.provider), []byte(fakeCLI), 0o755); err != nil {
				t.Fatal(err)
			}

			cmd := exec.Command("bash", "-s", "--", "--dry-run")
			cmd.Stdin = bytes.NewReader(script)
			cmd.Env = append(os.Environ(),
				"PATH="+binDir+":"+os.Getenv("PATH"),
				"XDG_CONFIG_HOME="+filepath.Join(root, "config"),
				"COMMIT_PROVIDER=",
			)
			output, err := cmd.CombinedOutput()
			if err == nil {
				t.Fatal("script accepted non-subscription authentication")
			}
			if !strings.Contains(string(output), "subscription access") {
				t.Fatalf("unexpected output:\n%s", output)
			}
		})
	}
}

func TestCommitScriptRejectsLooseConfigPermissions(t *testing.T) {
	script, err := assets.Embeddedfiles.ReadFile("sh/commit.sh")
	if err != nil {
		t.Fatal(err)
	}

	configRoot := t.TempDir()
	configDir := filepath.Join(configRoot, "commit")
	if err := os.MkdirAll(configDir, 0o755); err != nil {
		t.Fatal(err)
	}
	configPath := filepath.Join(configDir, "config.json")
	if err := os.WriteFile(configPath, []byte(`{"provider":"gemini"}`), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.Chmod(configPath, 0o644); err != nil {
		t.Fatal(err)
	}

	cmd := exec.Command("bash", "-s", "--", "--dry-run")
	cmd.Stdin = bytes.NewReader(script)
	cmd.Env = append(os.Environ(), "XDG_CONFIG_HOME="+configRoot)
	output, err := cmd.CombinedOutput()
	if err == nil {
		t.Fatal("script accepted a group-readable config file")
	}
	if !strings.Contains(string(output), "chmod 600") {
		t.Fatalf("unexpected output:\n%s", output)
	}
}

func TestCommitScriptSetupUpdatesExistingConfig(t *testing.T) {
	script, err := assets.Embeddedfiles.ReadFile("sh/commit.sh")
	if err != nil {
		t.Fatal(err)
	}

	root := t.TempDir()
	configDir := filepath.Join(root, "commit")
	if err := os.MkdirAll(configDir, 0o700); err != nil {
		t.Fatal(err)
	}
	configPath := filepath.Join(configDir, "config.json")
	initialConfig := `{"provider":"gemini","gemini_api_key":"saved-key","gemini_model":"old-model"}`
	if err := os.WriteFile(configPath, []byte(initialConfig), 0o600); err != nil {
		t.Fatal(err)
	}
	inputPath := filepath.Join(root, "setup-input")
	outputPath := filepath.Join(root, "setup-output")
	if err := os.WriteFile(inputPath, []byte("\nnew-model\n\n"), 0o600); err != nil {
		t.Fatal(err)
	}

	cmd := exec.Command("bash", "-s", "--", "--setup")
	cmd.Stdin = bytes.NewReader(script)
	cmd.Env = append(os.Environ(),
		"XDG_CONFIG_HOME="+root,
		"COMMIT_TTY_INPUT="+inputPath,
		"COMMIT_TTY_OUTPUT="+outputPath,
		"COMMIT_PROVIDER=",
	)
	if output, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("setup failed: %v\n%s", err, output)
	}

	configData, err := os.ReadFile(configPath)
	if err != nil {
		t.Fatal(err)
	}
	var config map[string]string
	if err := json.Unmarshal(configData, &config); err != nil {
		t.Fatal(err)
	}
	if config["gemini_api_key"] != "saved-key" || config["gemini_model"] != "new-model" {
		t.Errorf("unexpected updated config: %#v", config)
	}
}

func runGit(t *testing.T, dir string, args ...string) {
	t.Helper()
	cmd := exec.Command("git", args...)
	cmd.Dir = dir
	if output, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("git %s failed: %v\n%s", strings.Join(args, " "), err, output)
	}
}

func TestInstallScriptBashSyntax(t *testing.T) {
	script, err := assets.Embeddedfiles.ReadFile("sh/install.sh")
	if err != nil {
		t.Fatal(err)
	}

	cmd := exec.Command("bash", "-n")
	cmd.Stdin = bytes.NewReader(script)
	if output, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("install script syntax check failed: %v\n%s", err, output)
	}
}
