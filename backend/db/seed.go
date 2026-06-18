package db

import (
	"database/sql"
	"log"
	"os"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

func SeedSuperAdmin(db *sql.DB) {
	email := os.Getenv("SUPERADMIN_EMAIL")
	password := os.Getenv("SUPERADMIN_PASSWORD")
	if email == "" || password == "" {
		log.Println("SUPERADMIN_EMAIL/PASSWORD not set, skipping superadmin seed")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	if err != nil {
		log.Printf("Failed to hash superadmin password: %v", err)
		return
	}

	var userID string
	err = db.QueryRow("SELECT id FROM users WHERE email = ? AND role = 'superadmin'", email).Scan(&userID)

	if err == sql.ErrNoRows {
		tenantID := uuid.New().String()
		db.Exec("INSERT IGNORE INTO tenants (id, name, domain) VALUES (?, 'System', 'system')", tenantID)
		db.QueryRow("SELECT id FROM tenants WHERE domain = 'system'").Scan(&tenantID)

		userID = uuid.New().String()
		_, err = db.Exec(
			`INSERT INTO users (id, tenant_id, email, password_hash, role, first_name, last_name, email_verified, phone_verified)
			 VALUES (?, ?, ?, ?, 'superadmin', 'Super', 'Admin', TRUE, TRUE)`,
			userID, tenantID, email, string(hash),
		)
		if err != nil {
			log.Printf("Failed to create superadmin: %v", err)
			return
		}
		log.Printf("Superadmin created: %s", email)
	} else if err == nil {
		_, err = db.Exec(
			"UPDATE users SET password_hash = ?, email_verified = TRUE, phone_verified = TRUE WHERE id = ?",
			string(hash), userID,
		)
		if err != nil {
			log.Printf("Failed to update superadmin password: %v", err)
			return
		}
		log.Printf("Superadmin password refreshed: %s", email)
	}
}
