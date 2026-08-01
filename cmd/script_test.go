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
		"| bash -s -- --dry-run",
	} {
		if !strings.Contains(string(output), want) {
			t.Errorf("help output does not contain %q", want)
		}
	}
}

func TestCommitScriptUsesConfigAndCallsProviderDirectly(t *testing.T) {
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
	if err := os.MkdirAll(configDir, 0o700); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(binDir, 0o755); err != nil {
		t.Fatal(err)
	}

	config := `{"provider":"gemini","gemini_api_key":"gemini-secret"}`
	configPath := filepath.Join(configDir, "config.json")
	if err := os.WriteFile(configPath, []byte(config), 0o600); err != nil {
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
