import { logger } from './util';
import { discordConfig, appConfig } from './config';

interface Embed {
	title: string;
	description: string;
}

interface DiscordMessage {
	username: string;
	content: string;
	embeds?: Embed[];
}

interface Notifier {
	discord(msg: string, object?: any): Promise<void>;
	email(to: string, subject: string, body: string): Promise<void>;
}

interface NotifyParams {
	discordUrl?: string;
	environment?: string;
	botUsername?: string;
	httpClient?: (url: string, options: RequestInit) => Promise<Response>;
}

export function notify(params: NotifyParams = {}): Notifier {
	const {
		discordUrl = discordConfig.url,
		environment = appConfig.NODE_ENV,
		botUsername = 'commit.jaw.dev',
		httpClient = fetch,
	} = params;

	return {
		discord: async (msg: string, object: any = null): Promise<void> => {
			try {
				if (environment !== 'production') {
					logger.info('Skipping discord notification non production environment!');
					return;
				}
				let params: DiscordMessage;
				if (object === null) {
					params = { username: botUsername, content: msg };
				} else {
					params = {
						username: botUsername,
						content: msg,
						embeds: [{ title: msg, description: JSON.stringify(object) }],
					};
				}
				const res = await httpClient(discordUrl, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(params),
				});
				if (res.status === 204) {
					logger.info(`Discord bot has sent: ${msg}`);
				} else {
					throw new Error(`Discord API returned status ${res.status}`);
				}
			} catch (error) {
				console.error('Error sending Discord notification:', error);
			}
		},
		email: async (to: string, subject: string, body: string): Promise<void> => {
			try {
				console.log('notify.email() has not been implemented yet');
			} catch (error) {
				console.error('Error sending email notification:', error);
			}
		},
	};
}
