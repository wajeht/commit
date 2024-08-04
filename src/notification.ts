import { logger } from './util';
import { discordConfig } from './config';
import { DiscordMessage, Notifier, NotifyParams } from './types';

export function notify(params: NotifyParams = {}): Notifier {
	const { discordUrl = discordConfig.DISCORD_URL, httpClient = fetch } = params;

	return {
		discord: async (message: string, details: any = null): Promise<void> => {
			try {
				const params: DiscordMessage = {
					username: 'commit.jaw.dev',
					content: message,
				};

				if (details) {
					params['embeds'] = [{ title: message, description: JSON.stringify(details) }];
				}

				const res = await httpClient(discordUrl, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(params),
				});

				if (res.status === 204) {
					logger.info(`Discord bot has sent: ${message}`);
				}
			} catch (error) {
				logger.error('Error sending Discord notification:', error);
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
