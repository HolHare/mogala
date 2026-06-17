CREATE TABLE IF NOT EXISTS tenants (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255) UNIQUE NOT NULL,
  suspended BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
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
);

CREATE TABLE IF NOT EXISTS extensions (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  user_id CHAR(36),
  extension VARCHAR(20) NOT NULL,
  sip_password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE KEY unique_ext_per_tenant (tenant_id, extension)
);

CREATE TABLE IF NOT EXISTS phone_numbers (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  number VARCHAR(20) NOT NULL UNIQUE,
  assigned_to CHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS call_logs (
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
);

CREATE TABLE IF NOT EXISTS cdr_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  caller VARCHAR(64) NOT NULL DEFAULT '',
  callee VARCHAR(64) NOT NULL DEFAULT '',
  domain VARCHAR(255) NOT NULL DEFAULT '',
  start_time DATETIME,
  end_time DATETIME,
  duration INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sip_trunks (
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
);

-- Phase 2: Call center agent system

CREATE TABLE IF NOT EXISTS agent_statuses (
  user_id CHAR(36) NOT NULL,
  tenant_id CHAR(36) NOT NULL,
  status ENUM('available','on_call','paused','break','lunch','tea','offline') NOT NULL DEFAULT 'offline',
  reason VARCHAR(255) NOT NULL DEFAULT '',
  changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, tenant_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS disposition_codes (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  code VARCHAR(50) NOT NULL,
  label VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  UNIQUE KEY unique_code_per_tenant (tenant_id, code)
);

CREATE TABLE IF NOT EXISTS call_dispositions (
  id CHAR(36) PRIMARY KEY,
  call_log_id INT NULL,
  agent_id CHAR(36) NOT NULL,
  disposition_code_id CHAR(36) NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agent_shifts (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  tenant_id CHAR(36) NOT NULL,
  login_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  logout_at TIMESTAMP NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);
