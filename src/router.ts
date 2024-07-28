import path from 'node:path';
import express from 'express';
import fs from 'node:fs/promises';
import { appConfig } from './config';
import { ai } from './ai';
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

router.get(
	'/',
	catchAsyncErrorMiddleware(
		getIndexHandler(fs, cache, commitDotSh, commitDotShPath, extractDomain),
	),
);

router.post(
	'/',
	limitIPsMiddleware(appConfig, getIpAddress),
	catchAsyncErrorMiddleware(postGenerateCommitMessageHandler(ai)),
);

router.get('/healthz', catchAsyncErrorMiddleware(getHealthzHandler()));


export { router };
