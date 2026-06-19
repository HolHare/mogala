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
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
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
	db.SeedSuperAdmin(database)

	r := mux.NewRouter()
	r.Use(corsMiddleware)

	r.HandleFunc("/auth/register", handlers.Register(database)).Methods("POST", "OPTIONS")
	r.HandleFunc("/auth/login", handlers.Login(database)).Methods("POST", "OPTIONS")
	r.HandleFunc("/auth/verify-email", handlers.VerifyEmail(database)).Methods("POST", "OPTIONS")
	r.HandleFunc("/auth/resend-email-otp", handlers.ResendEmailOTP(database)).Methods("POST", "OPTIONS")
	r.HandleFunc("/auth/send-phone-otp", handlers.SendPhoneOTP(database)).Methods("POST", "OPTIONS")
	r.HandleFunc("/auth/verify-phone", handlers.VerifyPhone(database)).Methods("POST", "OPTIONS")
	r.HandleFunc("/auth/forgot-password", handlers.ForgotPassword(database)).Methods("POST", "OPTIONS")
	r.HandleFunc("/auth/reset-password", handlers.ResetPassword(database)).Methods("POST", "OPTIONS")
	r.HandleFunc("/auth/invite-info", handlers.InviteInfo(database)).Methods("GET", "OPTIONS")
	r.HandleFunc("/auth/accept-invite", handlers.AcceptInvite(database)).Methods("POST", "OPTIONS")

	protected := r.PathPrefix("/api").Subrouter()
	protected.Use(middleware.JWTAuth)

	protected.HandleFunc("/me", handlers.Me(database)).Methods("GET", "OPTIONS")
	protected.HandleFunc("/me", handlers.UpdateProfile(database)).Methods("PUT", "OPTIONS")
	protected.HandleFunc("/me/password", handlers.ChangePassword(database)).Methods("POST", "OPTIONS")
	protected.HandleFunc("/workspace", handlers.GetWorkspace(database)).Methods("GET", "OPTIONS")
	protected.HandleFunc("/workspace", handlers.UpdateWorkspace(database)).Methods("PUT", "OPTIONS")
	protected.HandleFunc("/logout", handlers.Logout(database)).Methods("POST", "OPTIONS")

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
	protected.HandleFunc("/users/resend-invite", handlers.ResendInvite(database)).Methods("POST", "OPTIONS")

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

	// Superadmin routes
	protected.HandleFunc("/admin/tenants", handlers.GetTenants(database)).Methods("GET", "OPTIONS")
	protected.HandleFunc("/admin/tenants/{id}/users", handlers.GetTenantUsers(database)).Methods("GET", "OPTIONS")
	protected.HandleFunc("/admin/tenants/{id}/impersonate", handlers.ImpersonateTenant(database)).Methods("POST", "OPTIONS")
	protected.HandleFunc("/admin/tenants/{id}", handlers.UpdateTenant(database)).Methods("PATCH", "OPTIONS")

	// Disposition codes (admin CRUD)
	protected.HandleFunc("/admin/disposition-codes", handlers.GetDispositionCodes(database)).Methods("GET", "OPTIONS")
	protected.HandleFunc("/admin/disposition-codes", handlers.CreateDispositionCode(database)).Methods("POST", "OPTIONS")
	protected.HandleFunc("/admin/disposition-codes", handlers.UpdateDispositionCode(database)).Methods("PUT", "OPTIONS")
	protected.HandleFunc("/admin/disposition-codes", handlers.DeleteDispositionCode(database)).Methods("DELETE", "OPTIONS")

	// Agent routes
	protected.HandleFunc("/agent/status", handlers.GetAgentStatus(database)).Methods("GET", "OPTIONS")
	protected.HandleFunc("/agent/status", handlers.UpdateAgentStatus(database)).Methods("PUT", "OPTIONS")
	protected.HandleFunc("/agent/disposition", handlers.SubmitDisposition(database)).Methods("POST", "OPTIONS")
	protected.HandleFunc("/agent/shift", handlers.GetShiftSummary(database)).Methods("GET", "OPTIONS")

	// Supervisor routes
	protected.HandleFunc("/supervisor/agents", handlers.GetAgentStatuses(database)).Methods("GET", "OPTIONS")

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server running on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}
