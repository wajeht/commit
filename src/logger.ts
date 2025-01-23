import { styleText } from 'node:util';
import { LoggerType } from './types';

export const logger: LoggerType = {
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
