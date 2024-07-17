import { Request } from 'express';
import { OpenAI } from 'openai';
import { appConfig } from './config';

export interface CacheType {
	set(key: string, value: string): void;
	get(key: string): string | null;
	clear(key: string): void;
}

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

export interface ConfigItem<T> {
	readonly value: any;
	readonly default?: T;
	readonly type?: (value: any) => T;
	readonly required: boolean;
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

export interface OpenAIServiceType {
	openai: OpenAI;
	generateCommitMessage(diff: string): Promise<string | null>;
}

/**
 * Reference
 *
 * https://github.com/Nutlope/aicommits/blob/develop/src/utils/prompt.ts
 *
 */
export const OpenAIService: OpenAIServiceType = {
	openai: new OpenAI({ apiKey: appConfig.OPENAI_API_KEY }),

	async generateCommitMessage(diff: string): Promise<string | null> {
		const prompt = [
			'Generate a concise git commit message written in present tense for the following code diff with the given specifications below:',
			'Message language: english',
			'Commit message must be a maximum of 72 characters.',
			'Exclude anything unnecessary such as translation. Your entire response will be passed directly into git commit.',
			'The commit message will always need to have slug follow by a colon and a commit message',
			'The output response must be in format:',
			`Choose a type from the type-to-description JSON below that best describes the git diff:\n${JSON.stringify(
				{
					docs: 'Documentation only changes',
					style:
						'Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)',
					refactor: 'A code change that neither fixes a bug nor adds a feature',
					perf: 'A code change that improves performance',
					test: 'Adding missing tests or correcting existing tests',
					build: 'Changes that affect the build system or external dependencies',
					ci: 'Changes to our CI configuration files and scripts',
					chore: "Other changes that don't modify src or test files",
					revert: 'Reverts a previous commit',
					feat: 'A new feature',
					fix: 'A bug fix',
				},
				null,
				2,
			)}`,
		]
			.filter(Boolean)
			.join('\n');

		const chatCompletion = await this.openai.chat.completions.create({
			model: 'gpt-3.5-turbo',
			temperature: 0.7,
			top_p: 1,
			frequency_penalty: 0,
			presence_penalty: 0,
			max_tokens: 200,
			stream: false,
			messages: [
				{
					role: 'system',
					content: prompt,
				},
				{
					role: 'user',
					content: diff,
				},
			],
		});

		const messages = chatCompletion.choices
			.filter((choice) => choice.message?.content)
			.map((choice) => choice.message.content);

		return getRandomElement(messages);
	},
};
