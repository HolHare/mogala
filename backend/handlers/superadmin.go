package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/mux"
	"mogala-backend/middleware"
)

func requireSuperAdmin(claims *middleware.Claims, w http.ResponseWriter) bool {
	if claims.Role != "superadmin" {
		jsonError(w, "Forbidden", http.StatusForbidden)
		return false
	}
	return true
}

func GetTenants(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("claims").(*middleware.Claims)
		if !requireSuperAdmin(claims, w) {
			return
		}

		rows, err := db.Query(`
			SELECT t.id, t.name, t.domain, t.created_at, t.suspended,
				COUNT(u.id) AS user_count
			FROM tenants t
			LEFT JOIN users u ON u.tenant_id = t.id
			WHERE t.domain != 'system'
			GROUP BY t.id, t.name, t.domain, t.created_at, t.suspended
			ORDER BY t.created_at DESC`)
		if err != nil {
			jsonError(w, "Failed to fetch tenants", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		type Tenant struct {
			ID        string `json:"id"`
			Name      string `json:"name"`
			Domain    string `json:"domain"`
			CreatedAt string `json:"created_at"`
			Suspended bool   `json:"suspended"`
			UserCount int    `json:"user_count"`
		}

		var tenants []Tenant
		for rows.Next() {
			var t Tenant
			rows.Scan(&t.ID, &t.Name, &t.Domain, &t.CreatedAt, &t.Suspended, &t.UserCount)
			tenants = append(tenants, t)
		}
		if tenants == nil {
			tenants = []Tenant{}
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(tenants)
	}
}

func GetTenantUsers(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("claims").(*middleware.Claims)
		if !requireSuperAdmin(claims, w) {
			return
		}

		tenantID := mux.Vars(r)["id"]

		rows, err := db.Query(`
			SELECT id, email, first_name, last_name, role, created_at
			FROM users WHERE tenant_id = ? ORDER BY created_at DESC`, tenantID)
		if err != nil {
			jsonError(w, "Failed to fetch users", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		type User struct {
			ID        string `json:"id"`
			Email     string `json:"email"`
			FirstName string `json:"first_name"`
			LastName  string `json:"last_name"`
			Role      string `json:"role"`
			CreatedAt string `json:"created_at"`
		}

		var users []User
		for rows.Next() {
			var u User
			rows.Scan(&u.ID, &u.Email, &u.FirstName, &u.LastName, &u.Role, &u.CreatedAt)
			users = append(users, u)
		}
		if users == nil {
			users = []User{}
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(users)
	}
}

func ImpersonateTenant(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("claims").(*middleware.Claims)
		if !requireSuperAdmin(claims, w) {
			return
		}

		tenantID := mux.Vars(r)["id"]

		var tenantName string
		err := db.QueryRow("SELECT name FROM tenants WHERE id = ? AND domain != 'system'", tenantID).
			Scan(&tenantName)
		if err == sql.ErrNoRows {
			jsonError(w, "Tenant not found", http.StatusNotFound)
			return
		}
		if err != nil {
			jsonError(w, "Database error", http.StatusInternalServerError)
			return
		}

		scopedClaims := &middleware.Claims{
			UserID:   claims.UserID,
			TenantID: tenantID,
			Role:     "admin",
			RegisteredClaims: jwt.RegisteredClaims{
				ExpiresAt: jwt.NewNumericDate(time.Now().Add(2 * time.Hour)),
			},
		}

		token := jwt.NewWithClaims(jwt.SigningMethodHS256, scopedClaims)
		tokenStr, _ := token.SignedString([]byte(os.Getenv("JWT_SECRET")))

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"token":       tokenStr,
			"tenant_name": tenantName,
		})
	}
}

func UpdateTenant(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("claims").(*middleware.Claims)
		if !requireSuperAdmin(claims, w) {
			return
		}

		tenantID := mux.Vars(r)["id"]
		var req struct {
			Suspended bool `json:"suspended"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonError(w, "Invalid request", http.StatusBadRequest)
			return
		}

		_, err := db.Exec(
			"UPDATE tenants SET suspended = ? WHERE id = ? AND domain != 'system'",
			req.Suspended, tenantID,
		)
		if err != nil {
			jsonError(w, "Failed to update tenant", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"message": "Tenant updated"})
	}
}
