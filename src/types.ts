import { OpenAI } from 'openai';
import { Request } from 'express';

export type Provider = 'openai' | 'claudeai';

export interface GenerateCommitMessageRequest extends Request {
	body: {
		diff: string;
		provider?: Provider;
	};
}

export interface CacheType {
	set(key: string, value: string): void;
	get(key: string): string | null;
	clear(key: string): void;
}

export interface AIService {
	generate(diff: string): Promise<string | null> | any;
}

export interface ConfigItem<T> {
	readonly value: any;
	readonly default?: T;
	readonly type?: (value: any) => T;
	readonly required: boolean;
}

export interface Logger {
	debug: (...value: any) => void;
	error: (...value: any) => void;
	info: (...value: any) => void;
}
