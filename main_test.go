package main

import "testing"

func TestExample(t *testing.T) {
	expected := "hello world"
	actual := "hello world"

	if actual != expected {
		t.Errorf("Expected %q, got %q", expected, actual)
	}
}
