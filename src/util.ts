import { Request } from 'express';

function Cache() {
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

export const logger = {
	debug: (...value: any) => {
		const timestamp = new Date().toLocaleString();
		console.debug(`\x1b[33m 🐛 ${timestamp}`, ...value, '\x1b[0m');
	},
	error: (...value: any) => {
		const timestamp = new Date().toLocaleString();
		console.error(`\x1b[31m ❌ ${timestamp}`, ...value, '\x1b[0m');
	},
	info: (...value: any) => {
		const timestamp = new Date().toLocaleString();
		console.info(`\x1b[32m ✅ ${timestamp}`, ...value, '\x1b[0m');
	},
};

export function extractDomain(req: Request): string {
	const host = req.hostname;
	const protocol = req.protocol;
	const port = req.get('host')?.split(':')[1] || '';
	const url = `${protocol}://${host}${port ? ':' + port : ''}`;
	return url;
}

interface ConfigItem {
	value: any;
	default?: any;
	type?: (value: any) => any;
	required: boolean;
}

export function validateConfig<T extends Record<string, ConfigItem>>(
	config: T,
): { [K in keyof T]: T[K]['type'] extends Function ? ReturnType<T[K]['type']> : T[K]['value'] } {
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

	return Object.freeze(finalConfig);
}
