import express from 'express';
import { limitIPsMiddleware, catchAsyncErrorMiddleware } from './middleware';
import {
	getDownloadCommitDotShHandler,
	postGenerateCommitMessageHandler,
	getHealthzHandler,
	getIndexHandler,
} from './handler';

const router = express.Router();

router.get('/healthz', catchAsyncErrorMiddleware(getHealthzHandler));

router.get('/commit.sh', catchAsyncErrorMiddleware(getDownloadCommitDotShHandler));

router.get('/', catchAsyncErrorMiddleware(getIndexHandler));

router.post('/', limitIPsMiddleware, catchAsyncErrorMiddleware(postGenerateCommitMessageHandler));

export default router;
