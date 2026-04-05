package main

import (
	"fmt"
	"os"
	"strconv"
)

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
		fmt.Fprintf(os.Stderr, "warning: invalid value for %s: %q, using default %d\n", key, value, defaultValue)
		return defaultValue
	}
	return intValue
}
