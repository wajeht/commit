import path from 'path';
import dotenv from 'dotenv';
import { validateConfig } from './util';

dotenv.config({ path: path.resolve(path.join(process.cwd(), '.env')) });

export const discordConfig = validateConfig({
	DISCORD_ID: {
		value: process.env.DISCORD_ID,
		required: true,
		type: (value: any) => String(value),
	},
	DISCORD_TOKEN: {
		value: process.env.DISCORD_TOKEN,
		required: true,
		type: (value: any) => String(value),
	},
	DISCORD_URL: {
		value: process.env.DISCORD_URL,
		required: true,
		type: (value: any) => String(value),
	},
});

export const appConfig = validateConfig({
	IPS: {
		value: process.env.IPS,
		required: true,
		type: (value: any) => String(value),
	},
	PORT: {
		value: process.env.PORT,
		default: 80,
		type: (value: any) => Number(value),
		required: false,
	},
	OPENAI_API_KEY: {
		value: process.env.OPENAI_API_KEY,
		required: true,
		type: (value: any) => String(value),
	},
	CLAUDE_API_KEY: {
		value: process.env.CLAUDE_API_KEY,
		required: true,
		type: (value: any) => String(value),
	},
	NODE_ENV: {
		value: process.env.NODE_ENV,
		default: 'development',
		required: false,
		type: (value: any) => value as 'development' | 'production',
	},
});
