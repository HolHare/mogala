package main

import (
	"log"
	"net/http"
	"os"

	"github.com/gorilla/mux"
	_ "github.com/go-sql-driver/mysql"
	"mogala/db"
	"mogala/handlers"
	"mogala/middleware"
)

func main() {
	database := db.Connect()
	defer database.Close()

	r := mux.NewRouter()

	// Public routes
	r.HandleFunc("/auth/register", handlers.Register(database)).Methods("POST")
	r.HandleFunc("/auth/login", handlers.Login(database)).Methods("POST")

	// Protected routes
	protected := r.PathPrefix("/api").Subrouter()
	protected.Use(middleware.JWTAuth)
	protected.HandleFunc("/me", handlers.Me(database)).Methods("GET")

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server running on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}
