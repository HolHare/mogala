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

	log.Println("Migrations applied successfully")
}
