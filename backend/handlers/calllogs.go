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
			SELECT id, caller, callee, duration, status, started_at
			FROM call_logs
			WHERE tenant_id = ?
			ORDER BY started_at DESC
			LIMIT 100`, claims.TenantID)
		if err != nil {
			jsonError(w, "Failed to fetch call logs", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		type CallLog struct {
			ID        string `json:"id"`
			Caller    string `json:"caller"`
			Callee    string `json:"callee"`
			Duration  int    `json:"duration"`
			Status    string `json:"status"`
			StartedAt string `json:"started_at"`
		}

		var logs []CallLog
		for rows.Next() {
			var l CallLog
			rows.Scan(&l.ID, &l.Caller, &l.Callee, &l.Duration, &l.Status, &l.StartedAt)
			logs = append(logs, l)
		}

		if logs == nil {
			logs = []CallLog{}
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(logs)
	}
}
