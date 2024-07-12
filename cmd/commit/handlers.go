package main

import (
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
	// resp, err := http.Get("https://ip.jaw.dev?json=true")
	// if err != nil {
	// 	http.Error(w, "Failed to make the request", http.StatusInternalServerError)
	// 	return
	// }

	// defer resp.Body.Close()

	// body, err := io.ReadAll(resp.Body)
	// if err != nil {
	// 	http.Error(w, "Failed to read the response body", http.StatusInternalServerError)
	// 	return
	// }

	// // Write the response body to the HTTP response
	// w.Write(body)

	body, err := io.ReadAll(r.Body)

	if err != nil {
		http.Error(w, "Unable to read request body", http.StatusBadRequest)
		return
	}

	w.Write([]byte(body))

	w.Write([]byte("generateCommitHandler()"))
}
