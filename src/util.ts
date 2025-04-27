import net from 'net';
import fastq from 'fastq';
import { logger } from './logger';
import { Request } from 'express';
import { appConfig } from './config';
import { CacheType, ConfigItem } from './types';

export const sendNotificationQueue = fastq.promise(sendNotification, 1);

export async function sendNotification({
	req,
	error,
}: {
	req: Request;
	error: Error;
}): Promise<void> {
	try {
		const n = await fetch(appConfig.NOTIFY_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-API-KEY': appConfig.NOTIFY_X_API_KEY,
			},
			body: JSON.stringify({
				message: `Error: ${error?.message}`,
				details: JSON.stringify(
					{
						request: {
							method: req.method,
							url: req.url,
							headers: req.headers,
							query: req.query,
							body: req.body,
						},
						error: {
							name: error?.name,
							message: error?.message,
							stack: error?.stack,
							cause: error?.cause,
						},
					},
					null,
					2,
				),
			}),
		});

		if (!n.ok) {
			const text = await n.text();
			logger.error(`Notification service responded with status ${n.status}: ${text}`);
		}
	} catch (error) {
		logger.error('Failed to send error notification', error);
	}
}

export const statusCode = {
	INTERNAL_SERVER_ERROR: 500,
	FORBIDDEN: 403,
	UNAUTHORIZED: 401,
	NOT_FOUND: 404,
	UNPROCESSABLE_ENTITY: 422,
	NOT_IMPLEMENTED: 501,
	TOO_MANY_REQUESTS: 429,
} as const;

function Cache(): CacheType {
	const cache = new Map<string, string>();

	return {
		set(key: string, value: string): void {
			cache.set(key, value);
		},
		get(key: string): string | null {
			return cache.get(key) ?? null;
		},
		clear(key: string): void {
			cache.delete(key);
		},
	};
}

export const cache = Cache();

export function extractDomain(req: Request): string {
	const host = req.hostname;
	const port = req.get('host')?.split(':')[1] || '';
	const protocol = process.env.NODE_ENV === 'production' ? 'https' : req.protocol;
	const url = `${protocol}://${host}${port ? ':' + port : ''}`;
	return url;
}

export function validateConfig<T extends Record<string, ConfigItem<any>>>(
	config: T,
): Readonly<{ [K in keyof T]: T[K]['type'] extends (value: any) => infer R ? R : T[K]['value'] }> {
	const finalConfig: any = {};

	for (const key in config) {
		const { value, default: defaultValue, type, required } = config[key];

		if (required && (value === undefined || value === null)) {
			logger.error(`${key}: has not been set yet!`);
			process.exit(1);
		}

		finalConfig[key] = value !== undefined && value !== null ? value : defaultValue;

		if (type && finalConfig[key] !== undefined) {
			try {
				finalConfig[key] = type(finalConfig[key]);
			} catch (error) {
				logger.error(`${key}: could not be converted to the required type.`);
				process.exit(1);
			}
		}
	}

	return Object.freeze(finalConfig) as Readonly<{
		[K in keyof T]: T[K]['type'] extends (value: any) => infer R ? R : T[K]['value'];
	}>;
}

export function getRandomElement<T>(list: T[]): T {
	return list[Math.floor(Math.random() * list.length)];
}

export function getIpAddress(req: Request): string {
	const headers = ['x-forwarded-for', 'forwarded', 'x-real-ip'];

	let clientIp = '';

	for (const header of headers) {
		const value = req.headers[header];
		if (!value) continue;

		const parts = Array.isArray(value) ? value : [value];

		for (const part of parts) {
			// Special handling for 'forwarded' header which has a different format
			if (header === 'forwarded') {
				// Parse according to RFC 7239 format (e.g., "for=192.168.1.1;host=example.com")
				const match = /(?:^|;)\s*for=([^;]+)/.exec(part);
				if (match && match[1]) {
					const forValue = match[1].trim();
					// Remove quotes if present
					const ip = forValue.replace(/^"(.+)"$/, '$1').trim();
					clientIp = cleanIp(ip);
					if (clientIp) break;
				}
			} else {
				// Regular IP handling for other headers
				const ips = part.split(',').map((ip) => ip.trim());
				for (const ip of ips) {
					if (ip) {
						// Extract first valid IP candidate
						clientIp = cleanIp(ip);
						if (clientIp) break;
					}
				}
			}
			if (clientIp) break;
		}
		if (clientIp) break;
	}

	if (!clientIp) {
		clientIp = cleanIp(req.ip || req.socket?.remoteAddress || '');
	}

	return clientIp || 'unknown';
}

export function cleanIp(ip: string): string {
	if (!ip) return '';

	// Special case for IPv6 addresses
	if (ip.includes(':') && ip.includes('[')) {
		// Handle bracketed IPv6 addresses: [2001:db8::1]:8080 or [2001:db8::1]
		const match = ip.match(/^\[(.*?)\](?::\d+)?$/);
		if (match && match[1]) {
			const ipv6 = match[1];
			if (net.isIP(ipv6)) {
				return ipv6;
			}
		}
	} else if (ip.includes(':') && net.isIP(ip) === 6) {
		// Handle plain IPv6 addresses (no brackets)
		return ip;
	}

	// Handle IPv4 addresses, possibly with port
	const cleaned = ip.split(':')[0].trim();

	if (net.isIP(cleaned)) {
		return cleaned;
	}

	return '';
}

export const html = (content: string, title: string = 'commit.jaw.dev'): string => {
	return `
	<!DOCTYPE html>
	<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<meta name="robots" content="noindex, nofollow">
		<title>${title}</title>
		<script defer data-domain="commit.jaw.dev" src="https://plausible.jaw.dev/js/script.js"></script>
		<style>
			/* Default */
			*, *::before, *::after { box-sizing: border-box; }
			* { margin: 0; font-family: Verdana, Geneva, Tahoma, sans-serif; }
			body { line-height: 1.5; -webkit-font-smoothing: antialiased; padding: 10px; }
			img, picture, video, canvas, svg { display: block; max-width: 100%; }
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
		<p>${content}</p>
	</body>
	</html>`;
};
