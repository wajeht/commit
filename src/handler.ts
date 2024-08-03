import { ValidationError } from './error';
import { Request, Response } from 'express';
import { GenerateCommitMessageRequest, CacheType, AIService, Provider } from './types';

export function getHealthzHandler(html: (content: string) => string) {
	return (req: Request, res: Response) => {
		if (req.get('Content-Type') === 'application/json') {
			return res.status(200).json({ message: 'ok' });
		}

		return res.setHeader('Content-Type', 'text/html').status(200).send(html('<p>ok</p>'));
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

	const template = (message: string, command: string) => {
		return html(
			`<p>${message} <span style="background-color: #ededed; border-radius: 5px; padding: 5px 10px 5px 10px">${command}</span></p>`,
		);
	};

	return async (req: Request, res: Response) => {
		if (!req.headers['user-agent']?.includes('curl')) {
			const command = `curl -s ${extractDomain(req)}/install.sh | sh`;
			const message = `Run this command from your terminal:`;

			if (req.get('Content-Type') === 'application/json') {
				return res.status(200).json({ message: `${message} ${command}` });
			}

			return res
				.setHeader('Content-Type', 'text/html')
				.status(200)
				.send(template(message, command));
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

	const template = (command: string, message: string) => {
		return html(
			`<p>${message} <span style="background-color: #ededed; border-radius: 5px; padding: 5px 10px 5px 10px">${command}</span></p>`,
		);
	};

	let file = cache.get(commitDotShPath);

	return async (req: Request, res: Response) => {
		if (!req.headers['user-agent']?.includes('curl')) {
			const command = `curl -s ${extractDomain(req)}/ | sh`;
			const message = `Run this command from your terminal:`;

			if (req.get('Content-Type') === 'application/json') {
				return res.status(200).json({ message: `${message} ${command}` });
			}

			return res
				.setHeader('Content-Type', 'text/html')
				.status(200)
				.send(template(command, message));
		}

		if (!file) {
			file = await fs.readFile(commitDotShPath, 'utf-8');
			file = file.replace(/http:\/\/localhost/g, extractDomain(req) + '/');
			cache.set(commitDotShPath, file);
		}

		return res
			.setHeader('Content-Disposition', `attachment; filename=${commitDotSh}`)
			.setHeader('Cache-Control', 'public, max-age=2592000') // Cache for 30 days
			.status(200)
			.send(file);
	};
}

export function postGenerateCommitMessageHandler(
	ai: (type?: Provider, apiKey?: string) => AIService,
) {
	return async (req: GenerateCommitMessageRequest, res: Response) => {
		const { diff, provider, apiKey } = req.body;

		if (!diff || !diff.trim().length) {
			throw new ValidationError('Diff must not be empty!');
		}

		if (provider && provider !== 'openai' && provider !== 'claudeai') {
			throw new ValidationError('Invalid provider specified!');
		}

		// // Note: This is a simple approximation of token length by counting words.
		// // Tokens in GPT-3 are more complex and can be part of a word, punctuation, or whitespace.
		// // For more accurate token counting, consider using a tokenizer library.
		// const MAX_TOKENS = 16385;

		// const tokenLength = diff.split(/\s+/).length;

		// if (tokenLength > MAX_TOKENS) {
		// 	throw new ValidationError('The provided input exceeds the maximum allowed token length.');
		// }

		const message = await ai(provider).generate(diff, apiKey);

		return res.status(200).json({ message });
	};
}
