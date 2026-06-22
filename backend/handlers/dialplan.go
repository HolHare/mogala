package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"mogala-backend/middleware"
)

// ── Dial Plans ────────────────────────────────────────────────────────────────

func GetDialPlans(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("claims").(*middleware.Claims)

		type DialPlan struct {
			ID          string `json:"id"`
			Name        string `json:"name"`
			Description string `json:"description"`
			Active      bool   `json:"active"`
			CreatedAt   string `json:"created_at"`
			RuleCount   int    `json:"rule_count"`
		}

		rows, err := db.Query(`
			SELECT dp.id, dp.name, dp.description, dp.active, dp.created_at,
				COUNT(dr.id) as rule_count
			FROM dial_plans dp
			LEFT JOIN dial_plan_rules dr ON dr.dial_plan_id = dp.id AND dr.active = TRUE
			WHERE dp.tenant_id = ?
			GROUP BY dp.id
			ORDER BY dp.name`, claims.TenantID)
		if err != nil {
			jsonError(w, "Failed to fetch dial plans", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		var plans []DialPlan
		for rows.Next() {
			var p DialPlan
			rows.Scan(&p.ID, &p.Name, &p.Description, &p.Active, &p.CreatedAt, &p.RuleCount)
			plans = append(plans, p)
		}
		if plans == nil {
			plans = []DialPlan{}
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(plans)
	}
}

func CreateDialPlan(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("claims").(*middleware.Claims)

		var req struct {
			Name        string `json:"name"`
			Description string `json:"description"`
			Active      *bool  `json:"active"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Name == "" {
			jsonError(w, "Name is required", http.StatusBadRequest)
			return
		}

		active := true
		if req.Active != nil {
			active = *req.Active
		}

		id := uuid.New().String()
		_, err := db.Exec(`INSERT INTO dial_plans (id, tenant_id, name, description, active) VALUES (?, ?, ?, ?, ?)`,
			id, claims.TenantID, req.Name, req.Description, active)
		if err != nil {
			jsonError(w, "Failed to create dial plan", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(map[string]interface{}{"id": id, "name": req.Name, "active": active})
	}
}

func UpdateDialPlan(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("claims").(*middleware.Claims)
		id := mux.Vars(r)["id"]

		var req struct {
			Name        string `json:"name"`
			Description string `json:"description"`
			Active      *bool  `json:"active"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonError(w, "Invalid request", http.StatusBadRequest)
			return
		}

		res, err := db.Exec(`UPDATE dial_plans SET name=?, description=?, active=? WHERE id=? AND tenant_id=?`,
			req.Name, req.Description, req.Active, id, claims.TenantID)
		if err != nil {
			jsonError(w, "Failed to update dial plan", http.StatusInternalServerError)
			return
		}
		n, _ := res.RowsAffected()
		if n == 0 {
			jsonError(w, "Dial plan not found", http.StatusNotFound)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"message": "Updated"})
	}
}

func DeleteDialPlan(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("claims").(*middleware.Claims)
		id := mux.Vars(r)["id"]

		db.Exec(`DELETE FROM dial_plan_rules WHERE dial_plan_id = ? AND tenant_id = ?`, id, claims.TenantID)
		db.Exec(`DELETE FROM dial_plans WHERE id = ? AND tenant_id = ?`, id, claims.TenantID)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"message": "Deleted"})
	}
}

// ── Dial Plan Rules ───────────────────────────────────────────────────────────

func GetDialPlanRules(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("claims").(*middleware.Claims)
		planID := mux.Vars(r)["id"]

		type Rule struct {
			ID          string `json:"id"`
			DialPlanID  string `json:"dial_plan_id"`
			Name        string `json:"name"`
			Pattern     string `json:"pattern"`
			TrunkID     string `json:"trunk_id"`
			TrunkName   string `json:"trunk_name"`
			Priority    int    `json:"priority"`
			StripDigits int    `json:"strip_digits"`
			Prepend     string `json:"prepend"`
			Active      bool   `json:"active"`
			CreatedAt   string `json:"created_at"`
		}

		rows, err := db.Query(`
			SELECT dr.id, dr.dial_plan_id, dr.name, dr.pattern, dr.trunk_id,
				COALESCE(st.name, '') as trunk_name,
				dr.priority, dr.strip_digits, dr.prepend, dr.active, dr.created_at
			FROM dial_plan_rules dr
			LEFT JOIN sip_trunks st ON st.id = dr.trunk_id
			WHERE dr.dial_plan_id = ? AND dr.tenant_id = ?
			ORDER BY dr.priority ASC, dr.created_at ASC`,
			planID, claims.TenantID)
		if err != nil {
			jsonError(w, "Failed to fetch rules", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		var rules []Rule
		for rows.Next() {
			var rule Rule
			rows.Scan(&rule.ID, &rule.DialPlanID, &rule.Name, &rule.Pattern,
				&rule.TrunkID, &rule.TrunkName, &rule.Priority, &rule.StripDigits,
				&rule.Prepend, &rule.Active, &rule.CreatedAt)
			rules = append(rules, rule)
		}
		if rules == nil {
			rules = []Rule{}
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(rules)
	}
}

func CreateDialPlanRule(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("claims").(*middleware.Claims)
		planID := mux.Vars(r)["id"]

		// Ensure plan belongs to tenant
		var count int
		db.QueryRow(`SELECT COUNT(*) FROM dial_plans WHERE id=? AND tenant_id=?`, planID, claims.TenantID).Scan(&count)
		if count == 0 {
			jsonError(w, "Dial plan not found", http.StatusNotFound)
			return
		}

		var req struct {
			Name        string `json:"name"`
			Pattern     string `json:"pattern"`
			TrunkID     string `json:"trunk_id"`
			Priority    int    `json:"priority"`
			StripDigits int    `json:"strip_digits"`
			Prepend     string `json:"prepend"`
			Active      *bool  `json:"active"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Pattern == "" || req.TrunkID == "" {
			jsonError(w, "Pattern and trunk_id are required", http.StatusBadRequest)
			return
		}

		active := true
		if req.Active != nil {
			active = *req.Active
		}

		id := uuid.New().String()
		_, err := db.Exec(`
			INSERT INTO dial_plan_rules (id, dial_plan_id, tenant_id, name, pattern, trunk_id, priority, strip_digits, prepend, active)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			id, planID, claims.TenantID, req.Name, req.Pattern, req.TrunkID,
			req.Priority, req.StripDigits, req.Prepend, active)
		if err != nil {
			jsonError(w, "Failed to create rule", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(map[string]string{"id": id})
	}
}

func UpdateDialPlanRule(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("claims").(*middleware.Claims)
		ruleID := mux.Vars(r)["ruleId"]

		var req struct {
			Name        string `json:"name"`
			Pattern     string `json:"pattern"`
			TrunkID     string `json:"trunk_id"`
			Priority    int    `json:"priority"`
			StripDigits int    `json:"strip_digits"`
			Prepend     string `json:"prepend"`
			Active      *bool  `json:"active"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonError(w, "Invalid request", http.StatusBadRequest)
			return
		}

		res, err := db.Exec(`
			UPDATE dial_plan_rules SET name=?, pattern=?, trunk_id=?, priority=?, strip_digits=?, prepend=?, active=?
			WHERE id=? AND tenant_id=?`,
			req.Name, req.Pattern, req.TrunkID, req.Priority, req.StripDigits, req.Prepend, req.Active,
			ruleID, claims.TenantID)
		if err != nil {
			jsonError(w, "Failed to update rule", http.StatusInternalServerError)
			return
		}
		n, _ := res.RowsAffected()
		if n == 0 {
			jsonError(w, "Rule not found", http.StatusNotFound)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"message": "Updated"})
	}
}

func DeleteDialPlanRule(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("claims").(*middleware.Claims)
		ruleID := mux.Vars(r)["ruleId"]

		db.Exec(`DELETE FROM dial_plan_rules WHERE id=? AND tenant_id=?`, ruleID, claims.TenantID)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"message": "Deleted"})
	}
}

// GetDialPlanForOutbound is an internal endpoint called by Kamailio (no JWT)
// to resolve which trunk + transformed number to use for an outbound call.
// Query params: tenant_id, number
// Returns: { trunk_host, trunk_port, trunk_user, trunk_pass, number }
func GetDialPlanForOutbound(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Only accept from localhost (Kamailio is co-located)
		remoteHost := r.RemoteAddr
		if len(remoteHost) > 9 && remoteHost[:9] != "127.0.0.1" &&
			remoteHost[:7] != "[::1]:" && remoteHost[:3] != "::1" {
			// allow docker bridge range 172.x.x.x too
			if len(remoteHost) < 3 || remoteHost[:3] != "172" {
				http.Error(w, "Forbidden", http.StatusForbidden)
				return
			}
		}

		tenantID := r.URL.Query().Get("tenant_id")
		number := r.URL.Query().Get("number")
		if tenantID == "" || number == "" {
			http.Error(w, "tenant_id and number required", http.StatusBadRequest)
			return
		}

		// Walk active rules for this tenant sorted by priority, match by prefix
		type Row struct {
			Pattern     string
			TrunkHost   string
			TrunkPort   int
			TrunkUser   sql.NullString
			TrunkPass   sql.NullString
			StripDigits int
			Prepend     string
		}

		rows, err := db.Query(`
			SELECT dr.pattern, st.host, st.port,
				st.username, st.password,
				dr.strip_digits, dr.prepend
			FROM dial_plan_rules dr
			JOIN dial_plans dp ON dp.id = dr.dial_plan_id
			JOIN sip_trunks st ON st.id = dr.trunk_id
			WHERE dr.tenant_id = ? AND dr.active = TRUE AND dp.active = TRUE AND st.active = TRUE
			ORDER BY dr.priority ASC`,
			tenantID)
		if err != nil {
			http.Error(w, "DB error", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		for rows.Next() {
			var row Row
			rows.Scan(&row.Pattern, &row.TrunkHost, &row.TrunkPort,
				&row.TrunkUser, &row.TrunkPass, &row.StripDigits, &row.Prepend)

			if matchPrefix(number, row.Pattern) {
				// Apply transformation
				transformed := number
				if row.StripDigits > 0 && len(transformed) > row.StripDigits {
					transformed = transformed[row.StripDigits:]
				}
				transformed = row.Prepend + transformed

				resp := map[string]interface{}{
					"trunk_host": row.TrunkHost,
					"trunk_port": row.TrunkPort,
					"trunk_user": row.TrunkUser.String,
					"trunk_pass": row.TrunkPass.String,
					"number":     transformed,
				}
				w.Header().Set("Content-Type", "application/json")
				json.NewEncoder(w).Encode(resp)
				return
			}
		}

		// No rule matched
		http.Error(w, "No route", http.StatusNotFound)
	}
}

// matchPrefix returns true if number starts with pattern.
// Pattern "+" means match everything.
func matchPrefix(number, pattern string) bool {
	if pattern == "+" || pattern == "*" || pattern == "" {
		return true
	}
	if len(number) < len(pattern) {
		return false
	}
	return number[:len(pattern)] == pattern
}
