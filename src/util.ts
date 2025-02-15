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
	const xForwardedFor = req.headers['x-forwarded-for'];

	let clientIp = '';

	if (Array.isArray(xForwardedFor)) {
		clientIp = xForwardedFor[0].split(',')[0].trim();
	}

	if (typeof xForwardedFor === 'string') {
		clientIp = xForwardedFor.split(',')[0].trim();
	}

	if (!clientIp) {
		clientIp = req.ip || req.socket?.remoteAddress || '';
	}

	return clientIp;
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
