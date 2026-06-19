package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"mogala-backend/middleware"
)

func GetPortings(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("claims").(*middleware.Claims)
		if !requireSuperAdmin(claims, w) {
			return
		}

		rows, err := db.Query(`
			SELECT p.id, p.tenant_id, t.name, p.number, p.from_carrier,
				p.status, p.notes, p.created_at, p.updated_at
			FROM number_portings p
			JOIN tenants t ON t.id = p.tenant_id
			ORDER BY p.created_at DESC`)
		if err != nil {
			jsonError(w, "Failed to fetch portings", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		type Porting struct {
			ID          string `json:"id"`
			TenantID    string `json:"tenant_id"`
			TenantName  string `json:"tenant_name"`
			Number      string `json:"number"`
			FromCarrier string `json:"from_carrier"`
			Status      string `json:"status"`
			Notes       string `json:"notes"`
			CreatedAt   string `json:"created_at"`
			UpdatedAt   string `json:"updated_at"`
		}

		var portings []Porting
		for rows.Next() {
			var p Porting
			rows.Scan(&p.ID, &p.TenantID, &p.TenantName, &p.Number,
				&p.FromCarrier, &p.Status, &p.Notes, &p.CreatedAt, &p.UpdatedAt)
			portings = append(portings, p)
		}
		if portings == nil {
			portings = []Porting{}
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(portings)
	}
}

func CreatePorting(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("claims").(*middleware.Claims)
		if !requireSuperAdmin(claims, w) {
			return
		}

		var req struct {
			TenantID    string `json:"tenant_id"`
			Number      string `json:"number"`
			FromCarrier string `json:"from_carrier"`
			Notes       string `json:"notes"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonError(w, "Invalid request", http.StatusBadRequest)
			return
		}
		if req.TenantID == "" || req.Number == "" {
			jsonError(w, "tenant_id and number are required", http.StatusBadRequest)
			return
		}

		id := uuid.New().String()
		_, err := db.Exec(`
			INSERT INTO number_portings (id, tenant_id, number, from_carrier, notes)
			VALUES (?, ?, ?, ?, ?)`,
			id, req.TenantID, req.Number, req.FromCarrier, req.Notes)
		if err != nil {
			jsonError(w, "Failed to create porting request", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(map[string]string{"id": id})
	}
}

func UpdatePorting(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("claims").(*middleware.Claims)
		if !requireSuperAdmin(claims, w) {
			return
		}

		id := mux.Vars(r)["id"]
		var req struct {
			Status      string `json:"status"`
			Notes       string `json:"notes"`
			FromCarrier string `json:"from_carrier"`
			Number      string `json:"number"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonError(w, "Invalid request", http.StatusBadRequest)
			return
		}

		_, err := db.Exec(`
			UPDATE number_portings
			SET status=?, notes=?, from_carrier=?, number=?
			WHERE id=?`,
			req.Status, req.Notes, req.FromCarrier, req.Number, id)
		if err != nil {
			jsonError(w, "Failed to update porting request", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"message": "Porting request updated"})
	}
}

func DeletePorting(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("claims").(*middleware.Claims)
		if !requireSuperAdmin(claims, w) {
			return
		}

		id := mux.Vars(r)["id"]
		db.Exec("DELETE FROM number_portings WHERE id=?", id)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"message": "Deleted"})
	}
}
