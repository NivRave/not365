package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"
)

func main() {
	log.Println("not365 Ingestion Worker starting...")

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	log.Println("not365 Ingestion Worker running. Waiting for signals...")
	sig := <-sigChan
	log.Printf("Received signal %v, shutting down worker.", sig)
}
