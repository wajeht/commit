import { styleText } from 'node:util';
import { LoggerType } from './types';

export const logger: LoggerType = {
	debug: (...value: any) => {
		const timestamp = new Date().toLocaleString();
		process.stdout.write(styleText('red', `🐛 ${timestamp} ${value.join(' ')}\n`));
	},
	error: (...value: any) => {
		const timestamp = new Date().toLocaleString();
		process.stderr.write(styleText('red', `❌ ${timestamp} ${value.join(' ')}\n`));
	},
	info: (...value: any) => {
		const timestamp = new Date().toLocaleString();
		process.stdout.write(styleText('green', `✅ ${timestamp} ${value.join(' ')}\n`));
	},
};
