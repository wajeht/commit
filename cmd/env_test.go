package main

import (
	"os"
	"testing"
)

func TestGetString(t *testing.T) {
	tests := []struct {
		name         string
		key          string
		defaultValue string
		envValue     string
		setEnv       bool
		want         string
	}{
		{
			name:         "returns environment value when set",
			key:          "TEST_STRING",
			defaultValue: "default",
			envValue:     "custom",
			setEnv:       true,
			want:         "custom",
		},
		{
			name:         "returns default value when not set",
			key:          "TEST_STRING_UNSET",
			defaultValue: "default",
			envValue:     "",
			setEnv:       false,
			want:         "default",
		},
		{
			name:         "returns empty string when set to empty",
			key:          "TEST_STRING_EMPTY",
			defaultValue: "default",
			envValue:     "",
			setEnv:       true,
			want:         "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.setEnv {
				os.Setenv(tt.key, tt.envValue)
				defer os.Unsetenv(tt.key)
			}

			got := GetString(tt.key, tt.defaultValue)
			if got != tt.want {
				t.Errorf("GetString() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestGetInt(t *testing.T) {
	tests := []struct {
		name         string
		key          string
		defaultValue int
		envValue     string
		setEnv       bool
		want         int
	}{
		{
			name:         "returns environment value when set to valid int",
			key:          "TEST_INT",
			defaultValue: 42,
			envValue:     "100",
			setEnv:       true,
			want:         100,
		},
		{
			name:         "returns default value when not set",
			key:          "TEST_INT_UNSET",
			defaultValue: 42,
			envValue:     "",
			setEnv:       false,
			want:         42,
		},
		{
			name:         "returns default value when set to invalid int",
			key:          "TEST_INT_INVALID",
			defaultValue: 42,
			envValue:     "not-a-number",
			setEnv:       true,
			want:         42,
		},
		{
			name:         "returns default value when set to empty string",
			key:          "TEST_INT_EMPTY",
			defaultValue: 42,
			envValue:     "",
			setEnv:       true,
			want:         42,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.setEnv {
				os.Setenv(tt.key, tt.envValue)
				defer os.Unsetenv(tt.key)
			}

			got := GetInt(tt.key, tt.defaultValue)
			if got != tt.want {
				t.Errorf("GetInt() = %v, want %v", got, tt.want)
			}
		})
	}
}
