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

	// ── Public auth routes ──────────────────────────────────────────────────
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

	// Internal endpoint for Kamailio outbound routing (no JWT — localhost only)
	r.HandleFunc("/internal/dial-plan/outbound", handlers.GetDialPlanForOutbound(database)).Methods("GET")

	// ── All authenticated routes require JWT ────────────────────────────────
	api := r.PathPrefix("/api").Subrouter()
	api.Use(middleware.JWTAuth)

	// Any authenticated user
	api.HandleFunc("/me", handlers.Me(database)).Methods("GET", "OPTIONS")
	api.HandleFunc("/me", handlers.UpdateProfile(database)).Methods("PUT", "OPTIONS")
	api.HandleFunc("/me/password", handlers.ChangePassword(database)).Methods("POST", "OPTIONS")
	api.HandleFunc("/workspace", handlers.GetWorkspace(database)).Methods("GET", "OPTIONS")
	api.HandleFunc("/logout", handlers.Logout(database)).Methods("POST", "OPTIONS")
	api.HandleFunc("/users/my-extension", handlers.GetUserExtension(database)).Methods("GET", "OPTIONS")
	api.HandleFunc("/call-logs", handlers.GetCallLogs(database)).Methods("GET", "OPTIONS")

	// Agent + supervisor + admin routes
	agentRoutes := api.PathPrefix("").Subrouter()
	agentRoutes.Use(middleware.RequireRole("agent", "supervisor", "admin", "superadmin"))
	agentRoutes.HandleFunc("/agent/status", handlers.GetAgentStatus(database)).Methods("GET", "OPTIONS")
	agentRoutes.HandleFunc("/agent/status", handlers.UpdateAgentStatus(database)).Methods("PUT", "OPTIONS")
	agentRoutes.HandleFunc("/agent/disposition", handlers.SubmitDisposition(database)).Methods("POST", "OPTIONS")
	agentRoutes.HandleFunc("/agent/shift", handlers.GetShiftSummary(database)).Methods("GET", "OPTIONS")

	// Supervisor + admin routes
	supervisorRoutes := api.PathPrefix("").Subrouter()
	supervisorRoutes.Use(middleware.SupervisorOrAbove())
	supervisorRoutes.HandleFunc("/supervisor/agents", handlers.GetAgentStatuses(database)).Methods("GET", "OPTIONS")

	// Admin + superadmin routes (tenant administration)
	adminRoutes := api.PathPrefix("").Subrouter()
	adminRoutes.Use(middleware.AdminOrAbove())

	adminRoutes.HandleFunc("/workspace", handlers.UpdateWorkspace(database)).Methods("PUT", "OPTIONS")

	// Extensions — admins manage, agents only read via my-extension
	adminRoutes.HandleFunc("/extensions", handlers.GetExtensions(database)).Methods("GET", "OPTIONS")
	adminRoutes.HandleFunc("/extensions", handlers.CreateExtension(database)).Methods("POST", "OPTIONS")
	adminRoutes.HandleFunc("/extensions", handlers.DeleteExtension(database)).Methods("DELETE", "OPTIONS")

	// Users
	adminRoutes.HandleFunc("/users", handlers.GetUsers(database)).Methods("GET", "OPTIONS")
	adminRoutes.HandleFunc("/users", handlers.CreateUser(database)).Methods("POST", "OPTIONS")
	adminRoutes.HandleFunc("/users", handlers.DeleteUser(database)).Methods("DELETE", "OPTIONS")
	adminRoutes.HandleFunc("/users", handlers.UpdateUser(database)).Methods("PUT", "OPTIONS")
	adminRoutes.HandleFunc("/users/assign-extension", handlers.AssignExtension(database)).Methods("POST", "OPTIONS")
	adminRoutes.HandleFunc("/users/resend-invite", handlers.ResendInvite(database)).Methods("POST", "OPTIONS")

	// Phone numbers
	adminRoutes.HandleFunc("/phone-numbers", handlers.GetPhoneNumbers(database)).Methods("GET", "OPTIONS")
	adminRoutes.HandleFunc("/phone-numbers", handlers.CreatePhoneNumber(database)).Methods("POST", "OPTIONS")
	adminRoutes.HandleFunc("/phone-numbers", handlers.UpdatePhoneNumber(database)).Methods("PUT", "OPTIONS")
	adminRoutes.HandleFunc("/phone-numbers", handlers.DeletePhoneNumber(database)).Methods("DELETE", "OPTIONS")
	adminRoutes.HandleFunc("/phone-numbers/stats", handlers.GetPhoneNumberStats(database)).Methods("GET", "OPTIONS")

	// SIP trunks
	adminRoutes.HandleFunc("/trunks", handlers.GetTrunks(database)).Methods("GET", "OPTIONS")
	adminRoutes.HandleFunc("/trunks", handlers.CreateTrunk(database)).Methods("POST", "OPTIONS")
	adminRoutes.HandleFunc("/trunks", handlers.UpdateTrunk(database)).Methods("PUT", "OPTIONS")
	adminRoutes.HandleFunc("/trunks", handlers.DeleteTrunk(database)).Methods("DELETE", "OPTIONS")

	// KYC / RICA — any authenticated user submits for their tenant
	api.HandleFunc("/kyc", handlers.GetKYC(database)).Methods("GET", "OPTIONS")
	api.HandleFunc("/kyc", handlers.SaveKYC(database)).Methods("PUT", "OPTIONS")
	api.HandleFunc("/kyc/submit", handlers.SubmitKYC(database)).Methods("POST", "OPTIONS")
	api.HandleFunc("/kyc/documents", handlers.UploadKYCDocument(database)).Methods("POST", "OPTIONS")
	api.HandleFunc("/kyc/documents/{id}", handlers.DeleteKYCDocument(database)).Methods("DELETE", "OPTIONS")

	// Dial plans — admin CRUD
	adminRoutes.HandleFunc("/dial-plans", handlers.GetDialPlans(database)).Methods("GET", "OPTIONS")
	adminRoutes.HandleFunc("/dial-plans", handlers.CreateDialPlan(database)).Methods("POST", "OPTIONS")
	adminRoutes.HandleFunc("/dial-plans/{id}", handlers.UpdateDialPlan(database)).Methods("PUT", "OPTIONS")
	adminRoutes.HandleFunc("/dial-plans/{id}", handlers.DeleteDialPlan(database)).Methods("DELETE", "OPTIONS")
	adminRoutes.HandleFunc("/dial-plans/{id}/rules", handlers.GetDialPlanRules(database)).Methods("GET", "OPTIONS")
	adminRoutes.HandleFunc("/dial-plans/{id}/rules", handlers.CreateDialPlanRule(database)).Methods("POST", "OPTIONS")
	adminRoutes.HandleFunc("/dial-plans/{id}/rules/{ruleId}", handlers.UpdateDialPlanRule(database)).Methods("PUT", "OPTIONS")
	adminRoutes.HandleFunc("/dial-plans/{id}/rules/{ruleId}", handlers.DeleteDialPlanRule(database)).Methods("DELETE", "OPTIONS")

	// ── Superadmin-only routes ──────────────────────────────────────────────
	superRoutes := api.PathPrefix("").Subrouter()
	superRoutes.Use(middleware.SuperadminOnly())

	superRoutes.HandleFunc("/admin/tenants", handlers.GetTenants(database)).Methods("GET", "OPTIONS")
	superRoutes.HandleFunc("/admin/tenants/{id}/users", handlers.GetTenantUsers(database)).Methods("GET", "OPTIONS")
	superRoutes.HandleFunc("/admin/tenants/{id}/impersonate", handlers.ImpersonateTenant(database)).Methods("POST", "OPTIONS")
	superRoutes.HandleFunc("/admin/tenants/{id}", handlers.UpdateTenant(database)).Methods("PATCH", "OPTIONS")

	// KYC admin review
	superRoutes.HandleFunc("/admin/kyc", handlers.AdminListKYC(database)).Methods("GET", "OPTIONS")
	superRoutes.HandleFunc("/admin/kyc/{id}", handlers.AdminGetKYC(database)).Methods("GET", "OPTIONS")
	superRoutes.HandleFunc("/admin/kyc/{id}", handlers.AdminReviewKYC(database)).Methods("PATCH", "OPTIONS")

	// Porting management
	superRoutes.HandleFunc("/admin/portings", handlers.GetPortings(database)).Methods("GET", "OPTIONS")
	superRoutes.HandleFunc("/admin/portings", handlers.CreatePorting(database)).Methods("POST", "OPTIONS")
	superRoutes.HandleFunc("/admin/portings/{id}", handlers.UpdatePorting(database)).Methods("PUT", "OPTIONS")
	superRoutes.HandleFunc("/admin/portings/{id}", handlers.DeletePorting(database)).Methods("DELETE", "OPTIONS")

	// Disposition codes — admin manages per tenant
	adminRoutes.HandleFunc("/admin/disposition-codes", handlers.GetDispositionCodes(database)).Methods("GET", "OPTIONS")
	adminRoutes.HandleFunc("/admin/disposition-codes", handlers.CreateDispositionCode(database)).Methods("POST", "OPTIONS")
	adminRoutes.HandleFunc("/admin/disposition-codes", handlers.UpdateDispositionCode(database)).Methods("PUT", "OPTIONS")
	adminRoutes.HandleFunc("/admin/disposition-codes", handlers.DeleteDispositionCode(database)).Methods("DELETE", "OPTIONS")

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server running on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}
