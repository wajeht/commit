import path from 'node:path';
import express from 'express';
import fs from 'node:fs/promises';
import { appConfig } from './config';
import { aiProvider } from './ai';
import { cache, extractDomain, getIpAddress } from './util';
import { limitIPsMiddleware, catchAsyncErrorMiddleware } from './middleware';
import {
	getDownloadCommitDotShHandler,
	postGenerateCommitMessageHandler,
	getHealthzHandler,
	getIndexHandler,
} from './handler';

const commitDotSh = 'commit.sh';

const commitDotShPath = path.resolve(path.join(process.cwd(), 'src', commitDotSh));

const router = express.Router();

router.get(
	'/commit.sh',
	catchAsyncErrorMiddleware(
		getDownloadCommitDotShHandler(fs, cache, commitDotSh, commitDotShPath, extractDomain),
	),
);

router.post(
	'/',
	limitIPsMiddleware(appConfig, getIpAddress),
	catchAsyncErrorMiddleware(postGenerateCommitMessageHandler(aiProvider)),
);

router.get('/healthz', catchAsyncErrorMiddleware(getHealthzHandler()));

router.get('/', catchAsyncErrorMiddleware(getIndexHandler(extractDomain, commitDotSh)));

export { router };
