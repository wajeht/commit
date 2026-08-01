package main

import (
	"bytes"
	"encoding/json"
	"net"
	"net/http"
	"strings"
)

var errorTemplate = pageTemplate("templates/error.html")

type errorPageData struct {
	Title      string
	StatusCode int
	Message    string
}

func (app *application) domain(r *http.Request) string {
	host := r.Host
	var proto string

	if app.config.appEnv == "production" {
		proto = "https"
	} else {
		proto = r.Header.Get("X-Forwarded-Proto")
		if proto == "" {
			if r.TLS != nil {
				proto = "https"
			} else {
				proto = "http"
			}
		}
	}

	return proto + "://" + host
}

func clientIP(r *http.Request) string {
	headers := []string{"X-Forwarded-For", "Forwarded", "X-Real-IP"}

	for _, header := range headers {
		value := r.Header.Get(header)
		if value == "" {
			continue
		}

		// Special handling for 'Forwarded' header (RFC 7239)
		if header == "Forwarded" {
			// Parse format like "for=192.168.1.1;host=example.com"
			if idx := strings.Index(value, "for="); idx != -1 {
				rest := value[idx+4:]
				if semicolon := strings.Index(rest, ";"); semicolon != -1 {
					rest = rest[:semicolon]
				}
				// Remove quotes if present
				rest = strings.Trim(rest, `"`)
				if ip := parseIP(rest); ip != "" {
					return ip
				}
			}
		} else {
			// Regular IP handling for X-Forwarded-For and X-Real-IP
			ips := strings.SplitSeq(value, ",")
			for ipStr := range ips {
				if ip := parseIP(strings.TrimSpace(ipStr)); ip != "" {
					return ip
				}
			}
		}
	}

	// Fallback to RemoteAddr
	if ip := parseIP(r.RemoteAddr); ip != "" {
		return ip
	}

	return "unknown"
}

func parseIP(ipStr string) string {
	if ipStr == "" {
		return ""
	}

	// Handle bracketed IPv6 addresses: [2001:db8::1]:8080 or [2001:db8::1]
	if strings.Contains(ipStr, "[") && strings.Contains(ipStr, "]") {
		start := strings.Index(ipStr, "[")
		end := strings.Index(ipStr, "]")
		if start != -1 && end != -1 && end > start {
			ipv6 := ipStr[start+1 : end]
			if net.ParseIP(ipv6) != nil {
				return ipv6
			}
		}
	}

	// Handle plain IPv6 addresses
	if strings.Contains(ipStr, ":") {
		if ip := net.ParseIP(ipStr); ip != nil {
			return ipStr
		}
	}

	// Handle IPv4 addresses, possibly with port
	if colonIdx := strings.LastIndex(ipStr, ":"); colonIdx != -1 {
		ipStr = ipStr[:colonIdx]
	}

	if ip := net.ParseIP(ipStr); ip != nil {
		return ipStr
	}

	return ""
}

func respond(w http.ResponseWriter, r *http.Request, statusCode int, message string) {
	accept := r.Header.Get("Accept")
	userAgent := r.Header.Get("User-Agent")

	if strings.Contains(accept, "application/json") || strings.Contains(userAgent, "curl") {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(statusCode)
		if err := json.NewEncoder(w).Encode(map[string]string{"message": message}); err != nil {
			return
		}
		return
	}

	statusText := http.StatusText(statusCode)
	if statusText == "" {
		statusText = "Error"
	}

	var page bytes.Buffer
	if err := errorTemplate.ExecuteTemplate(&page, "base.html", errorPageData{
		Title:      statusText,
		StatusCode: statusCode,
		Message:    message,
	}); err != nil {
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(statusCode)
	if _, err := page.WriteTo(w); err != nil {
		return
	}
}
