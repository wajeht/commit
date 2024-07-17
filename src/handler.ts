import { ValidationError } from './error';
import { Request, Response } from 'express';
import { OpenAIServiceType, CacheType } from './util';

interface GenerateCommitMessageRequest extends Request {
	body: {
		diff: string;
	};
}

export function getHealthzHandler() {
	return (req: Request, res: Response) => {
		return res.status(200).json({ message: 'Ok' });
	};
}

export function getDownloadCommitDotShHandler(
	fs: typeof import('node:fs/promises'),
	cache: CacheType,
	commitDotSh: string,
	commitDotShPath: string,
	extractDomain: (req: Request) => string,
) {
	return async (req: Request, res: Response) => {
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

export function getIndexHandler(extractDomain: (req: Request) => string, commitDotSh: string) {
	return (req: Request, res: Response) => {
		const domain = extractDomain(req);

		const message = `Run this command: 'curl -s ${domain}/${commitDotSh} | sh'`;

		return res.status(200).json({ message });
	};
}

export function postGenerateCommitMessageHandler(OpenAIService: OpenAIServiceType) {
	return async (req: Request, res: Response) => {
		const { diff } = req.body;

		if (!diff || !diff.trim().length) {
			throw new ValidationError('Diff must not be empty!');
		}

		// Note: This is a simple approximation of token length by counting words.
		// Tokens in GPT-3 are more complex and can be part of a word, punctuation, or whitespace.
		// For more accurate token counting, consider using a tokenizer library.
		const MAX_TOKENS = 16385;
		const tokenLength = diff.split(/\s+/).length;

		if (tokenLength > MAX_TOKENS) {
			throw new ValidationError('The provided input exceeds the maximum allowed token length.');
		}

		const message = await OpenAIService.generateCommitMessage(diff);

		return res.status(200).json({ message });
	};
}
