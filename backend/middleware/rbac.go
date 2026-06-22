package middleware

import (
	"net/http"
)

// RequireRole returns a middleware that enforces the caller's role is one of the allowed roles.
// Roles are hierarchical by convention: superadmin > admin > supervisor > agent/billing.
func RequireRole(roles ...string) func(http.Handler) http.Handler {
	allowed := make(map[string]bool, len(roles))
	for _, r := range roles {
		allowed[r] = true
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims, ok := r.Context().Value("claims").(*Claims)
			if !ok || claims == nil {
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
				return
			}
			if !allowed[claims.Role] {
				http.Error(w, "Forbidden", http.StatusForbidden)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// AdminOrAbove allows admin and superadmin.
func AdminOrAbove() func(http.Handler) http.Handler {
	return RequireRole("admin", "superadmin")
}

// SuperadminOnly allows only the superadmin role.
func SuperadminOnly() func(http.Handler) http.Handler {
	return RequireRole("superadmin")
}

// SupervisorOrAbove allows supervisor, admin, and superadmin.
func SupervisorOrAbove() func(http.Handler) http.Handler {
	return RequireRole("supervisor", "admin", "superadmin")
}
