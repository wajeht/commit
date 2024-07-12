package main

import (
	"fmt"
	"log"
	"net/http"
)

func main() {
	const PORT = 80

	mux := http.NewServeMux()

	mux.HandleFunc("GET /healthz", healthzHandler)

	log.Println("Server was started on port:", PORT)

	err := http.ListenAndServe(fmt.Sprintf(":%d", PORT), mux)

	if err != nil {
		log.Fatalf("Error starting server: %s", err)
	}
}
