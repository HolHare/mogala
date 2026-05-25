package main

import (
	"log"
	"net/http"
	"os"

	"github.com/gorilla/mux"
	_ "github.com/go-sql-driver/mysql"
	"mogala-backend/db"
	"mogala-backend/handlers"
	"mogala-backend/middleware"
)

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func main() {
	database := db.Connect()
	defer database.Close()

	db.Migrate(database)

	r := mux.NewRouter()
	r.Use(corsMiddleware)

	r.HandleFunc("/auth/register", handlers.Register(database)).Methods("POST", "OPTIONS")
	r.HandleFunc("/auth/login", handlers.Login(database)).Methods("POST", "OPTIONS")

	protected := r.PathPrefix("/api").Subrouter()
	protected.Use(middleware.JWTAuth)

	protected.HandleFunc("/me", handlers.Me(database)).Methods("GET", "OPTIONS")

	// Extensions
	protected.HandleFunc("/extensions", handlers.GetExtensions(database)).Methods("GET", "OPTIONS")
	protected.HandleFunc("/extensions", handlers.CreateExtension(database)).Methods("POST", "OPTIONS")
	protected.HandleFunc("/extensions", handlers.DeleteExtension(database)).Methods("DELETE", "OPTIONS")

	// Users
	protected.HandleFunc("/users", handlers.GetUsers(database)).Methods("GET", "OPTIONS")
	protected.HandleFunc("/users", handlers.CreateUser(database)).Methods("POST", "OPTIONS")
	protected.HandleFunc("/users", handlers.DeleteUser(database)).Methods("DELETE", "OPTIONS")
	protected.HandleFunc("/users", handlers.UpdateUser(database)).Methods("PUT", "OPTIONS")
	protected.HandleFunc("/users/assign-extension", handlers.AssignExtension(database)).Methods("POST", "OPTIONS")
	protected.HandleFunc("/users/my-extension", handlers.GetUserExtension(database)).Methods("GET", "OPTIONS")

	// Phone numbers
	protected.HandleFunc("/phone-numbers", handlers.GetPhoneNumbers(database)).Methods("GET", "OPTIONS")
	protected.HandleFunc("/phone-numbers", handlers.CreatePhoneNumber(database)).Methods("POST", "OPTIONS")
	protected.HandleFunc("/phone-numbers", handlers.UpdatePhoneNumber(database)).Methods("PUT", "OPTIONS")
	protected.HandleFunc("/phone-numbers", handlers.DeletePhoneNumber(database)).Methods("DELETE", "OPTIONS")
	protected.HandleFunc("/phone-numbers/stats", handlers.GetPhoneNumberStats(database)).Methods("GET", "OPTIONS")

	// Call logs
	protected.HandleFunc("/call-logs", handlers.GetCallLogs(database)).Methods("GET", "OPTIONS")

	// SIP trunks
	protected.HandleFunc("/trunks", handlers.GetTrunks(database)).Methods("GET", "OPTIONS")
	protected.HandleFunc("/trunks", handlers.CreateTrunk(database)).Methods("POST", "OPTIONS")
	protected.HandleFunc("/trunks", handlers.UpdateTrunk(database)).Methods("PUT", "OPTIONS")
	protected.HandleFunc("/trunks", handlers.DeleteTrunk(database)).Methods("DELETE", "OPTIONS")

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server running on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}
