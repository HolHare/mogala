package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"mogala-backend/middleware"
)

type CreateUserRequest struct {
	Email     string `json:"email"`
	Password  string `json:"password"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Role      string `json:"role"`
}

func GetUsers(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("claims").(*middleware.Claims)
		if claims.Role != "admin" && claims.Role != "superadmin" {
			jsonError(w, "Forbidden", http.StatusForbidden)
			return
		}

		rows, err := db.Query(`
			SELECT id, email, first_name, last_name, role, created_at
			FROM users
			WHERE tenant_id = ?
			ORDER BY created_at DESC`, claims.TenantID)
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

func CreateUser(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("claims").(*middleware.Claims)
		if claims.Role != "admin" && claims.Role != "superadmin" {
			jsonError(w, "Forbidden", http.StatusForbidden)
			return
		}

		var req CreateUserRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonError(w, "Invalid request", http.StatusBadRequest)
			return
		}

		if req.Email == "" || req.Password == "" {
			jsonError(w, "Email and password required", http.StatusBadRequest)
			return
		}

		validRoles := map[string]bool{"admin": true, "supervisor": true, "agent": true, "billing": true}
		if req.Role == "" {
			req.Role = "agent"
		}
		if !validRoles[req.Role] {
			jsonError(w, "Invalid role", http.StatusBadRequest)
			return
		}

		hash, _ := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
		id := uuid.New().String()

		_, err := db.Exec(`
			INSERT INTO users (id, tenant_id, email, password_hash, role, first_name, last_name)
			VALUES (?, ?, ?, ?, ?, ?, ?)`,
			id, claims.TenantID, req.Email, string(hash), req.Role, req.FirstName, req.LastName)
		if err != nil {
			jsonError(w, "Email already exists", http.StatusConflict)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(map[string]string{"id": id, "email": req.Email, "role": req.Role})
	}
}

func DeleteUser(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("claims").(*middleware.Claims)
		if claims.Role != "admin" && claims.Role != "superadmin" {
			jsonError(w, "Forbidden", http.StatusForbidden)
			return
		}

		id := r.URL.Query().Get("id")
		if id == claims.UserID {
			jsonError(w, "Cannot delete yourself", http.StatusBadRequest)
			return
		}

		db.Exec("DELETE FROM users WHERE id = ? AND tenant_id = ?", id, claims.TenantID)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"message": "User deleted"})
	}
}

func UpdateUser(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("claims").(*middleware.Claims)
		if claims.Role != "admin" && claims.Role != "superadmin" {
			jsonError(w, "Forbidden", http.StatusForbidden)
			return
		}

		id := r.URL.Query().Get("id")
		var req struct {
			Role      string `json:"role"`
			FirstName string `json:"first_name"`
			LastName  string `json:"last_name"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonError(w, "Invalid request", http.StatusBadRequest)
			return
		}

		db.Exec(`UPDATE users SET role=?, first_name=?, last_name=? WHERE id=? AND tenant_id=?`,
			req.Role, req.FirstName, req.LastName, id, claims.TenantID)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"message": "User updated"})
	}
}

func AssignExtension(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("claims").(*middleware.Claims)
		if claims.Role != "admin" && claims.Role != "superadmin" {
			jsonError(w, "Forbidden", http.StatusForbidden)
			return
		}

		var req struct {
			UserID      string `json:"user_id"`
			ExtensionID string `json:"extension_id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonError(w, "Invalid request", http.StatusBadRequest)
			return
		}

		var userTenantID string
		err := db.QueryRow("SELECT tenant_id FROM users WHERE id=?", req.UserID).Scan(&userTenantID)
		if err != nil || userTenantID != claims.TenantID {
			jsonError(w, "User not found", http.StatusNotFound)
			return
		}

		// Unassign any existing extension for this user
		db.Exec("UPDATE extensions SET user_id=NULL WHERE user_id=? AND tenant_id=?", req.UserID, claims.TenantID)

		if req.ExtensionID != "" {
			db.Exec("UPDATE extensions SET user_id=? WHERE id=? AND tenant_id=?",
				req.UserID, req.ExtensionID, claims.TenantID)
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"message": "Extension assigned"})
	}
}

func GetUserExtension(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("claims").(*middleware.Claims)

		type Ext struct {
			ID          string `json:"id"`
			Extension   string `json:"extension"`
			SIPPassword string `json:"sip_password"`
		}

		var e Ext
		err := db.QueryRow(`
			SELECT id, extension, sip_password FROM extensions
			WHERE user_id = ? AND tenant_id = ?`, claims.UserID, claims.TenantID).
			Scan(&e.ID, &e.Extension, &e.SIPPassword)

		w.Header().Set("Content-Type", "application/json")
		if err == sql.ErrNoRows {
			json.NewEncoder(w).Encode(nil)
			return
		}
		json.NewEncoder(w).Encode(e)
	}
}
