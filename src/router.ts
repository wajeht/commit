import {
	getIndexHandler,
	getHealthzHandler,
	getInstallDotShHandler,
	postGenerateCommitMessageHandler,
} from './handler';
import { ai } from './ai';
import path from 'node:path';
import express from 'express';
import fs from 'node:fs/promises';
import { appConfig } from './config';
import { cache, extractDomain, getIpAddress, html } from './util';
import { limitIPsMiddleware, catchAsyncErrorMiddleware } from './middleware';

const commitDotSh = 'commit.sh';
const commitDotShPath = path.resolve(path.join(process.cwd(), 'src', commitDotSh));

const installDotSh = 'install.sh';
const installDotShPath = path.resolve(path.join(process.cwd(), 'src', installDotSh));

const router = express.Router();

router.get(
	'/',
	catchAsyncErrorMiddleware(
		getIndexHandler(fs, cache, commitDotSh, commitDotShPath, html, extractDomain),
	),
);

router.get(
	'/install.sh',
	catchAsyncErrorMiddleware(
		getInstallDotShHandler(fs, cache, installDotSh, installDotShPath, html, extractDomain),
	),
);

router.post(
	'/',
	limitIPsMiddleware(appConfig, getIpAddress),
	catchAsyncErrorMiddleware(postGenerateCommitMessageHandler(ai)),
);

router.get('/healthz', catchAsyncErrorMiddleware(getHealthzHandler(html)));

export { router };
