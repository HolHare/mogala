package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"github.com/google/uuid"
	"mogala-backend/middleware"
)

func GetAgentStatus(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("claims").(*middleware.Claims)

		var status, reason, changedAt string
		err := db.QueryRow(`
			SELECT status, COALESCE(reason,''), COALESCE(changed_at,'')
			FROM agent_statuses WHERE user_id = ? AND tenant_id = ?`,
			claims.UserID, claims.TenantID).Scan(&status, &reason, &changedAt)

		if err == sql.ErrNoRows {
			status = "offline"
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"status": status, "reason": reason, "changed_at": changedAt,
		})
	}
}

func UpdateAgentStatus(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("claims").(*middleware.Claims)

		var req struct {
			Status string `json:"status"`
			Reason string `json:"reason"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonError(w, "Invalid request", http.StatusBadRequest)
			return
		}

		validStatuses := map[string]bool{
			"available": true, "on_call": true, "paused": true,
			"break": true, "lunch": true, "tea": true, "offline": true,
		}
		if !validStatuses[req.Status] {
			jsonError(w, "Invalid status", http.StatusBadRequest)
			return
		}

		_, err := db.Exec(`
			INSERT INTO agent_statuses (user_id, tenant_id, status, reason, changed_at)
			VALUES (?, ?, ?, ?, NOW())
			ON DUPLICATE KEY UPDATE status = VALUES(status), reason = VALUES(reason), changed_at = NOW()`,
			claims.UserID, claims.TenantID, req.Status, req.Reason)
		if err != nil {
			jsonError(w, "Failed to update status", http.StatusInternalServerError)
			return
		}

		if req.Status == "offline" {
			db.Exec(`UPDATE agent_shifts SET logout_at = NOW()
				WHERE user_id = ? AND tenant_id = ? AND logout_at IS NULL`,
				claims.UserID, claims.TenantID)
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"message": "Status updated"})
	}
}

func GetAgentStatuses(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("claims").(*middleware.Claims)
		if claims.Role != "supervisor" && claims.Role != "admin" && claims.Role != "superadmin" {
			jsonError(w, "Forbidden", http.StatusForbidden)
			return
		}

		rows, err := db.Query(`
			SELECT u.id, u.first_name, u.last_name, u.email,
				COALESCE(a.status, 'offline') AS status,
				COALESCE(a.reason, '') AS reason,
				COALESCE(a.changed_at, NOW()) AS changed_at
			FROM users u
			LEFT JOIN agent_statuses a ON a.user_id = u.id AND a.tenant_id = u.tenant_id
			WHERE u.tenant_id = ? AND u.role = 'agent'
			ORDER BY u.first_name, u.last_name`, claims.TenantID)
		if err != nil {
			jsonError(w, "Failed to fetch agents", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		type AgentStatus struct {
			UserID    string `json:"user_id"`
			FirstName string `json:"first_name"`
			LastName  string `json:"last_name"`
			Email     string `json:"email"`
			Status    string `json:"status"`
			Reason    string `json:"reason"`
			ChangedAt string `json:"changed_at"`
		}

		var agents []AgentStatus
		for rows.Next() {
			var a AgentStatus
			rows.Scan(&a.UserID, &a.FirstName, &a.LastName, &a.Email, &a.Status, &a.Reason, &a.ChangedAt)
			agents = append(agents, a)
		}
		if agents == nil {
			agents = []AgentStatus{}
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(agents)
	}
}

func GetDispositionCodes(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("claims").(*middleware.Claims)

		rows, err := db.Query(`
			SELECT id, code, label, category, active
			FROM disposition_codes WHERE tenant_id = ?
			ORDER BY category, label`, claims.TenantID)
		if err != nil {
			jsonError(w, "Failed to fetch disposition codes", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		type Code struct {
			ID       string `json:"id"`
			Code     string `json:"code"`
			Label    string `json:"label"`
			Category string `json:"category"`
			Active   bool   `json:"active"`
		}

		var codes []Code
		for rows.Next() {
			var c Code
			rows.Scan(&c.ID, &c.Code, &c.Label, &c.Category, &c.Active)
			codes = append(codes, c)
		}
		if codes == nil {
			codes = []Code{}
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(codes)
	}
}

func CreateDispositionCode(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("claims").(*middleware.Claims)
		if claims.Role != "admin" && claims.Role != "superadmin" {
			jsonError(w, "Forbidden", http.StatusForbidden)
			return
		}

		var req struct {
			Code     string `json:"code"`
			Label    string `json:"label"`
			Category string `json:"category"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonError(w, "Invalid request", http.StatusBadRequest)
			return
		}
		if req.Code == "" || req.Label == "" {
			jsonError(w, "Code and label required", http.StatusBadRequest)
			return
		}

		id := uuid.New().String()
		_, err := db.Exec(`
			INSERT INTO disposition_codes (id, tenant_id, code, label, category, active)
			VALUES (?, ?, ?, ?, ?, TRUE)`,
			id, claims.TenantID, req.Code, req.Label, req.Category)
		if err != nil {
			jsonError(w, "Code already exists", http.StatusConflict)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(map[string]string{"id": id})
	}
}

func UpdateDispositionCode(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("claims").(*middleware.Claims)
		if claims.Role != "admin" && claims.Role != "superadmin" {
			jsonError(w, "Forbidden", http.StatusForbidden)
			return
		}

		id := r.URL.Query().Get("id")
		var req struct {
			Code     string `json:"code"`
			Label    string `json:"label"`
			Category string `json:"category"`
			Active   bool   `json:"active"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonError(w, "Invalid request", http.StatusBadRequest)
			return
		}

		if _, err := db.Exec(`UPDATE disposition_codes SET code=?, label=?, category=?, active=?
			WHERE id=? AND tenant_id=?`,
			req.Code, req.Label, req.Category, req.Active, id, claims.TenantID); err != nil {
			jsonError(w, "Failed to update disposition code", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"message": "Updated"})
	}
}

func DeleteDispositionCode(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("claims").(*middleware.Claims)
		if claims.Role != "admin" && claims.Role != "superadmin" {
			jsonError(w, "Forbidden", http.StatusForbidden)
			return
		}

		id := r.URL.Query().Get("id")
		if id == "" {
			jsonError(w, "id is required", http.StatusBadRequest)
			return
		}
		if _, err := db.Exec("DELETE FROM disposition_codes WHERE id = ? AND tenant_id = ?", id, claims.TenantID); err != nil {
			jsonError(w, "Failed to delete disposition code", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"message": "Deleted"})
	}
}

func SubmitDisposition(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("claims").(*middleware.Claims)

		var req struct {
			DispositionCodeID string `json:"disposition_code_id"`
			Notes             string `json:"notes"`
			CallLogID         *int   `json:"call_log_id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonError(w, "Invalid request", http.StatusBadRequest)
			return
		}
		if req.DispositionCodeID == "" {
			jsonError(w, "disposition_code_id required", http.StatusBadRequest)
			return
		}

		id := uuid.New().String()
		_, err := db.Exec(`
			INSERT INTO call_dispositions (id, call_log_id, agent_id, disposition_code_id, notes)
			VALUES (?, ?, ?, ?, ?)`,
			id, req.CallLogID, claims.UserID, req.DispositionCodeID, req.Notes)
		if err != nil {
			jsonError(w, "Failed to submit disposition", http.StatusInternalServerError)
			return
		}

		// Return agent to available after wrapping up
		db.Exec(`
			INSERT INTO agent_statuses (user_id, tenant_id, status, reason, changed_at)
			VALUES (?, ?, 'available', '', NOW())
			ON DUPLICATE KEY UPDATE status = 'available', reason = '', changed_at = NOW()`,
			claims.UserID, claims.TenantID)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"id": id})
	}
}

func GetShiftSummary(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("claims").(*middleware.Claims)

		var loginAt sql.NullString
		db.QueryRow(`
			SELECT login_at FROM agent_shifts
			WHERE user_id = ? AND tenant_id = ? AND DATE(login_at) = CURDATE()
			ORDER BY login_at DESC LIMIT 1`,
			claims.UserID, claims.TenantID).Scan(&loginAt)

		var callCount, totalDuration int
		db.QueryRow(`
			SELECT COUNT(*), COALESCE(SUM(duration), 0)
			FROM cdr_logs c
			WHERE (c.caller IN (SELECT extension FROM extensions WHERE user_id = ? AND tenant_id = ?)
			    OR c.callee IN (SELECT extension FROM extensions WHERE user_id = ? AND tenant_id = ?))
			AND DATE(COALESCE(c.start_time, c.created_at)) = CURDATE()`,
			claims.UserID, claims.TenantID, claims.UserID, claims.TenantID).
			Scan(&callCount, &totalDuration)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"login_at":       loginAt.String,
			"call_count":     callCount,
			"total_duration": totalDuration,
		})
	}
}
