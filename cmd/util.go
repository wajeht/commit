package main

import (
	"net"
	"net/http"
	"strings"
)

func (app *application) extractDomain(r *http.Request) string {
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

func getIpAddress(r *http.Request) string {
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
				if ip := cleanIP(rest); ip != "" {
					return ip
				}
			}
		} else {
			// Regular IP handling for X-Forwarded-For and X-Real-IP
			ips := strings.SplitSeq(value, ",")
			for ipStr := range ips {
				if ip := cleanIP(strings.TrimSpace(ipStr)); ip != "" {
					return ip
				}
			}
		}
	}

	// Fallback to RemoteAddr
	if ip := cleanIP(r.RemoteAddr); ip != "" {
		return ip
	}

	return "unknown"
}

func cleanIP(ipStr string) string {
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
