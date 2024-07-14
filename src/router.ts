import path from 'node:path';
import express from 'express';
import fs from 'node:fs/promises';
import { cache, extractDomain, OpenAIService } from './util';
import { limitIPsMiddleware, catchAsyncErrorMiddleware } from './middleware';
import {
	getDownloadCommitDotShHandler,
	postGenerateCommitMessageHandler,
	getHealthzHandler,
	getIndexHandler,
} from './handler';

const commitDotSh = 'commit.sh';

const commitDotShPath = path.resolve(path.join(process.cwd(), commitDotSh));

const router = express.Router();

router.get(
	'/commit.sh',
	catchAsyncErrorMiddleware(
		getDownloadCommitDotShHandler(fs, cache, commitDotSh, commitDotShPath, extractDomain),
	),
);

router.post(
	'/',
	limitIPsMiddleware,
	catchAsyncErrorMiddleware(postGenerateCommitMessageHandler(OpenAIService)),
);

router.get('/healthz', catchAsyncErrorMiddleware(getHealthzHandler()));

router.get('/', catchAsyncErrorMiddleware(getIndexHandler(extractDomain, commitDotSh)));

export { router };
