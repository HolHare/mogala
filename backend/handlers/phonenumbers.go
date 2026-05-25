package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"github.com/google/uuid"
	"mogala-backend/middleware"
)

type PhoneNumberRequest struct {
	Number     string `json:"number"`
	AssignedTo string `json:"assigned_to"`
}

func GetPhoneNumbers(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("claims").(*middleware.Claims)

		rows, err := db.Query(`
			SELECT pn.id, pn.number, COALESCE(pn.assigned_to, ''), created_at,
				COALESCE(u.first_name, '') as first_name,
				COALESCE(u.last_name, '') as last_name
			FROM phone_numbers pn
			LEFT JOIN users u ON u.id = pn.assigned_to
			WHERE pn.tenant_id = ?
			ORDER BY pn.created_at DESC`, claims.TenantID)
		if err != nil {
			jsonError(w, "Failed to fetch phone numbers", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		type PhoneNumber struct {
			ID         string `json:"id"`
			Number     string `json:"number"`
			AssignedTo string `json:"assigned_to"`
			CreatedAt  string `json:"created_at"`
			FirstName  string `json:"first_name"`
			LastName   string `json:"last_name"`
		}

		var numbers []PhoneNumber
		for rows.Next() {
			var pn PhoneNumber
			rows.Scan(&pn.ID, &pn.Number, &pn.AssignedTo, &pn.CreatedAt, &pn.FirstName, &pn.LastName)
			numbers = append(numbers, pn)
		}

		if numbers == nil {
			numbers = []PhoneNumber{}
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(numbers)
	}
}

func CreatePhoneNumber(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("claims").(*middleware.Claims)
		if claims.Role != "admin" && claims.Role != "superadmin" {
			jsonError(w, "Forbidden", http.StatusForbidden)
			return
		}

		var req PhoneNumberRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonError(w, "Invalid request", http.StatusBadRequest)
			return
		}

		if req.Number == "" {
			jsonError(w, "Phone number is required", http.StatusBadRequest)
			return
		}

		id := uuid.New().String()
		var assignedTo interface{}
		if req.AssignedTo != "" {
			assignedTo = req.AssignedTo
		}

		_, err := db.Exec(`
			INSERT INTO phone_numbers (id, tenant_id, number, assigned_to)
			VALUES (?, ?, ?, ?)`,
			id, claims.TenantID, req.Number, assignedTo)
		if err != nil {
			jsonError(w, "Number already exists", http.StatusConflict)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(map[string]string{"id": id, "number": req.Number})
	}
}

func UpdatePhoneNumber(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("claims").(*middleware.Claims)
		if claims.Role != "admin" && claims.Role != "superadmin" {
			jsonError(w, "Forbidden", http.StatusForbidden)
			return
		}

		id := r.URL.Query().Get("id")
		var req PhoneNumberRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonError(w, "Invalid request", http.StatusBadRequest)
			return
		}

		var assignedTo interface{}
		if req.AssignedTo != "" {
			assignedTo = req.AssignedTo
		}

		db.Exec("UPDATE phone_numbers SET assigned_to=? WHERE id=? AND tenant_id=?",
			assignedTo, id, claims.TenantID)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"message": "Updated"})
	}
}

func DeletePhoneNumber(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("claims").(*middleware.Claims)
		if claims.Role != "admin" && claims.Role != "superadmin" {
			jsonError(w, "Forbidden", http.StatusForbidden)
			return
		}

		id := r.URL.Query().Get("id")
		db.Exec("DELETE FROM phone_numbers WHERE id=? AND tenant_id=?", id, claims.TenantID)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"message": "Deleted"})
	}
}

func GetPhoneNumberStats(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("claims").(*middleware.Claims)

		var total, assigned int
		db.QueryRow("SELECT COUNT(*) FROM phone_numbers WHERE tenant_id=?", claims.TenantID).Scan(&total)
		db.QueryRow("SELECT COUNT(*) FROM phone_numbers WHERE tenant_id=? AND assigned_to IS NOT NULL", claims.TenantID).Scan(&assigned)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]int{"total": total, "assigned": assigned})
	}
}
