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

	var count int
	db.QueryRow("SELECT COUNT(*) FROM users WHERE role = 'superadmin'").Scan(&count)
	if count > 0 {
		return
	}

	// Ensure system tenant exists
	tenantID := uuid.New().String()
	db.Exec("INSERT IGNORE INTO tenants (id, name, domain) VALUES (?, 'System', 'system')", tenantID)
	db.QueryRow("SELECT id FROM tenants WHERE domain = 'system'").Scan(&tenantID)

	hash, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	if err != nil {
		log.Printf("Failed to hash superadmin password: %v", err)
		return
	}

	userID := uuid.New().String()
	_, err = db.Exec(
		`INSERT INTO users (id, tenant_id, email, password_hash, role, first_name, last_name)
		 VALUES (?, ?, ?, ?, 'superadmin', 'Super', 'Admin')`,
		userID, tenantID, email, string(hash),
	)
	if err != nil {
		log.Printf("Failed to create superadmin: %v", err)
		return
	}
	log.Printf("Superadmin created: %s", email)
}
