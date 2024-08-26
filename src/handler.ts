import { ValidationError } from './error';
import { Request, Response } from 'express';
import { GenerateCommitMessageRequest, CacheType, AIService, Provider } from './types';

export function getHealthzHandler(html: (content: string) => string) {
	const message = 'ok';

	return (req: Request, res: Response) => {
		if (req.get('Content-Type') === 'application/json') {
			return res.status(200).json({ message });
		}

		return res.setHeader('Content-Type', 'text/html').status(200).send(html('ok'));
	};
}

export function getInstallDotShHandler(
	fs: typeof import('node:fs/promises'),
	cache: CacheType,
	installDotSh: string,
	installDotShPath: string,
	html: (content: string) => string,
	extractDomain: (req: Request) => string,
) {
	let file = cache.get(installDotShPath);

	let domain = cache.get('domain');

	const message = `Run this command from your terminal:`;

	const template = (command: string) => html(`${message} <span class="command">${command}</span>`);

	return async (req: Request, res: Response) => {
		if (!domain) {
			domain = extractDomain(req);
			cache.set('domain', domain);
		}

		if (!req.headers['user-agent']?.includes('curl')) {
			const command = `curl -s ${domain}/install.sh | sh`;

			if (req.get('Content-Type') === 'application/json') {
				return res.status(200).json({ message: `${message} ${command}` });
			}

			return res.setHeader('Content-Type', 'text/html').status(200).send(template(command));
		}

		if (!file) {
			file = await fs.readFile(installDotShPath, 'utf-8');
			cache.set(installDotShPath, file);
		}

		return res
			.setHeader('Content-Disposition', `attachment; filename=${installDotSh}`)
			.setHeader('Cache-Control', 'public, max-age=2592000') // Cache for 30 days
			.status(200)
			.send(file);
	};
}

export function getIndexHandler(
	fs: typeof import('node:fs/promises'),
	cache: CacheType,
	commitDotSh: string,
	commitDotShPath: string,
	html: (content: string) => string,
	extractDomain: (req: Request) => string,
) {
	let file = cache.get(commitDotShPath);

	let domain = cache.get('domain');

	const message = `Run this command from your terminal:`;

	const template = (command: string) => html(`${message} <span class="command">${command}</span>`);

	return async (req: Request, res: Response) => {
		if (!domain) {
			domain = extractDomain(req);
			cache.set('domain', domain);
		}

		if (!req.headers['user-agent']?.includes('curl')) {
			const command = `curl -s ${domain}/ | sh -- -k 'YOUR_OPEN_AI_API_KEY'`;

			if (req.get('Content-Type') === 'application/json') {
				return res.status(200).json({ message: `${message} ${command}` });
			}

			return res.setHeader('Content-Type', 'text/html').status(200).send(template(command));
		}

		if (!file) {
			file = await fs.readFile(commitDotShPath, 'utf-8');
			file = file.replace(/http:\/\/localhost/g, domain + '/');
			cache.set(commitDotShPath, file);
		}

		return res
			.setHeader('Content-Disposition', `attachment; filename=${commitDotSh}`)
			.setHeader('Cache-Control', 'public, max-age=2592000') // Cache for 30 days
			.status(200)
			.send(file);
	};
}

export function postGenerateCommitMessageHandler(ai: (type?: Provider) => AIService) {
	return async (req: GenerateCommitMessageRequest, res: Response) => {
		const { diff, provider, apiKey } = req.body;

		if (!diff || !diff.trim().length) {
			throw new ValidationError('Diff must not be empty!');
		}

		if (provider && provider !== 'openai' && provider !== 'claudeai') {
			throw new ValidationError('Invalid provider specified!');
		}

		const message = await ai(provider).generate(diff, apiKey);

		return res.status(200).json({ message });
	};
}
