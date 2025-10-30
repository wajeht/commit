package main

import (
	"fmt"
	"net"
	"net/http"
	"strings"
)

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
		fmt.Fprintf(w, `{"message":"%s"}`, message)
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(statusCode)
	fmt.Fprint(w, renderHTML(message))
}

func renderHTML(content string, title ...string) string {
	pageTitle := "commit.jaw.dev"
	if len(title) > 0 {
		pageTitle = title[0]
	}

	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow">
    <title>%s</title>
    <script defer data-domain="commit.jaw.dev" src="https://plausible.jaw.dev/js/script.js"></script>
    <style>
        /* Default */
        *, *::before, *::after { box-sizing: border-box; }
        * { margin: 0; font-family: Verdana, Geneva, Tahoma, sans-serif; }
        body { line-height: 1.5; -webkit-font-smoothing: antialiased; padding: 10px; }
        img, picture, video, canvas, svg { display: block; max-width: 100%%; }
        input, button, textarea, select { font: inherit; }
        p, h1, h2, h3, h4, h5, h6 { overflow-wrap: break-word; }

        /* Light theme */
        body {
            background-color: #ffffff;
            color: #000000;
        }

        /* Dark theme */
        @media (prefers-color-scheme: dark) {
            body {
                background-color: #121212;
                color: #ffffff;
            }
        }

        /* Command style */
        .command {
            background-color: #ededed;
            border-radius: 5px;
            padding: 5px 10px;
        }

        /* Dark theme command style */
        @media (prefers-color-scheme: dark) {
            .command {
                background-color: #333333;
            }
        }
    </style>
</head>
<body>
    <p>%s</p>
</body>
</html>`, pageTitle, content)
}
