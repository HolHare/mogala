package db

import (
	"database/sql"
	"log"
)

func Migrate(db *sql.DB) {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS tenants (
			id CHAR(36) PRIMARY KEY,
			name VARCHAR(255) NOT NULL,
			domain VARCHAR(255) UNIQUE NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS users (
			id CHAR(36) PRIMARY KEY,
			tenant_id CHAR(36) NOT NULL,
			email VARCHAR(255) NOT NULL,
			password_hash VARCHAR(255) NOT NULL,
			role ENUM('superadmin','admin','supervisor','agent','billing') NOT NULL DEFAULT 'agent',
			first_name VARCHAR(100),
			last_name VARCHAR(100),
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (tenant_id) REFERENCES tenants(id),
			UNIQUE KEY unique_email_per_tenant (tenant_id, email)
		)`,
		`CREATE TABLE IF NOT EXISTS extensions (
			id CHAR(36) PRIMARY KEY,
			tenant_id CHAR(36) NOT NULL,
			user_id CHAR(36),
			extension VARCHAR(20) NOT NULL,
			sip_password VARCHAR(255) NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (tenant_id) REFERENCES tenants(id),
			FOREIGN KEY (user_id) REFERENCES users(id),
			UNIQUE KEY unique_ext_per_tenant (tenant_id, extension)
		)`,
		`CREATE TABLE IF NOT EXISTS phone_numbers (
			id CHAR(36) PRIMARY KEY,
			tenant_id CHAR(36) NOT NULL,
			number VARCHAR(20) NOT NULL UNIQUE,
			assigned_to CHAR(36),
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (tenant_id) REFERENCES tenants(id)
		)`,
		`CREATE TABLE IF NOT EXISTS call_logs (
			id CHAR(36) PRIMARY KEY,
			tenant_id CHAR(36) NOT NULL,
			caller VARCHAR(50),
			callee VARCHAR(50),
			duration INT DEFAULT 0,
			status ENUM('answered','missed','failed') NOT NULL,
			started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (tenant_id) REFERENCES tenants(id)
		)`,
	}

	for _, q := range queries {
		if _, err := db.Exec(q); err != nil {
			log.Fatalf("Migration failed: %v", err)
		}
	}

	log.Println("Migrations applied successfully")
}
