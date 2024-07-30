import { ValidationError } from './error';
import { Request, Response } from 'express';
import { GenerateCommitMessageRequest, CacheType, AIService, Provider } from './types';

export function getHealthzHandler() {
	return (req: Request, res: Response) => {
		return res.status(200).json({ message: 'Ok' });
	};
}

export function getIndexHandler(
	fs: typeof import('node:fs/promises'),
	cache: CacheType,
	commitDotSh: string,
	commitDotShPath: string,
	extractDomain: (req: Request) => string,
) {
	return async (req: Request, res: Response) => {
		if (!req.headers['user-agent']?.includes('curl')) {
			const command = `'curl -s ${extractDomain(req)}/ | sh'`;
			const message = `Run this command from your terminal:`;

			if (req.get('Content-Type') === 'application/json') {
				return res.status(200).json({ message: `${message} ${command}` });
			}

			const html = `
				<!DOCTYPE html>
				<html lang="en">
				<head>
						<meta charset="UTF-8">
						<meta http-equiv="X-UA-Compatible" content="IE=edge">
						<meta name="viewport" content="width=device-width, initial-scale=1.0">
						<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%2210 0 100 100%22><text y=%22.90em%22 font-size=%2290%22>🤖</text></svg>"></link>
						<script defer data-domain="commit.jaw.dev" src="https://plausible.jaw.dev/js/script.js"></script>
						<title>commit</title>
				</head>
				<body>
					<p>${message} <span style="background-color: #ededed; border-radius: 5px; padding: 5px 10px 5px 10px">${command}</span></p>
				</body>
				</html>`;
			return res.setHeader('Content-Type', 'text/html').status(200).send(html);
		}

		let file = cache.get(commitDotShPath);

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

export function postGenerateCommitMessageHandler(ai: (type?: Provider) => AIService) {
	return async (req: GenerateCommitMessageRequest, res: Response) => {
		const { diff, provider } = req.body;

		if (!diff || !diff.trim().length) {
			throw new ValidationError('Diff must not be empty!');
		}

		if (provider && provider !== 'openai' && provider !== 'claudeai') {
			throw new ValidationError('Invalid provider specified!');
		}

		// Note: This is a simple approximation of token length by counting words.
		// Tokens in GPT-3 are more complex and can be part of a word, punctuation, or whitespace.
		// For more accurate token counting, consider using a tokenizer library.
		const MAX_TOKENS = 16385;

		const tokenLength = diff.split(/\s+/).length;

		if (tokenLength > MAX_TOKENS) {
			throw new ValidationError('The provided input exceeds the maximum allowed token length.');
		}

		const message = await ai(provider).generateCommitMessage(diff);

		return res.status(200).json({ message });
	};
}
