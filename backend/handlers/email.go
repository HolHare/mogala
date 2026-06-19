package handlers

import (
	"bytes"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"net/http"
	"net/smtp"
	"os"
	"strings"
)

// sendEmail sends via SMTP if SMTP_HOST is set, SendGrid if SENDGRID_API_KEY is set,
// or logs to stdout as a fallback (useful for development / missing email config).
func sendEmail(to, subject, htmlBody string) error {
	// --- SMTP path (Gmail, Outlook, any SMTP provider) ---
	smtpHost := os.Getenv("SMTP_HOST")
	if smtpHost != "" {
		smtpPort := os.Getenv("SMTP_PORT")
		if smtpPort == "" {
			smtpPort = "587"
		}
		smtpUser := os.Getenv("SMTP_USER")
		smtpPass := os.Getenv("SMTP_PASS")
		fromEmail := os.Getenv("SMTP_FROM")
		if fromEmail == "" {
			fromEmail = smtpUser
		}

		addr := smtpHost + ":" + smtpPort
		msg := "From: Mogala <" + fromEmail + ">\r\n" +
			"To: " + to + "\r\n" +
			"Subject: " + subject + "\r\n" +
			"MIME-Version: 1.0\r\n" +
			"Content-Type: text/html; charset=UTF-8\r\n" +
			"\r\n" + htmlBody

		var auth smtp.Auth
		if smtpUser != "" && smtpPass != "" {
			auth = smtp.PlainAuth("", smtpUser, smtpPass, smtpHost)
		}

		// Try STARTTLS (port 587) first; fall back to TLS (port 465)
		if smtpPort == "465" {
			tlsCfg := &tls.Config{ServerName: smtpHost}
			conn, err := tls.Dial("tcp", addr, tlsCfg)
			if err != nil {
				return fmt.Errorf("smtp tls dial: %w", err)
			}
			c, err := smtp.NewClient(conn, smtpHost)
			if err != nil {
				return fmt.Errorf("smtp new client: %w", err)
			}
			defer c.Close()
			if auth != nil {
				if err = c.Auth(auth); err != nil {
					return fmt.Errorf("smtp auth: %w", err)
				}
			}
			if err = c.Mail(fromEmail); err != nil {
				return err
			}
			if err = c.Rcpt(to); err != nil {
				return err
			}
			w, err := c.Data()
			if err != nil {
				return err
			}
			if _, err = strings.NewReader(msg).WriteTo(w); err != nil {
				return err
			}
			return w.Close()
		}

		return smtp.SendMail(addr, auth, fromEmail, []string{to}, []byte(msg))
	}

	// --- SendGrid path ---
	apiKey := os.Getenv("SENDGRID_API_KEY")
	fromEmail := os.Getenv("SENDGRID_FROM_EMAIL")
	if fromEmail == "" {
		fromEmail = "noreply@mogala.app"
	}
	if apiKey != "" {
		payload := map[string]interface{}{
			"personalizations": []map[string]interface{}{
				{"to": []map[string]string{{"email": to}}},
			},
			"from":    map[string]string{"email": fromEmail, "name": "Mogala"},
			"subject": subject,
			"content": []map[string]string{
				{"type": "text/html", "value": htmlBody},
			},
		}
		body, _ := json.Marshal(payload)
		req, _ := http.NewRequest("POST", "https://api.sendgrid.com/v3/mail/send", bytes.NewReader(body))
		req.Header.Set("Authorization", "Bearer "+apiKey)
		req.Header.Set("Content-Type", "application/json")
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			return err
		}
		defer resp.Body.Close()
		if resp.StatusCode >= 400 {
			return fmt.Errorf("sendgrid returned %d", resp.StatusCode)
		}
		return nil
	}

	// --- Fallback: log to stdout (visible in docker logs mogala-backend) ---
	fmt.Printf("[EMAIL] To: %s | Subject: %s\n%s\n", to, subject, htmlBody)
	return nil
}

func sendPhoneOTP(phone, otp string) {
	webhookURL := os.Getenv("PHONE_OTP_WEBHOOK_URL")
	if webhookURL == "" {
		fmt.Printf("[SMS OTP] Phone: %s | OTP: %s\n", phone, otp)
		return
	}
	payload, _ := json.Marshal(map[string]string{
		"to":      phone,
		"otp":     otp,
		"message": fmt.Sprintf("Your Mogala verification code is: %s. Valid for 10 minutes.", otp),
	})
	resp, err := http.Post(webhookURL, "application/json", bytes.NewReader(payload))
	if err != nil {
		fmt.Printf("[SMS WEBHOOK ERROR] %v\n", err)
		return
	}
	resp.Body.Close()
}

func emailOTPTemplate(otp string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#09090f;font-family:Arial,sans-serif">
<div style="max-width:520px;margin:40px auto;background:#111124;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:40px">
  <div style="margin-bottom:28px">
    <span style="display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;background:linear-gradient(135deg,#6366f1,#818cf8);border-radius:10px;font-size:22px;font-weight:800;color:#fff;vertical-align:middle">M</span>
    <span style="font-size:20px;font-weight:700;color:#fff;margin-left:10px;vertical-align:middle">Mogala</span>
  </div>
  <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#fff">Verify your email</h2>
  <p style="margin:0 0 28px;font-size:14px;color:#8b8ba7">Enter this code to confirm your email address. Valid for 15 minutes.</p>
  <div style="background:#1a1a3e;border:2px solid #6366f1;border-radius:12px;padding:24px;text-align:center;font-size:40px;font-weight:800;letter-spacing:12px;color:#fff;margin:0 0 28px">%s</div>
  <p style="margin:0;font-size:12px;color:#555">If you didn't create a Mogala account, ignore this email.</p>
</div>
</body>
</html>`, otp)
}

func inviteEmailTemplate(inviteeName, adminName, companyName, role, inviteURL string) string {
	greeting := "Hi there"
	if inviteeName != "" {
		greeting = "Hi " + inviteeName
	}
	return fmt.Sprintf(`<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#09090f;font-family:Arial,sans-serif">
<div style="max-width:520px;margin:40px auto;background:#111124;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:40px">
  <div style="margin-bottom:28px">
    <span style="display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;background:linear-gradient(135deg,#6366f1,#818cf8);border-radius:10px;font-size:22px;font-weight:800;color:#fff;vertical-align:middle">M</span>
    <span style="font-size:20px;font-weight:700;color:#fff;margin-left:10px;vertical-align:middle">Mogala</span>
  </div>
  <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#fff">You're invited to %s</h2>
  <p style="margin:0 0 20px;font-size:14px;color:#8b8ba7">%s, %s has invited you to join <strong style="color:#fff">%s</strong> on Mogala as a <strong style="color:#818cf8">%s</strong>.</p>
  <p style="margin:0 0 28px;font-size:14px;color:#8b8ba7">Click the button below to accept your invitation and set up your account. This link expires in 7 days.</p>
  <div style="text-align:center;margin:0 0 28px">
    <a href="%s" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#818cf8);color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600">Accept Invitation</a>
  </div>
  <p style="margin:0 0 6px;font-size:12px;color:#555">Or copy this link:</p>
  <p style="margin:0 0 24px;font-size:12px;color:#6366f1;word-break:break-all">%s</p>
  <p style="margin:0;font-size:12px;color:#555">If you weren't expecting this invitation, you can safely ignore this email.</p>
</div>
</body>
</html>`, companyName, greeting, adminName, companyName, role, inviteURL, inviteURL)
}

func passwordResetTemplate(resetURL string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#09090f;font-family:Arial,sans-serif">
<div style="max-width:520px;margin:40px auto;background:#111124;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:40px">
  <div style="margin-bottom:28px">
    <span style="display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;background:linear-gradient(135deg,#6366f1,#818cf8);border-radius:10px;font-size:22px;font-weight:800;color:#fff;vertical-align:middle">M</span>
    <span style="font-size:20px;font-weight:700;color:#fff;margin-left:10px;vertical-align:middle">Mogala</span>
  </div>
  <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#fff">Reset your password</h2>
  <p style="margin:0 0 28px;font-size:14px;color:#8b8ba7">Click the button below to set a new password. This link expires in 1 hour.</p>
  <div style="text-align:center;margin:0 0 28px">
    <a href="%s" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#818cf8);color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600">Reset Password</a>
  </div>
  <p style="margin:0 0 6px;font-size:12px;color:#555">Or copy this link:</p>
  <p style="margin:0 0 24px;font-size:12px;color:#6366f1;word-break:break-all">%s</p>
  <p style="margin:0;font-size:12px;color:#555">If you didn't request a password reset, ignore this email.</p>
</div>
</body>
</html>`, resetURL, resetURL)
}
