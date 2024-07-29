import { Request } from 'express';
import { styleText } from 'node:util';
import { CacheType, ConfigItem, Logger } from './types';

export const statusCode = Object.freeze({
	INTERNAL_SERVER_ERROR: 500 as number,
	FORBIDDEN: 403,
	UNAUTHORIZED: 401,
	NOT_FOUND: 404,
	UNPROCESSABLE_ENTITY: 422,
	NOT_IMPLEMENTED: 501,
	TOO_MANY_REQUESTS: 429,
});

function Cache(): CacheType {
	const cache: { [key: string]: string | null } = {};

	return {
		set(key: string, value: string): void {
			cache[key] = value;
		},
		get(key: string): string | null {
			return cache[key] ?? null;
		},
		clear(key: string): void {
			cache[key] = null;
		},
	};
}

export const cache = Cache();

export const logger: Logger = {
	debug: (...value: any) => {
		const timestamp = new Date().toLocaleString();
		console.debug(styleText('red', `🐛 ${timestamp} ${value}`));
	},
	error: (...value: any) => {
		const timestamp = new Date().toLocaleString();
		console.error(styleText('red', `❌ ${timestamp} ${value}`));
	},
	info: (...value: any) => {
		const timestamp = new Date().toLocaleString();
		console.info(styleText('green', `✅ ${timestamp} ${value}`));
	},
};

export function extractDomain(req: Request): string {
	const host = req.hostname;
	const protocol = req.protocol;
	const port = req.get('host')?.split(':')[1] || '';
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
