package main

import (
	"encoding/json"
	"io"
	"net/http"
)

func healthzHandler(w http.ResponseWriter, r *http.Request) {
	json := r.URL.Query().Get("json") == "true" ||
		r.Header.Get("Content-Type") == "application/json"

	if json {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"message": "ok"}`))
		return
	}

	w.Header().Set("Content-Type", "text/html")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"UTF-8\"><title>Ok</title></head><body><span>Ok</span></body></html>"))
}

func homeHandler(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("homeHandler()"))
}

func generateCommitHandler(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)

	if err != nil {
		http.Error(w, "Unable to read request body", http.StatusBadRequest)
		return
	}

	defer r.Body.Close()

	commitResponse := map[string]string{
		"message": string(body),
	}

	response, err := json.Marshal(commitResponse)

	if err != nil {
		http.Error(w, "Unable to marshal response", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(response)
}
