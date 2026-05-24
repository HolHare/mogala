package handlers

import (
	"database/sql"
	"encoding/json"
	"math/rand"
	"net/http"

	"github.com/google/uuid"
	"mogala-backend/middleware"
)

type CreateExtensionRequest struct {
	Extension string `json:"extension"`
	UserID    string `json:"user_id"`
}

func generateSIPPassword() string {
	chars := "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, 16)
	for i := range b {
		b[i] = chars[rand.Intn(len(chars))]
	}
	return string(b)
}

func GetExtensions(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("claims").(*middleware.Claims)

		rows, err := db.Query(`
			SELECT e.id, e.extension, e.sip_password, e.created_at,
				COALESCE(u.first_name, '') as first_name,
				COALESCE(u.last_name, '') as last_name
			FROM extensions e
			LEFT JOIN users u ON u.id = e.user_id
			WHERE e.tenant_id = ?`, claims.TenantID)
		if err != nil {
			http.Error(w, "Failed to fetch extensions", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		type Extension struct {
			ID          string `json:"id"`
			Extension   string `json:"extension"`
			SIPPassword string `json:"sip_password"`
			CreatedAt   string `json:"created_at"`
			FirstName   string `json:"first_name"`
			LastName    string `json:"last_name"`
		}

		var extensions []Extension
		for rows.Next() {
			var e Extension
			rows.Scan(&e.ID, &e.Extension, &e.SIPPassword, &e.CreatedAt, &e.FirstName, &e.LastName)
			extensions = append(extensions, e)
		}

		if extensions == nil {
			extensions = []Extension{}
		}

		json.NewEncoder(w).Encode(extensions)
	}
}

func CreateExtension(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("claims").(*middleware.Claims)

		var req CreateExtensionRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request", http.StatusBadRequest)
			return
		}

		id := uuid.New().String()
		sipPassword := generateSIPPassword()

		_, err := db.Exec(`
			INSERT INTO extensions (id, tenant_id, user_id, extension, sip_password)
			VALUES (?, ?, ?, ?, ?)`,
			id, claims.TenantID, req.UserID, req.Extension, sipPassword,
		)
		if err != nil {
			http.Error(w, "Extension already exists", http.StatusConflict)
			return
		}

		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(map[string]string{
			"id":           id,
			"extension":    req.Extension,
			"sip_password": sipPassword,
		})
	}
}

func DeleteExtension(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("claims").(*middleware.Claims)
		id := r.URL.Query().Get("id")

		db.Exec("DELETE FROM extensions WHERE id = ? AND tenant_id = ?", id, claims.TenantID)
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"message": "Extension deleted"})
	}
}
