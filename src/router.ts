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
import { limitIPsMiddleware } from './middleware';
import { cache, extractDomain, getIpAddress, html } from './util';

const commitDotSh = 'commit.sh';
const commitDotShPath = path.resolve(path.join(process.cwd(), 'src', commitDotSh));

const installDotSh = 'install.sh';
const installDotShPath = path.resolve(path.join(process.cwd(), 'src', installDotSh));

const router = express.Router();

router.get('/healthz', getHealthzHandler(html));

router.get('/', getIndexHandler(fs, cache, commitDotSh, commitDotShPath, html, extractDomain));

router.post('/', limitIPsMiddleware(appConfig, getIpAddress), postGenerateCommitMessageHandler(ai));

router.get(
	'/install.sh',
	getInstallDotShHandler(fs, cache, installDotSh, installDotShPath, html, extractDomain),
);

export { router };
