package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"golang.org/x/crypto/bcrypt"
	"mogala-backend/middleware"
)

func GetMe(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("claims").(*middleware.Claims)

		var email, firstName, lastName, role string
		var phone *string
		db.QueryRow(
			"SELECT email, first_name, last_name, role, phone FROM users WHERE id = ?",
			claims.UserID,
		).Scan(&email, &firstName, &lastName, &role, &phone)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"user_id":   claims.UserID,
			"tenant_id": claims.TenantID,
			"email":     email,
			"firstName": firstName,
			"lastName":  lastName,
			"role":      role,
			"phone":     phone,
		})
	}
}

func UpdateProfile(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("claims").(*middleware.Claims)

		var req struct {
			FirstName string `json:"first_name"`
			LastName  string `json:"last_name"`
			Phone     string `json:"phone"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonError(w, "Invalid request", http.StatusBadRequest)
			return
		}

		db.Exec(
			"UPDATE users SET first_name=?, last_name=?, phone=? WHERE id=?",
			req.FirstName, req.LastName, req.Phone, claims.UserID,
		)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"message": "Profile updated"})
	}
}

func ChangePassword(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("claims").(*middleware.Claims)

		var req struct {
			CurrentPassword string `json:"current_password"`
			NewPassword     string `json:"new_password"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonError(w, "Invalid request", http.StatusBadRequest)
			return
		}
		if len(req.NewPassword) < 8 {
			jsonError(w, "New password must be at least 8 characters", http.StatusBadRequest)
			return
		}

		var hash string
		err := db.QueryRow("SELECT password_hash FROM users WHERE id=?", claims.UserID).Scan(&hash)
		if err != nil {
			jsonError(w, "User not found", http.StatusNotFound)
			return
		}

		if bcrypt.CompareHashAndPassword([]byte(hash), []byte(req.CurrentPassword)) != nil {
			jsonError(w, "Current password is incorrect", http.StatusUnauthorized)
			return
		}

		newHash, _ := bcrypt.GenerateFromPassword([]byte(req.NewPassword), 12)
		db.Exec("UPDATE users SET password_hash=? WHERE id=?", string(newHash), claims.UserID)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"message": "Password changed"})
	}
}

func GetWorkspace(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("claims").(*middleware.Claims)

		var name, domain string
		var suspended bool
		db.QueryRow(
			"SELECT name, domain, suspended FROM tenants WHERE id=?",
			claims.TenantID,
		).Scan(&name, &domain, &suspended)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"name":      name,
			"domain":    domain,
			"suspended": suspended,
		})
	}
}

func UpdateWorkspace(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("claims").(*middleware.Claims)
		if claims.Role != "admin" && claims.Role != "superadmin" {
			jsonError(w, "Forbidden", http.StatusForbidden)
			return
		}

		var req struct {
			Name string `json:"name"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonError(w, "Invalid request", http.StatusBadRequest)
			return
		}
		if req.Name == "" {
			jsonError(w, "Company name is required", http.StatusBadRequest)
			return
		}

		db.Exec("UPDATE tenants SET name=? WHERE id=?", req.Name, claims.TenantID)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"message": "Workspace updated"})
	}
}

