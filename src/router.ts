import path from 'node:path';
import express from 'express';
import fs from 'node:fs/promises';
import { cache, extractDomain, getIpAddress } from './util';
import { limitIPsMiddleware, catchAsyncErrorMiddleware } from './middleware';
import { aiProviders } from './ai';
import {
	getDownloadCommitDotShHandler,
	postGenerateCommitMessageHandler,
	getHealthzHandler,
	getIndexHandler,
} from './handler';
import { appConfig } from './config';

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
	catchAsyncErrorMiddleware(postGenerateCommitMessageHandler(aiProviders)),
);

router.get('/healthz', catchAsyncErrorMiddleware(getHealthzHandler()));

router.get('/', catchAsyncErrorMiddleware(getIndexHandler(extractDomain, commitDotSh)));

export { router };
