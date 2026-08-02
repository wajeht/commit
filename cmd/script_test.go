package main

import (
	"bytes"
	"encoding/json"
	"errors"
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
		"--yes",
		"--no-verify",
		"--model",
		"--verbose",
		"--setup",
		"| bash -s -- --dry-run",
	} {
		if !strings.Contains(string(output), want) {
			t.Errorf("help output does not contain %q", want)
		}
	}
}

func TestCommitScriptRejectsInvalidArguments(t *testing.T) {
	script, err := assets.Embeddedfiles.ReadFile("sh/commit.sh")
	if err != nil {
		t.Fatal(err)
	}

	tests := []struct {
		name string
		args []string
		want string
	}{
		{"missing model", []string{"--model"}, "requires a value"},
		{"empty model", []string{"--model="}, "requires a value"},
		{"unknown option", []string{"--unknown"}, "Invalid option"},
		{"unexpected argument", []string{"--", "unexpected"}, "Unexpected argument"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cmd := exec.Command("bash", "-s", "--")
			cmd.Args = append(cmd.Args, tt.args...)
			cmd.Stdin = bytes.NewReader(script)
			output, err := cmd.CombinedOutput()
			if err == nil {
				t.Fatalf("arguments were accepted: %v", tt.args)
			}
			var exitErr *exec.ExitError
			if !errors.As(err, &exitErr) || exitErr.ExitCode() != 2 {
				t.Fatalf("exit error = %v, want status 2", err)
			}
			if !strings.Contains(string(output), tt.want) {
				t.Fatalf("unexpected output:\n%s", output)
			}
		})
	}
}

func TestCommitScriptGitHookFlags(t *testing.T) {
	script, err := assets.Embeddedfiles.ReadFile("sh/commit.sh")
	if err != nil {
		t.Fatal(err)
	}

	tests := []struct {
		name     string
		args     []string
		wantHook bool
	}{
		{"yes runs hooks", []string{"--yes"}, true},
		{"no verify skips hooks", []string{"--yes", "--no-verify"}, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			root := t.TempDir()
			repo := filepath.Join(root, "repo")
			configDir := filepath.Join(root, "config", "commit")
			binDir := filepath.Join(root, "bin")
			for _, dir := range []string{repo, configDir, binDir} {
				if err := os.MkdirAll(dir, 0o700); err != nil {
					t.Fatal(err)
				}
			}
			if err := os.WriteFile(filepath.Join(configDir, "config.json"), []byte(`{"api_key":"test-key"}`), 0o600); err != nil {
				t.Fatal(err)
			}
			fakeCurl := `#!/bin/bash
cat >/dev/null
printf '{"choices":[{"message":{"content":"test: verify git hooks"}}]}\n200'
`
			if err := os.WriteFile(filepath.Join(binDir, "curl"), []byte(fakeCurl), 0o755); err != nil {
				t.Fatal(err)
			}

			runGit(t, repo, "init", "-q")
			runGit(t, repo, "config", "user.name", "Commit QA")
			runGit(t, repo, "config", "user.email", "commit-qa@example.com")
			runGit(t, repo, "config", "commit.gpgsign", "false")
			if err := os.WriteFile(filepath.Join(repo, "feature.txt"), []byte("hook test\n"), 0o644); err != nil {
				t.Fatal(err)
			}
			runGit(t, repo, "add", "feature.txt")

			hookMarker := filepath.Join(root, "hook-ran")
			hook := "#!/bin/sh\n: > \"$HOOK_MARKER\"\n"
			if err := os.WriteFile(filepath.Join(repo, ".git", "hooks", "pre-commit"), []byte(hook), 0o755); err != nil {
				t.Fatal(err)
			}

			cmd := exec.Command("bash", "-s", "--")
			cmd.Args = append(cmd.Args, tt.args...)
			cmd.Dir = repo
			cmd.Stdin = bytes.NewReader(script)
			cmd.Env = append(os.Environ(),
				"PATH="+binDir+":"+os.Getenv("PATH"),
				"XDG_CONFIG_HOME="+filepath.Join(root, "config"),
				"OPENROUTER_API_KEY=",
				"HOOK_MARKER="+hookMarker,
				"TMPDIR="+root,
			)
			if output, err := cmd.CombinedOutput(); err != nil {
				t.Fatalf("commit script failed: %v\n%s", err, output)
			}

			_, err = os.Stat(hookMarker)
			if tt.wantHook && err != nil {
				t.Error("pre-commit hook did not run")
			}
			if !tt.wantHook && !os.IsNotExist(err) {
				t.Error("pre-commit hook ran with --no-verify")
			}
		})
	}
}

func TestCommitScriptRunsFirstSetupAndCallsOpenRouter(t *testing.T) {
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
	if err := os.WriteFile(setupInputPath, []byte("openrouter-secret\n"), 0o600); err != nil {
		t.Fatal(err)
	}

	requestPath := filepath.Join(root, "request.json")
	argsPath := filepath.Join(root, "curl-args")
	headerPath := filepath.Join(root, "curl-header")
	headerModePath := filepath.Join(root, "curl-header-mode")
	fakeCurl := `#!/bin/bash
printf '%s\n' "$@" > "$CAPTURE_ARGS"
for arg in "$@"; do
    case "$arg" in
        @/*)
            cat "${arg#@}" > "$CAPTURE_HEADER"
            stat -c '%a' "${arg#@}" > "$CAPTURE_HEADER_MODE" 2>/dev/null || stat -f '%Lp' "${arg#@}" > "$CAPTURE_HEADER_MODE"
            ;;
    esac
done
cat > "$CAPTURE_REQUEST"
printf '{"choices":[{"message":{"content":"feat: test openrouter"}}]}\n200'
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
		"OPENROUTER_API_KEY=",
		"COMMIT_MODEL=",
		"TMPDIR="+root,
		"COMMIT_TTY_INPUT="+setupInputPath,
		"COMMIT_TTY_OUTPUT="+setupOutputPath,
		"CAPTURE_ARGS="+argsPath,
		"CAPTURE_HEADER="+headerPath,
		"CAPTURE_HEADER_MODE="+headerModePath,
		"CAPTURE_REQUEST="+requestPath,
	)
	output, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("commit script failed: %v\n%s", err, output)
	}
	if !strings.Contains(string(output), "feat: test openrouter") {
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
	if config["api_key"] != "openrouter-secret" || len(config) != 1 {
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
		"https://openrouter.ai/api/v1/chat/completions",
		"--connect-timeout",
		"--max-time",
	} {
		if !strings.Contains(string(args), want) {
			t.Errorf("curl arguments do not contain %q", want)
		}
	}
	if strings.Contains(string(args), "openrouter-secret") {
		t.Error("API key was exposed in curl arguments")
	}
	header, err := os.ReadFile(headerPath)
	if err != nil {
		t.Fatal(err)
	}
	if string(header) != "Authorization: Bearer openrouter-secret\n" {
		t.Error("curl did not receive the expected authorization header")
	}
	headerMode, err := os.ReadFile(headerModePath)
	if err != nil {
		t.Fatal(err)
	}
	if strings.TrimSpace(string(headerMode)) != "600" {
		t.Errorf("temporary authorization file mode = %q, want 600", strings.TrimSpace(string(headerMode)))
	}
	authFiles, err := filepath.Glob(filepath.Join(root, "commit-auth.*"))
	if err != nil {
		t.Fatal(err)
	}
	if len(authFiles) != 0 {
		t.Errorf("temporary authorization files were not removed: %v", authFiles)
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
	if request.Model != "google/gemini-2.5-flash-lite" {
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
	if err := os.WriteFile(configPath, []byte(`{"model":"openrouter/auto"}`), 0o644); err != nil {
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

func TestCommitScriptSetupKeepsExistingKey(t *testing.T) {
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
	initialConfig := `{"api_key":"saved-key"}`
	if err := os.WriteFile(configPath, []byte(initialConfig), 0o600); err != nil {
		t.Fatal(err)
	}
	inputPath := filepath.Join(root, "setup-input")
	outputPath := filepath.Join(root, "setup-output")
	if err := os.WriteFile(inputPath, []byte("\n"), 0o600); err != nil {
		t.Fatal(err)
	}

	cmd := exec.Command("bash", "-s", "--", "--setup")
	cmd.Stdin = bytes.NewReader(script)
	cmd.Env = append(os.Environ(),
		"XDG_CONFIG_HOME="+root,
		"COMMIT_TTY_INPUT="+inputPath,
		"COMMIT_TTY_OUTPUT="+outputPath,
		"COMMIT_MODEL=",
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
	if config["api_key"] != "saved-key" || len(config) != 1 {
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
