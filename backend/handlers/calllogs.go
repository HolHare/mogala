package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"mogala-backend/middleware"
)

func GetCallLogs(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("claims").(*middleware.Claims)

		rows, err := db.Query(`
			SELECT c.id, c.caller, c.callee, c.duration,
				COALESCE(c.start_time, c.created_at) as started_at
			FROM cdr_logs c
			WHERE c.caller IN (SELECT extension FROM extensions WHERE tenant_id = ?)
			   OR c.callee IN (SELECT extension FROM extensions WHERE tenant_id = ?)
			ORDER BY COALESCE(c.start_time, c.created_at) DESC
			LIMIT 100`, claims.TenantID, claims.TenantID)
		if err != nil {
			jsonError(w, "Failed to fetch call logs", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		type CallLog struct {
			ID        int    `json:"id"`
			Caller    string `json:"caller"`
			Callee    string `json:"callee"`
			Duration  int    `json:"duration"`
			Status    string `json:"status"`
			StartedAt string `json:"started_at"`
		}

		var logs []CallLog
		for rows.Next() {
			var l CallLog
			rows.Scan(&l.ID, &l.Caller, &l.Callee, &l.Duration, &l.StartedAt)
			l.Status = "answered"
			logs = append(logs, l)
		}

		if logs == nil {
			logs = []CallLog{}
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(logs)
	}
}
