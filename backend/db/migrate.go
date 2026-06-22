package db

import (
	"database/sql"
	"fmt"
	"log"
)

// addColumnIfMissing is a MySQL-compatible replacement for ADD COLUMN IF NOT EXISTS (MariaDB-only syntax).
func addColumnIfMissing(db *sql.DB, table, column, definition string) {
	var dbName string
	db.QueryRow("SELECT DATABASE()").Scan(&dbName)

	var count int
	db.QueryRow(`SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
		WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
		dbName, table, column).Scan(&count)

	if count == 0 {
		q := fmt.Sprintf("ALTER TABLE %s ADD COLUMN %s %s", table, column, definition)
		if _, err := db.Exec(q); err != nil {
			log.Printf("Migration warning (alter %s.%s): %v", table, column, err)
		} else {
			log.Printf("Migration: added column %s.%s", table, column)
		}
	}
}

func Migrate(db *sql.DB) {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS tenants (
			id CHAR(36) PRIMARY KEY,
			name VARCHAR(255) NOT NULL,
			domain VARCHAR(255) UNIQUE NOT NULL,
			suspended BOOLEAN NOT NULL DEFAULT FALSE,
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
			agent_id CHAR(36) NULL,
			disposition_code_id CHAR(36) NULL,
			started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (tenant_id) REFERENCES tenants(id)
		)`,
		`CREATE TABLE IF NOT EXISTS cdr_logs (
			id INT AUTO_INCREMENT PRIMARY KEY,
			caller VARCHAR(64) NOT NULL DEFAULT '',
			callee VARCHAR(64) NOT NULL DEFAULT '',
			domain VARCHAR(255) NOT NULL DEFAULT '',
			start_time DATETIME,
			end_time DATETIME,
			duration INT NOT NULL DEFAULT 0,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS sip_trunks (
			id CHAR(36) PRIMARY KEY,
			tenant_id CHAR(36) NOT NULL,
			name VARCHAR(100) NOT NULL,
			host VARCHAR(255) NOT NULL,
			port INT NOT NULL DEFAULT 5060,
			username VARCHAR(100),
			password VARCHAR(255),
			prefix VARCHAR(20),
			active BOOLEAN NOT NULL DEFAULT TRUE,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (tenant_id) REFERENCES tenants(id)
		)`,
		`CREATE TABLE IF NOT EXISTS version (
			table_name VARCHAR(32) NOT NULL,
			table_version INT UNSIGNED NOT NULL DEFAULT 0,
			CONSTRAINT ver_name_idx UNIQUE (table_name)
		)`,
		`INSERT IGNORE INTO version (table_name, table_version) VALUES ('location', 9)`,
		`CREATE TABLE IF NOT EXISTS agent_statuses (
			user_id CHAR(36) NOT NULL,
			tenant_id CHAR(36) NOT NULL,
			status ENUM('available','on_call','paused','break','lunch','tea','offline') NOT NULL DEFAULT 'offline',
			reason VARCHAR(255) NOT NULL DEFAULT '',
			changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (user_id, tenant_id),
			FOREIGN KEY (tenant_id) REFERENCES tenants(id)
		)`,
		`CREATE TABLE IF NOT EXISTS disposition_codes (
			id CHAR(36) PRIMARY KEY,
			tenant_id CHAR(36) NOT NULL,
			code VARCHAR(50) NOT NULL,
			label VARCHAR(255) NOT NULL,
			category VARCHAR(100) NOT NULL DEFAULT '',
			active BOOLEAN NOT NULL DEFAULT TRUE,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (tenant_id) REFERENCES tenants(id),
			UNIQUE KEY unique_code_per_tenant (tenant_id, code)
		)`,
		// notes uses VARCHAR so MySQL allows a default value (TEXT does not)
		`CREATE TABLE IF NOT EXISTS call_dispositions (
			id CHAR(36) PRIMARY KEY,
			call_log_id INT NULL,
			agent_id CHAR(36) NOT NULL,
			disposition_code_id CHAR(36) NOT NULL,
			notes VARCHAR(2000) NOT NULL DEFAULT '',
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS agent_shifts (
			id CHAR(36) PRIMARY KEY,
			user_id CHAR(36) NOT NULL,
			tenant_id CHAR(36) NOT NULL,
			login_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			logout_at TIMESTAMP NULL,
			FOREIGN KEY (tenant_id) REFERENCES tenants(id)
		)`,
	}

	locationSQL := "CREATE TABLE IF NOT EXISTS location (" +
		"id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY," +
		"ruid VARCHAR(64) NOT NULL DEFAULT ''," +
		"username VARCHAR(64) NOT NULL DEFAULT ''," +
		"domain VARCHAR(64) DEFAULT NULL," +
		"contact VARCHAR(512) NOT NULL DEFAULT ''," +
		"received VARCHAR(128) DEFAULT NULL," +
		"path VARCHAR(512) DEFAULT NULL," +
		"expires DATETIME NOT NULL DEFAULT '2030-05-28 21:32:15'," +
		"q FLOAT(10,2) NOT NULL DEFAULT 1.00," +
		"callid VARCHAR(255) NOT NULL DEFAULT 'Default-Call-ID'," +
		"cseq INT NOT NULL DEFAULT 1," +
		"last_modified DATETIME NOT NULL DEFAULT '2000-01-01 00:00:01'," +
		"flags INT NOT NULL DEFAULT 0," +
		"cflags INT NOT NULL DEFAULT 0," +
		"user_agent VARCHAR(255) NOT NULL DEFAULT ''," +
		"socket VARCHAR(64) DEFAULT NULL," +
		"methods INT DEFAULT NULL," +
		"instance VARCHAR(255) DEFAULT NULL," +
		"reg_id INT NOT NULL DEFAULT 0," +
		"server_id INT NOT NULL DEFAULT 0," +
		"connection_id INT NOT NULL DEFAULT 0," +
		"keepalive INT NOT NULL DEFAULT 0," +
		"`partition` INT NOT NULL DEFAULT 0" +
		")"

	queries = append(queries, locationSQL)

	for _, q := range queries {
		if _, err := db.Exec(q); err != nil {
			log.Printf("Migration warning: %v", err)
		}
	}

	// KYC / RICA compliance
	db.Exec(`CREATE TABLE IF NOT EXISTS kyc_submissions (
		id CHAR(36) PRIMARY KEY,
		tenant_id CHAR(36) NOT NULL UNIQUE,
		entity_type ENUM('individual','business') NOT NULL DEFAULT 'individual',
		first_name VARCHAR(100) NOT NULL DEFAULT '',
		last_name VARCHAR(100) NOT NULL DEFAULT '',
		id_type ENUM('sa_id','passport','foreign_id') NOT NULL DEFAULT 'sa_id',
		id_number VARCHAR(50) NOT NULL DEFAULT '',
		date_of_birth VARCHAR(20) NOT NULL DEFAULT '',
		nationality VARCHAR(80) NOT NULL DEFAULT 'South African',
		company_name VARCHAR(255) NOT NULL DEFAULT '',
		reg_number VARCHAR(100) NOT NULL DEFAULT '',
		vat_number VARCHAR(50) NOT NULL DEFAULT '',
		auth_rep_name VARCHAR(255) NOT NULL DEFAULT '',
		auth_rep_id VARCHAR(50) NOT NULL DEFAULT '',
		address_street VARCHAR(255) NOT NULL DEFAULT '',
		address_suburb VARCHAR(100) NOT NULL DEFAULT '',
		address_city VARCHAR(100) NOT NULL DEFAULT '',
		address_province VARCHAR(100) NOT NULL DEFAULT '',
		address_postal VARCHAR(10) NOT NULL DEFAULT '',
		address_country VARCHAR(100) NOT NULL DEFAULT 'South Africa',
		status ENUM('draft','pending','approved','rejected') NOT NULL DEFAULT 'draft',
		reviewer_notes VARCHAR(2000) NOT NULL DEFAULT '',
		submitted_at TIMESTAMP NULL,
		reviewed_at TIMESTAMP NULL,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		FOREIGN KEY (tenant_id) REFERENCES tenants(id)
	)`)
	db.Exec(`CREATE TABLE IF NOT EXISTS kyc_documents (
		id CHAR(36) PRIMARY KEY,
		kyc_id CHAR(36) NOT NULL,
		doc_type VARCHAR(50) NOT NULL,
		filename VARCHAR(255) NOT NULL,
		mime_type VARCHAR(50) NOT NULL DEFAULT 'application/octet-stream',
		data MEDIUMTEXT NOT NULL,
		uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (kyc_id) REFERENCES kyc_submissions(id) ON DELETE CASCADE
	)`)

	// Porting requests (superadmin-managed)
	db.Exec(`CREATE TABLE IF NOT EXISTS number_portings (
		id CHAR(36) PRIMARY KEY,
		tenant_id CHAR(36) NOT NULL,
		number VARCHAR(30) NOT NULL,
		from_carrier VARCHAR(100) NOT NULL DEFAULT '',
		status ENUM('pending','in_progress','completed','rejected') NOT NULL DEFAULT 'pending',
		notes VARCHAR(2000) NOT NULL DEFAULT '',
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		FOREIGN KEY (tenant_id) REFERENCES tenants(id)
	)`)

	// Auth tables
	authTables := []string{
		`CREATE TABLE IF NOT EXISTS otp_tokens (
			id CHAR(36) PRIMARY KEY,
			user_id CHAR(36) NOT NULL,
			type ENUM('email','phone') NOT NULL,
			otp CHAR(6) NOT NULL,
			expires_at TIMESTAMP NOT NULL,
			used BOOLEAN NOT NULL DEFAULT FALSE,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		)`,
		`CREATE TABLE IF NOT EXISTS password_reset_tokens (
			id CHAR(36) PRIMARY KEY,
			user_id CHAR(36) NOT NULL,
			token CHAR(64) NOT NULL UNIQUE,
			expires_at TIMESTAMP NOT NULL,
			used BOOLEAN NOT NULL DEFAULT FALSE,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		)`,
	}
	for _, q := range authTables {
		if _, err := db.Exec(q); err != nil {
			log.Printf("Migration warning (auth tables): %v", err)
		}
	}

	// Dial plans + rules
	db.Exec(`CREATE TABLE IF NOT EXISTS dial_plans (
		id CHAR(36) PRIMARY KEY,
		tenant_id CHAR(36) NOT NULL,
		name VARCHAR(100) NOT NULL,
		description VARCHAR(500) NOT NULL DEFAULT '',
		active BOOLEAN NOT NULL DEFAULT TRUE,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (tenant_id) REFERENCES tenants(id),
		UNIQUE KEY unique_plan_name_per_tenant (tenant_id, name)
	)`)
	db.Exec(`CREATE TABLE IF NOT EXISTS dial_plan_rules (
		id CHAR(36) PRIMARY KEY,
		dial_plan_id CHAR(36) NOT NULL,
		tenant_id CHAR(36) NOT NULL,
		name VARCHAR(100) NOT NULL DEFAULT '',
		pattern VARCHAR(50) NOT NULL,
		trunk_id CHAR(36) NOT NULL,
		priority INT NOT NULL DEFAULT 10,
		strip_digits INT NOT NULL DEFAULT 0,
		prepend VARCHAR(20) NOT NULL DEFAULT '',
		active BOOLEAN NOT NULL DEFAULT TRUE,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (dial_plan_id) REFERENCES dial_plans(id) ON DELETE CASCADE,
		FOREIGN KEY (tenant_id) REFERENCES tenants(id),
		FOREIGN KEY (trunk_id) REFERENCES sip_trunks(id)
	)`)

	// Add columns to existing tables — uses INFORMATION_SCHEMA check (MySQL 8 compatible)
	addColumnIfMissing(db, "tenants", "suspended", "BOOLEAN NOT NULL DEFAULT FALSE")
	addColumnIfMissing(db, "tenants", "kyc_status", "ENUM('unverified','pending','approved','rejected') NOT NULL DEFAULT 'unverified'")
	addColumnIfMissing(db, "call_logs", "agent_id", "CHAR(36) NULL")
	addColumnIfMissing(db, "call_logs", "disposition_code_id", "CHAR(36) NULL")
	addColumnIfMissing(db, "users", "phone", "VARCHAR(20)")
	addColumnIfMissing(db, "users", "email_verified", "BOOLEAN NOT NULL DEFAULT TRUE")
	addColumnIfMissing(db, "users", "phone_verified", "BOOLEAN NOT NULL DEFAULT TRUE")

	log.Println("Migrations applied successfully")
}
