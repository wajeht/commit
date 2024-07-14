import path from 'node:path';
import fs from 'node:fs/promises';
import { ValidationError } from './error';
import { Request, Response } from 'express';
import { extractDomain, cache, OpenAIService, getRandomElement } from './util';

const commitDotSh = 'commit.sh';
const commitDotShPath = path.resolve(path.join(process.cwd(), commitDotSh));

interface GenerateCommitMessageRequest extends Request {
	body: {
		diff: string;
	};
}

export function getHealthzHandler(req: Request, res: Response) {
	return res.status(200).json({ message: 'Ok' });
}

export async function getDownloadCommitDotShHandler(req: Request, res: Response) {
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
}

export function getIndexHandler(req: Request, res: Response) {
	const domain = extractDomain(req);

	const message = `Run this command: 'curl -s ${domain}/${commitDotSh} | sh'`;

	return res.status(200).json({ message });
}

export async function postGenerateCommitMessageHandler(
	req: GenerateCommitMessageRequest,
	res: Response,
) {
	const { diff } = req.body;

	if (!diff || !diff.trim().length) throw new ValidationError('Diff must not be empty!');

	const message = await OpenAIService.generateCommitMessage(diff);

	return res.status(200).json({ message });
}
