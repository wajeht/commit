package main

import (
	"bytes"
	"os/exec"
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
