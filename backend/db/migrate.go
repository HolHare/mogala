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
		// Phase 2: call center agent tables (after tenants/users are guaranteed to exist)
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
		`CREATE TABLE IF NOT EXISTS call_dispositions (
			id CHAR(36) PRIMARY KEY,
			call_log_id INT NULL,
			agent_id CHAR(36) NOT NULL,
			disposition_code_id CHAR(36) NOT NULL,
			notes TEXT NOT NULL DEFAULT '',
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

	// New tables for auth features
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

	// ALTER TABLE for existing deployments that already have these tables without the new columns
	alterQueries := []string{
		`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS suspended BOOLEAN NOT NULL DEFAULT FALSE`,
		`ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS agent_id CHAR(36) NULL`,
		`ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS disposition_code_id CHAR(36) NULL`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20)`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT TRUE`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT TRUE`,
	}
	for _, q := range alterQueries {
		if _, err := db.Exec(q); err != nil {
			log.Printf("Migration warning (alter): %v", err)
		}
	}

	log.Println("Migrations applied successfully")
}
