import { logger } from './util';
import { discordConfig, appConfig } from './config';
import { DiscordMessage, Notifier, NotifyParams } from './types';

export function notify(params: NotifyParams = {}): Notifier {
	const {
		discordUrl = discordConfig.DISCORD_URL,
		environment = appConfig.NODE_ENV,
		botUsername = 'commit.jaw.dev',
		httpClient = fetch,
	} = params;

	return {
		discord: async (message: string, details: any = null): Promise<void> => {
			try {
				if (environment !== 'production') {
					logger.info('Skipping discord notification non production environment!');
					return;
				}
				let params: DiscordMessage;
				if (details === null) {
					params = { username: botUsername, content: message };
				} else {
					params = {
						username: botUsername,
						content: message,
						embeds: [{ title: message, description: JSON.stringify(details) }],
					};
				}
				const res = await httpClient(discordUrl, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(params),
				});
				if (res.status === 204) {
					logger.info(`Discord bot has sent: ${message}`);
				} else {
					throw new Error(`Discord API returned status ${res.status}`);
				}
			} catch (error) {
				console.error('Error sending Discord notification:', error);
			}
		},
		email: async (to: string = 'noreply@jaw.dev', subject: string, body: string): Promise<void> => {
			try {
				console.log('notify.email() has not been implemented yet');
			} catch (error) {
				console.error('Error sending email notification:', error);
			}
		},
	};
}
