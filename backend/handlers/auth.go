package handlers

import (
	cryptorand "crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
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
	Phone       string `json:"phone"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Domain   string `json:"domain"`
}

func generateOTP() string {
	b := make([]byte, 4)
	cryptorand.Read(b)
	n := (int(b[0])<<16 | int(b[1])<<8 | int(b[2])) % 1000000
	return fmt.Sprintf("%06d", n)
}

func generateToken() string {
	b := make([]byte, 32)
	cryptorand.Read(b)
	return hex.EncodeToString(b)
}

func Register(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req RegisterRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonError(w, "Invalid request", http.StatusBadRequest)
			return
		}
		if req.Domain == "" || req.Email == "" || req.Password == "" || req.Phone == "" {
			jsonError(w, "All fields including phone number are required", http.StatusBadRequest)
			return
		}
		if len(req.Password) < 8 {
			jsonError(w, "Password must be at least 8 characters", http.StatusBadRequest)
			return
		}

		tenantID := uuid.New().String()
		_, err := db.Exec(
			"INSERT INTO tenants (id, name, domain) VALUES (?, ?, ?)",
			tenantID, req.CompanyName, req.Domain,
		)
		if err != nil {
			jsonError(w, "Domain already taken", http.StatusConflict)
			return
		}

		hash, _ := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
		userID := uuid.New().String()
		_, err = db.Exec(
			`INSERT INTO users (id, tenant_id, email, password_hash, role, first_name, last_name, phone, email_verified, phone_verified)
			 VALUES (?, ?, ?, ?, 'admin', ?, ?, ?, FALSE, FALSE)`,
			userID, tenantID, req.Email, string(hash), req.FirstName, req.LastName, req.Phone,
		)
		if err != nil {
			db.Exec("DELETE FROM tenants WHERE id = ?", tenantID)
			jsonError(w, "Email already exists", http.StatusConflict)
			return
		}

		otp := generateOTP()
		otpID := uuid.New().String()
		db.Exec(
			`INSERT INTO otp_tokens (id, user_id, type, otp, expires_at) VALUES (?, ?, 'email', ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))`,
			otpID, userID, otp,
		)
		sendEmail(req.Email, "Verify your Mogala email", emailOTPTemplate(otp))

		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(map[string]string{
			"user_id": userID,
			"message": "Account created. Check your email for a verification code.",
		})
	}
}

func Login(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req LoginRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonError(w, "Invalid request", http.StatusBadRequest)
			return
		}

		var userID, tenantID, passwordHash, role string
		var emailVerified, phoneVerified bool
		var err error

		if req.Domain == "" {
			err = db.QueryRow(`
				SELECT u.id, u.tenant_id, u.password_hash, u.role, u.email_verified, u.phone_verified
				FROM users u
				WHERE u.email = ? AND u.role = 'superadmin'`,
				req.Email,
			).Scan(&userID, &tenantID, &passwordHash, &role, &emailVerified, &phoneVerified)
		} else {
			err = db.QueryRow(`
				SELECT u.id, u.tenant_id, u.password_hash, u.role, u.email_verified, u.phone_verified
				FROM users u
				JOIN tenants t ON t.id = u.tenant_id
				WHERE u.email = ? AND t.domain = ?`,
				req.Email, req.Domain,
			).Scan(&userID, &tenantID, &passwordHash, &role, &emailVerified, &phoneVerified)
		}

		if err != nil {
			jsonError(w, "Invalid credentials", http.StatusUnauthorized)
			return
		}

		if !emailVerified {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{
				"error":   "Your account is pending — check your email for an invite or verification link.",
				"code":    "EMAIL_NOT_VERIFIED",
				"user_id": userID,
			})
			return
		}

		if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.Password)); err != nil {
			jsonError(w, "Invalid credentials", http.StatusUnauthorized)
			return
		}

		if !phoneVerified {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{
				"error":   "Please verify your phone number before signing in.",
				"code":    "PHONE_NOT_VERIFIED",
				"user_id": userID,
			})
			return
		}

		if role != "superadmin" {
			var suspended bool
			db.QueryRow("SELECT suspended FROM tenants WHERE id = ?", tenantID).Scan(&suspended)
			if suspended {
				jsonError(w, "Account suspended", http.StatusForbidden)
				return
			}
		}

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

func VerifyEmail(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			UserID string `json:"user_id"`
			OTP    string `json:"otp"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonError(w, "Invalid request", http.StatusBadRequest)
			return
		}

		var otpID string
		err := db.QueryRow(`
			SELECT id FROM otp_tokens
			WHERE user_id = ? AND type = 'email' AND otp = ? AND used = FALSE AND expires_at > NOW()
			ORDER BY created_at DESC LIMIT 1`,
			req.UserID, req.OTP,
		).Scan(&otpID)
		if err != nil {
			jsonError(w, "Invalid or expired code", http.StatusBadRequest)
			return
		}

		db.Exec("UPDATE otp_tokens SET used = TRUE WHERE id = ?", otpID)
		db.Exec("UPDATE users SET email_verified = TRUE WHERE id = ?", req.UserID)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]bool{"verified": true})
	}
}

func ResendEmailOTP(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			UserID string `json:"user_id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonError(w, "Invalid request", http.StatusBadRequest)
			return
		}

		var email string
		err := db.QueryRow(
			"SELECT email FROM users WHERE id = ? AND email_verified = FALSE", req.UserID,
		).Scan(&email)
		if err != nil {
			jsonError(w, "User not found or already verified", http.StatusBadRequest)
			return
		}

		db.Exec("UPDATE otp_tokens SET used = TRUE WHERE user_id = ? AND type = 'email'", req.UserID)

		otp := generateOTP()
		otpID := uuid.New().String()
		db.Exec(
			`INSERT INTO otp_tokens (id, user_id, type, otp, expires_at) VALUES (?, ?, 'email', ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))`,
			otpID, req.UserID, otp,
		)
		sendEmail(email, "Your new Mogala verification code", emailOTPTemplate(otp))

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]bool{"sent": true})
	}
}

func SendPhoneOTP(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			UserID string `json:"user_id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonError(w, "Invalid request", http.StatusBadRequest)
			return
		}

		var phone string
		err := db.QueryRow(
			"SELECT phone FROM users WHERE id = ? AND email_verified = TRUE AND phone_verified = FALSE",
			req.UserID,
		).Scan(&phone)
		if err != nil || phone == "" {
			jsonError(w, "User not found, email not verified, or phone already verified", http.StatusBadRequest)
			return
		}

		db.Exec("UPDATE otp_tokens SET used = TRUE WHERE user_id = ? AND type = 'phone'", req.UserID)

		otp := generateOTP()
		otpID := uuid.New().String()
		db.Exec(
			`INSERT INTO otp_tokens (id, user_id, type, otp, expires_at) VALUES (?, ?, 'phone', ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))`,
			otpID, req.UserID, otp,
		)
		sendPhoneOTP(phone, otp)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]bool{"sent": true})
	}
}

func VerifyPhone(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			UserID string `json:"user_id"`
			OTP    string `json:"otp"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonError(w, "Invalid request", http.StatusBadRequest)
			return
		}

		var otpID string
		err := db.QueryRow(`
			SELECT id FROM otp_tokens
			WHERE user_id = ? AND type = 'phone' AND otp = ? AND used = FALSE AND expires_at > NOW()
			ORDER BY created_at DESC LIMIT 1`,
			req.UserID, req.OTP,
		).Scan(&otpID)
		if err != nil {
			jsonError(w, "Invalid or expired code", http.StatusBadRequest)
			return
		}

		db.Exec("UPDATE otp_tokens SET used = TRUE WHERE id = ?", otpID)
		db.Exec("UPDATE users SET phone_verified = TRUE WHERE id = ?", req.UserID)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]bool{"verified": true})
	}
}

func ForgotPassword(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Email  string `json:"email"`
			Domain string `json:"domain"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonError(w, "Invalid request", http.StatusBadRequest)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		reply := map[string]string{"message": "If that account exists, a reset link has been sent to the email."}

		var userID, email string
		var err error
		if req.Domain == "" {
			err = db.QueryRow(
				"SELECT id, email FROM users WHERE email = ? AND role = 'superadmin'",
				req.Email,
			).Scan(&userID, &email)
		} else {
			err = db.QueryRow(`
				SELECT u.id, u.email FROM users u
				JOIN tenants t ON t.id = u.tenant_id
				WHERE u.email = ? AND t.domain = ?`,
				req.Email, req.Domain,
			).Scan(&userID, &email)
		}

		if err != nil {
			json.NewEncoder(w).Encode(reply)
			return
		}

		token := generateToken()
		tokenID := uuid.New().String()
		db.Exec(
			`INSERT INTO password_reset_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))`,
			tokenID, userID, token,
		)

		appURL := os.Getenv("APP_URL")
		if appURL == "" {
			appURL = "https://localhost"
		}
		resetURL := fmt.Sprintf("%s/reset-password?token=%s", appURL, token)
		sendEmail(email, "Reset your Mogala password", passwordResetTemplate(resetURL))

		json.NewEncoder(w).Encode(reply)
	}
}

func ResetPassword(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Token    string `json:"token"`
			Password string `json:"password"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonError(w, "Invalid request", http.StatusBadRequest)
			return
		}
		if len(req.Password) < 8 {
			jsonError(w, "Password must be at least 8 characters", http.StatusBadRequest)
			return
		}

		var tokenID, userID string
		err := db.QueryRow(`
			SELECT id, user_id FROM password_reset_tokens
			WHERE token = ? AND used = FALSE AND expires_at > NOW()`,
			req.Token,
		).Scan(&tokenID, &userID)
		if err != nil {
			jsonError(w, "Invalid or expired reset link", http.StatusBadRequest)
			return
		}

		hash, _ := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
		db.Exec("UPDATE users SET password_hash = ?, email_verified = TRUE WHERE id = ?", string(hash), userID)
		db.Exec("UPDATE password_reset_tokens SET used = TRUE WHERE id = ?", tokenID)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"message": "Password updated successfully"})
	}
}

func InviteInfo(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := r.URL.Query().Get("token")
		w.Header().Set("Content-Type", "application/json")

		var userID, email, firstName, lastName, role, companyName string
		err := db.QueryRow(`
			SELECT u.id, u.email, u.first_name, u.last_name, u.role, t.name
			FROM password_reset_tokens prt
			JOIN users u ON u.id = prt.user_id
			JOIN tenants t ON t.id = u.tenant_id
			WHERE prt.token = ? AND prt.used = FALSE AND prt.expires_at > NOW()`,
			token,
		).Scan(&userID, &email, &firstName, &lastName, &role, &companyName)

		if err != nil {
			json.NewEncoder(w).Encode(map[string]interface{}{"valid": false, "error": "Invalid or expired invite link"})
			return
		}
		json.NewEncoder(w).Encode(map[string]interface{}{
			"valid":        true,
			"email":        email,
			"first_name":   firstName,
			"last_name":    lastName,
			"role":         role,
			"company_name": companyName,
		})
	}
}

func AcceptInvite(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Token     string `json:"token"`
			Password  string `json:"password"`
			FirstName string `json:"first_name"`
			LastName  string `json:"last_name"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonError(w, "Invalid request", http.StatusBadRequest)
			return
		}
		if len(req.Password) < 8 {
			jsonError(w, "Password must be at least 8 characters", http.StatusBadRequest)
			return
		}

		var tokenID, userID string
		err := db.QueryRow(`
			SELECT id, user_id FROM password_reset_tokens
			WHERE token = ? AND used = FALSE AND expires_at > NOW()`,
			req.Token,
		).Scan(&tokenID, &userID)
		if err != nil {
			jsonError(w, "Invalid or expired invite link", http.StatusBadRequest)
			return
		}

		hash, _ := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
		db.Exec(`UPDATE users SET password_hash = ?, email_verified = TRUE,
			first_name = CASE WHEN ? != '' THEN ? ELSE first_name END,
			last_name  = CASE WHEN ? != '' THEN ? ELSE last_name  END
			WHERE id = ?`,
			string(hash), req.FirstName, req.FirstName, req.LastName, req.LastName, userID)
		db.Exec("UPDATE password_reset_tokens SET used = TRUE WHERE id = ?", tokenID)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"message": "Account activated. You can now sign in."})
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
