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
