import { Request } from 'express';
import { styleText } from 'node:util';
import { OpenAI } from 'openai';
import { appConfig } from './config';
import { ValidationError } from './error';
import { CacheType, ConfigItem, Logger, OpenAIServiceType } from './types';

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

/**
 * Reference
 *
 * https://github.com/Nutlope/aicommits/blob/develop/src/utils/prompt.ts
 *
 */
export const OpenAIService: OpenAIServiceType = {
	openai: new OpenAI({ apiKey: appConfig.OPENAI_API_KEY }),

	async generateCommitMessage(diff: string): Promise<string | null> {
		try {
			const prompt = [
				'Generate a concise git commit message written in present tense for the following code diff with the given specifications below:',
				'Message language: english',
				'Commit message must be a maximum of 72 characters.',
				'Exclude anything unnecessary such as translation. Your entire response will be passed directly into git commit.',
				'The commit message will always need to have slug follow by a commit message',
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
		} catch (error: any) {
			if (error.code === 'context_length_exceeded') {
				throw new ValidationError('The provided input exceeds the maximum allowed token length.');
			} else {
				throw error;
			}
		}
	},
};
