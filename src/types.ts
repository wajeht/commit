import { Request } from 'express';

export type Provider = 'openai' | 'claudeai' | 'deepseek' | 'gemini';

export interface GenerateCommitMessageRequest extends Request {
	body: {
		diff: string;
		provider?: Provider;
		apiKey?: string;
	};
}

export interface CacheType {
	set(key: string, value: string): void;
	get(key: string): string | null;
	clear(key: string): void;
}

export interface AIService {
	generate(diff: string, apiKey?: string): Promise<string | null> | any;
}

export interface ConfigItem<T> {
	readonly value: any;
	readonly default?: T;
	readonly type?: (value: any) => T;
	readonly required: boolean;
}

export interface LoggerType {
	debug: (...value: any) => void;
	error: (...value: any) => void;
	info: (...value: any) => void;
}

export interface Notifier {
	discord(msg: string, object?: any): Promise<void>;
	email(to: string, subject: string, body: string): Promise<void>;
}
