package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"mogala-backend/middleware"
)

type KYCData struct {
	ID             string  `json:"id"`
	TenantID       string  `json:"tenant_id"`
	EntityType     string  `json:"entity_type"`
	FirstName      string  `json:"first_name"`
	LastName       string  `json:"last_name"`
	IDType         string  `json:"id_type"`
	IDNumber       string  `json:"id_number"`
	DateOfBirth    string  `json:"date_of_birth"`
	Nationality    string  `json:"nationality"`
	CompanyName    string  `json:"company_name"`
	RegNumber      string  `json:"reg_number"`
	VATNumber      string  `json:"vat_number"`
	AuthRepName    string  `json:"auth_rep_name"`
	AuthRepID      string  `json:"auth_rep_id"`
	AddressStreet  string  `json:"address_street"`
	AddressSuburb  string  `json:"address_suburb"`
	AddressCity    string  `json:"address_city"`
	AddressProvince string `json:"address_province"`
	AddressPostal  string  `json:"address_postal"`
	AddressCountry string  `json:"address_country"`
	Status         string  `json:"status"`
	ReviewerNotes  string  `json:"reviewer_notes"`
	SubmittedAt    *string `json:"submitted_at"`
	ReviewedAt     *string `json:"reviewed_at"`
	UpdatedAt      string  `json:"updated_at"`
}

type KYCDocument struct {
	ID         string `json:"id"`
	DocType    string `json:"doc_type"`
	Filename   string `json:"filename"`
	MimeType   string `json:"mime_type"`
	Data       string `json:"data,omitempty"`
	UploadedAt string `json:"uploaded_at"`
}

func scanKYC(row *sql.Row) (*KYCData, error) {
	var k KYCData
	err := row.Scan(
		&k.ID, &k.TenantID, &k.EntityType,
		&k.FirstName, &k.LastName, &k.IDType, &k.IDNumber, &k.DateOfBirth, &k.Nationality,
		&k.CompanyName, &k.RegNumber, &k.VATNumber,
		&k.AuthRepName, &k.AuthRepID,
		&k.AddressStreet, &k.AddressSuburb, &k.AddressCity,
		&k.AddressProvince, &k.AddressPostal, &k.AddressCountry,
		&k.Status, &k.ReviewerNotes, &k.SubmittedAt, &k.ReviewedAt, &k.UpdatedAt,
	)
	return &k, err
}

const kycSelectCols = `id, tenant_id, entity_type,
	first_name, last_name, id_type, id_number, date_of_birth, nationality,
	company_name, reg_number, vat_number,
	auth_rep_name, auth_rep_id,
	address_street, address_suburb, address_city,
	address_province, address_postal, address_country,
	status, reviewer_notes, submitted_at, reviewed_at, updated_at`

func getKYCDocuments(db *sql.DB, kycID string, includeData bool) []KYCDocument {
	col := "id, doc_type, filename, mime_type, '' as data, uploaded_at"
	if includeData {
		col = "id, doc_type, filename, mime_type, data, uploaded_at"
	}
	rows, err := db.Query("SELECT "+col+" FROM kyc_documents WHERE kyc_id = ? ORDER BY uploaded_at ASC", kycID)
	if err != nil {
		return []KYCDocument{}
	}
	defer rows.Close()
	var docs []KYCDocument
	for rows.Next() {
		var d KYCDocument
		rows.Scan(&d.ID, &d.DocType, &d.Filename, &d.MimeType, &d.Data, &d.UploadedAt)
		docs = append(docs, d)
	}
	if docs == nil {
		return []KYCDocument{}
	}
	return docs
}

// GET /api/kyc — tenant views own KYC
func GetKYC(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("claims").(*middleware.Claims)
		w.Header().Set("Content-Type", "application/json")

		k, err := scanKYC(db.QueryRow("SELECT "+kycSelectCols+" FROM kyc_submissions WHERE tenant_id = ?", claims.TenantID))
		if err == sql.ErrNoRows {
			json.NewEncoder(w).Encode(nil)
			return
		}
		docs := getKYCDocuments(db, k.ID, false)
		json.NewEncoder(w).Encode(map[string]interface{}{"kyc": k, "documents": docs})
	}
}

// PUT /api/kyc — tenant saves KYC form (draft)
func SaveKYC(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("claims").(*middleware.Claims)

		var req KYCData
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonError(w, "Invalid request", http.StatusBadRequest)
			return
		}

		// Check if submission exists
		var existingID string
		var existingStatus string
		db.QueryRow("SELECT id, status FROM kyc_submissions WHERE tenant_id = ?", claims.TenantID).
			Scan(&existingID, &existingStatus)

		if existingID == "" {
			existingID = uuid.New().String()
			db.Exec(`INSERT INTO kyc_submissions (
				id, tenant_id, entity_type,
				first_name, last_name, id_type, id_number, date_of_birth, nationality,
				company_name, reg_number, vat_number, auth_rep_name, auth_rep_id,
				address_street, address_suburb, address_city, address_province, address_postal, address_country,
				status
			) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'draft')`,
				existingID, claims.TenantID, req.EntityType,
				req.FirstName, req.LastName, req.IDType, req.IDNumber, req.DateOfBirth, req.Nationality,
				req.CompanyName, req.RegNumber, req.VATNumber, req.AuthRepName, req.AuthRepID,
				req.AddressStreet, req.AddressSuburb, req.AddressCity, req.AddressProvince, req.AddressPostal, req.AddressCountry,
			)
		} else if existingStatus == "draft" || existingStatus == "rejected" {
			db.Exec(`UPDATE kyc_submissions SET
				entity_type=?, first_name=?, last_name=?, id_type=?, id_number=?, date_of_birth=?, nationality=?,
				company_name=?, reg_number=?, vat_number=?, auth_rep_name=?, auth_rep_id=?,
				address_street=?, address_suburb=?, address_city=?, address_province=?, address_postal=?, address_country=?
				WHERE id=?`,
				req.EntityType,
				req.FirstName, req.LastName, req.IDType, req.IDNumber, req.DateOfBirth, req.Nationality,
				req.CompanyName, req.RegNumber, req.VATNumber, req.AuthRepName, req.AuthRepID,
				req.AddressStreet, req.AddressSuburb, req.AddressCity, req.AddressProvince, req.AddressPostal, req.AddressCountry,
				existingID,
			)
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"id": existingID, "message": "Saved"})
	}
}

// POST /api/kyc/submit — tenant submits for review
func SubmitKYC(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("claims").(*middleware.Claims)

		var existingID, existingStatus string
		err := db.QueryRow("SELECT id, status FROM kyc_submissions WHERE tenant_id = ?", claims.TenantID).
			Scan(&existingID, &existingStatus)
		if err != nil || (existingStatus != "draft" && existingStatus != "rejected") {
			jsonError(w, "No draft KYC found to submit", http.StatusBadRequest)
			return
		}

		now := time.Now().Format("2006-01-02 15:04:05")
		db.Exec("UPDATE kyc_submissions SET status='pending', submitted_at=?, reviewer_notes='' WHERE id=?", now, existingID)
		db.Exec("UPDATE tenants SET kyc_status='pending' WHERE id=?", claims.TenantID)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"message": "Submitted for review"})
	}
}

// POST /api/kyc/documents — upload a document (base64)
func UploadKYCDocument(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("claims").(*middleware.Claims)

		var req struct {
			DocType  string `json:"doc_type"`
			Filename string `json:"filename"`
			MimeType string `json:"mime_type"`
			Data     string `json:"data"` // base64 data URL
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonError(w, "Invalid request", http.StatusBadRequest)
			return
		}
		if req.DocType == "" || req.Data == "" {
			jsonError(w, "doc_type and data are required", http.StatusBadRequest)
			return
		}

		var kycID string
		err := db.QueryRow("SELECT id FROM kyc_submissions WHERE tenant_id = ?", claims.TenantID).Scan(&kycID)
		if err != nil {
			jsonError(w, "Save your KYC form before uploading documents", http.StatusBadRequest)
			return
		}

		// Replace existing document of same type
		db.Exec("DELETE FROM kyc_documents WHERE kyc_id=? AND doc_type=?", kycID, req.DocType)

		id := uuid.New().String()
		db.Exec(`INSERT INTO kyc_documents (id, kyc_id, doc_type, filename, mime_type, data)
			VALUES (?,?,?,?,?,?)`,
			id, kycID, req.DocType, req.Filename, req.MimeType, req.Data)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"id": id})
	}
}

// DELETE /api/kyc/documents/{id}
func DeleteKYCDocument(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("claims").(*middleware.Claims)
		docID := mux.Vars(r)["id"]

		// Ensure document belongs to this tenant's KYC
		db.Exec(`DELETE d FROM kyc_documents d
			JOIN kyc_submissions k ON k.id = d.kyc_id
			WHERE d.id=? AND k.tenant_id=?`, docID, claims.TenantID)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"message": "Deleted"})
	}
}

// --- Superadmin endpoints ---

// GET /api/admin/kyc
func AdminListKYC(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("claims").(*middleware.Claims)
		if !requireSuperAdmin(claims, w) {
			return
		}

		rows, err := db.Query(`
			SELECT k.id, k.tenant_id, t.name AS tenant_name, t.domain,
				k.entity_type, k.first_name, k.last_name, k.company_name,
				k.status, k.submitted_at, k.reviewed_at, k.updated_at
			FROM kyc_submissions k
			JOIN tenants t ON t.id = k.tenant_id
			ORDER BY k.submitted_at DESC, k.updated_at DESC`)
		if err != nil {
			jsonError(w, "Failed to list KYC", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		type Row struct {
			ID          string  `json:"id"`
			TenantID    string  `json:"tenant_id"`
			TenantName  string  `json:"tenant_name"`
			Domain      string  `json:"domain"`
			EntityType  string  `json:"entity_type"`
			FirstName   string  `json:"first_name"`
			LastName    string  `json:"last_name"`
			CompanyName string  `json:"company_name"`
			Status      string  `json:"status"`
			SubmittedAt *string `json:"submitted_at"`
			ReviewedAt  *string `json:"reviewed_at"`
			UpdatedAt   string  `json:"updated_at"`
		}
		var list []Row
		for rows.Next() {
			var r Row
			rows.Scan(&r.ID, &r.TenantID, &r.TenantName, &r.Domain,
				&r.EntityType, &r.FirstName, &r.LastName, &r.CompanyName,
				&r.Status, &r.SubmittedAt, &r.ReviewedAt, &r.UpdatedAt)
			list = append(list, r)
		}
		if list == nil {
			list = []Row{}
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(list)
	}
}

// GET /api/admin/kyc/{id} — full detail + documents (with data for viewing)
func AdminGetKYC(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("claims").(*middleware.Claims)
		if !requireSuperAdmin(claims, w) {
			return
		}

		id := mux.Vars(r)["id"]
		k, err := scanKYC(db.QueryRow("SELECT "+kycSelectCols+" FROM kyc_submissions WHERE id=?", id))
		if err != nil {
			jsonError(w, "Not found", http.StatusNotFound)
			return
		}
		docs := getKYCDocuments(db, id, true)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{"kyc": k, "documents": docs})
	}
}

// PATCH /api/admin/kyc/{id} — approve or reject
func AdminReviewKYC(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("claims").(*middleware.Claims)
		if !requireSuperAdmin(claims, w) {
			return
		}

		id := mux.Vars(r)["id"]
		var req struct {
			Status        string `json:"status"` // "approved" | "rejected"
			ReviewerNotes string `json:"reviewer_notes"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonError(w, "Invalid request", http.StatusBadRequest)
			return
		}
		if req.Status != "approved" && req.Status != "rejected" {
			jsonError(w, "status must be approved or rejected", http.StatusBadRequest)
			return
		}

		now := time.Now().Format("2006-01-02 15:04:05")
		db.Exec(`UPDATE kyc_submissions SET status=?, reviewer_notes=?, reviewed_at=? WHERE id=?`,
			req.Status, req.ReviewerNotes, now, id)

		// Sync kyc_status on tenants table
		var tenantID string
		db.QueryRow("SELECT tenant_id FROM kyc_submissions WHERE id=?", id).Scan(&tenantID)
		if tenantID != "" {
			db.Exec("UPDATE tenants SET kyc_status=? WHERE id=?", req.Status, tenantID)
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"message": "Review saved"})
	}
}
