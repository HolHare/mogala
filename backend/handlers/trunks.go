package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"github.com/google/uuid"
	"mogala-backend/middleware"
)

type TrunkRequest struct {
	Name     string `json:"name"`
	Host     string `json:"host"`
	Port     int    `json:"port"`
	Username string `json:"username"`
	Password string `json:"password"`
	Prefix   string `json:"prefix"`
	Active   bool   `json:"active"`
}

func GetTrunks(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("claims").(*middleware.Claims)
		if claims.Role != "admin" && claims.Role != "superadmin" {
			jsonError(w, "Forbidden", http.StatusForbidden)
			return
		}

		rows, err := db.Query(`
			SELECT id, name, host, port, COALESCE(username,''), COALESCE(prefix,''), active, created_at
			FROM sip_trunks
			WHERE tenant_id = ?
			ORDER BY created_at DESC`, claims.TenantID)
		if err != nil {
			jsonError(w, "Failed to fetch trunks", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		type Trunk struct {
			ID        string `json:"id"`
			Name      string `json:"name"`
			Host      string `json:"host"`
			Port      int    `json:"port"`
			Username  string `json:"username"`
			Prefix    string `json:"prefix"`
			Active    bool   `json:"active"`
			CreatedAt string `json:"created_at"`
		}

		var trunks []Trunk
		for rows.Next() {
			var t Trunk
			rows.Scan(&t.ID, &t.Name, &t.Host, &t.Port, &t.Username, &t.Prefix, &t.Active, &t.CreatedAt)
			trunks = append(trunks, t)
		}

		if trunks == nil {
			trunks = []Trunk{}
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(trunks)
	}
}

func CreateTrunk(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("claims").(*middleware.Claims)
		if claims.Role != "admin" && claims.Role != "superadmin" {
			jsonError(w, "Forbidden", http.StatusForbidden)
			return
		}

		var req TrunkRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonError(w, "Invalid request", http.StatusBadRequest)
			return
		}

		if req.Name == "" || req.Host == "" {
			jsonError(w, "Name and host required", http.StatusBadRequest)
			return
		}
		if req.Port == 0 {
			req.Port = 5060
		}

		id := uuid.New().String()
		_, err := db.Exec(`
			INSERT INTO sip_trunks (id, tenant_id, name, host, port, username, password, prefix, active)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			id, claims.TenantID, req.Name, req.Host, req.Port,
			nullStr(req.Username), nullStr(req.Password), nullStr(req.Prefix), req.Active)
		if err != nil {
			jsonError(w, "Failed to create trunk", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(map[string]string{"id": id, "name": req.Name})
	}
}

func UpdateTrunk(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("claims").(*middleware.Claims)
		if claims.Role != "admin" && claims.Role != "superadmin" {
			jsonError(w, "Forbidden", http.StatusForbidden)
			return
		}

		id := r.URL.Query().Get("id")
		var req TrunkRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonError(w, "Invalid request", http.StatusBadRequest)
			return
		}
		if req.Port == 0 {
			req.Port = 5060
		}

		db.Exec(`UPDATE sip_trunks SET name=?, host=?, port=?, username=?, password=?, prefix=?, active=?
			WHERE id=? AND tenant_id=?`,
			req.Name, req.Host, req.Port, nullStr(req.Username), nullStr(req.Password),
			nullStr(req.Prefix), req.Active, id, claims.TenantID)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"message": "Updated"})
	}
}

func DeleteTrunk(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("claims").(*middleware.Claims)
		if claims.Role != "admin" && claims.Role != "superadmin" {
			jsonError(w, "Forbidden", http.StatusForbidden)
			return
		}

		id := r.URL.Query().Get("id")
		db.Exec("DELETE FROM sip_trunks WHERE id=? AND tenant_id=?", id, claims.TenantID)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"message": "Deleted"})
	}
}

func nullStr(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}
