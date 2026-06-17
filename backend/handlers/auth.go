package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"mogala-backend/middleware"
)

type RegisterRequest struct {
	CompanyName string `json:"company_name"`
	Domain      string `json:"domain"`
	Email       string `json:"email"`
	Password    string `json:"password"`
	FirstName   string `json:"first_name"`
	LastName    string `json:"last_name"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Domain   string `json:"domain"`
}

func Register(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req RegisterRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request", http.StatusBadRequest)
			return
		}

		tenantID := uuid.New().String()
		userID := uuid.New().String()

		_, err := db.Exec(
			"INSERT INTO tenants (id, name, domain) VALUES (?, ?, ?)",
			tenantID, req.CompanyName, req.Domain,
		)
		if err != nil {
			http.Error(w, "Domain already taken", http.StatusConflict)
			return
		}

		hash, _ := bcrypt.GenerateFromPassword([]byte(req.Password), 12)

		_, err = db.Exec(
			"INSERT INTO users (id, tenant_id, email, password_hash, role, first_name, last_name) VALUES (?, ?, ?, ?, 'admin', ?, ?)",
			userID, tenantID, req.Email, string(hash), req.FirstName, req.LastName,
		)
		if err != nil {
			http.Error(w, "Email already exists", http.StatusConflict)
			return
		}

		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(map[string]string{"message": "Tenant registered successfully"})
	}
}

func Login(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req LoginRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request", http.StatusBadRequest)
			return
		}

		var userID, tenantID, passwordHash, role string
		var err error

		if req.Domain == "" {
			// Superadmin path: match by email only, must be superadmin role
			err = db.QueryRow(`
				SELECT u.id, u.tenant_id, u.password_hash, u.role
				FROM users u
				WHERE u.email = ? AND u.role = 'superadmin'`,
				req.Email,
			).Scan(&userID, &tenantID, &passwordHash, &role)
		} else {
			err = db.QueryRow(`
				SELECT u.id, u.tenant_id, u.password_hash, u.role
				FROM users u
				JOIN tenants t ON t.id = u.tenant_id
				WHERE u.email = ? AND t.domain = ?`,
				req.Email, req.Domain,
			).Scan(&userID, &tenantID, &passwordHash, &role)
		}

		if err != nil {
			http.Error(w, "Invalid credentials", http.StatusUnauthorized)
			return
		}

		if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.Password)); err != nil {
			http.Error(w, "Invalid credentials", http.StatusUnauthorized)
			return
		}

		// Block suspended tenants (non-superadmin)
		if role != "superadmin" {
			var suspended bool
			db.QueryRow("SELECT suspended FROM tenants WHERE id = ?", tenantID).Scan(&suspended)
			if suspended {
				http.Error(w, "Account suspended", http.StatusForbidden)
				return
			}
		}

		// Track agent shift on login
		if role == "agent" {
			shiftID := uuid.New().String()
			db.Exec("INSERT INTO agent_shifts (id, user_id, tenant_id, login_at) VALUES (?, ?, ?, NOW())",
				shiftID, userID, tenantID)
			db.Exec(`
				INSERT INTO agent_statuses (user_id, tenant_id, status, reason, changed_at)
				VALUES (?, ?, 'available', '', NOW())
				ON DUPLICATE KEY UPDATE status = 'available', reason = '', changed_at = NOW()`,
				userID, tenantID)
		}

		claims := &middleware.Claims{
			UserID:   userID,
			TenantID: tenantID,
			Role:     role,
			RegisteredClaims: jwt.RegisteredClaims{
				ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			},
		}

		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		tokenStr, _ := token.SignedString([]byte(os.Getenv("JWT_SECRET")))

		json.NewEncoder(w).Encode(map[string]string{"token": tokenStr, "role": role})
	}
}

func Me(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("claims").(*middleware.Claims)

		var email, firstName, lastName, role string
		db.QueryRow(
			"SELECT email, first_name, last_name, role FROM users WHERE id = ?",
			claims.UserID,
		).Scan(&email, &firstName, &lastName, &role)

		json.NewEncoder(w).Encode(map[string]string{
			"user_id":   claims.UserID,
			"tenant_id": claims.TenantID,
			"email":     email,
			"firstName": firstName,
			"lastName":  lastName,
			"role":      role,
		})
	}
}

func Logout(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("claims").(*middleware.Claims)

		if claims.Role == "agent" {
			db.Exec(`UPDATE agent_shifts SET logout_at = NOW()
				WHERE user_id = ? AND tenant_id = ? AND logout_at IS NULL`,
				claims.UserID, claims.TenantID)
			db.Exec(`
				INSERT INTO agent_statuses (user_id, tenant_id, status, reason, changed_at)
				VALUES (?, ?, 'offline', '', NOW())
				ON DUPLICATE KEY UPDATE status = 'offline', reason = '', changed_at = NOW()`,
				claims.UserID, claims.TenantID)
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"message": "Logged out"})
	}
}
