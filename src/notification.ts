import { logger } from './util';
import { Notifier } from './types';

export function notify(
	discordWebhookUrl: string,
	httpClient: (url: string, options: RequestInit) => Promise<Response>,
): Notifier {
	return {
		discord: async (message: string, details: any = null): Promise<void> => {
			try {
				type Params = {
					username: string;
					content: any;
					embeds?: any;
				};

				const params: Params = {
					username: 'commit.jaw.dev',
					content: message,
				};

				if (details) {
					params['embeds'] = [
						{
							title: message,
							description: JSON.stringify(details),
						},
					];
				}

				const res = await httpClient(discordWebhookUrl, {
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
