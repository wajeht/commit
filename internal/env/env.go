package env

import (
	"os"
	"strconv"
)

func GetString(key string, defaultKey string) string {
	value, exists := os.LookupEnv(key)

	if !exists {
		return defaultKey
	}

	return value
}

func GetInt(key string, defaultKey int) int {
	value, exists := os.LookupEnv(key)

	if !exists {
		return defaultKey
	}

	intValue, err := strconv.Atoi(value)

	if err != nil {
		panic(err)
	}

	return intValue
}

func GetBool(key string, defaultValue bool) bool {
	value, exists := os.LookupEnv(key)

	if !exists {
		return defaultValue
	}

	boolValue, err := strconv.ParseBool(value)

	if err != nil {
		panic(err)
	}

	return boolValue
}
