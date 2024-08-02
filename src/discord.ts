import { logger } from './util';
import { appConfig } from './config';
import { discord as discordConfig } from '../config/discord.js';

interface Embed {
	title: string;
	description: string;
}

interface DiscordMessage {
	username: string;
	content: string;
	embeds?: Embed[];
}

export async function alertDiscord(msg: string, object: any = null): Promise<void> {
	try {
		if (appConfig.env !== 'production') {
			logger.info('Skipping discord notification non production environment!');
			return;
		}

		let params: DiscordMessage;

		if (object === null) {
			params = { username: 'commit.jaw.dev', content: msg };
		} else {
			params = {
				username: 'commit.jaw.dev',
				content: msg,
				embeds: [{ title: msg, description: object }],
			};
		}

		const res = await fetch(discordConfig.url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(params),
		});

		if (res.status === 204) {
			logger.info(`Discord bot has sent: ${msg}`);
		}
	} catch (error) {
		console.error(error);
	}
}
