import OpenAI from 'openai';
import assert from 'node:assert';
import { ValidationError } from './error';
import { Request, Response } from 'express';
import { describe, it, mock } from 'node:test';
import { CacheType, OpenAIServiceType } from './util';
import {
	getDownloadCommitDotShHandler,
	getHealthzHandler,
	getIndexHandler,
	postGenerateCommitMessageHandler,
} from './handler';
import { createSourceMapSource } from 'typescript';

describe('getHealthzHandler', () => {
	it('should return ok', () => {
		const req = {} as Request;

		const status = mock.fn<(status: number) => Response>(() => res);
		const json = mock.fn<(body: any) => Response>(() => res);
		const res = {
			status,
			json,
		} as unknown as Response;

		const handler = getHealthzHandler();
		handler(req, res);

		assert.strictEqual(status.mock.calls.length, 1);
		assert.strictEqual(status.mock.calls[0].arguments[0], 200);

		assert.strictEqual(json.mock.calls.length, 1);
		assert.deepStrictEqual(json.mock.calls[0].arguments[0], { message: 'Ok' });
	});
});

describe('getIndexHandler', () => {
	it('should return the correct message', () => {
		const req = {} as Request;

		const extractDomain = mock.fn<(req: Request) => string>(() => 'http://localhost:3000');

		const status = mock.fn<(status: number) => Response>(() => res);
		const json = mock.fn<(body: any) => Response>(() => res);
		const res = {
			status,
			json,
		} as unknown as Response;

		const handler = getIndexHandler(extractDomain, 'commit.sh');
		handler(req, res);

		assert.strictEqual(extractDomain.mock.calls.length, 1);
		assert.strictEqual(extractDomain.mock.calls[0].arguments[0], req);

		assert.strictEqual(status.mock.calls.length, 1);
		assert.strictEqual(status.mock.calls[0].arguments[0], 200);

		const expectedMessage = "Run this command: 'curl -s http://localhost:3000/commit.sh | sh'";
		assert.strictEqual(json.mock.calls.length, 1);
		assert.deepStrictEqual(json.mock.calls[0].arguments[0], { message: expectedMessage });
	});
});

describe('postGenerateCommitMessageHandler', () => {
	it('should return the generated commit message', async () => {
		const req = {
			body: {
				diff: 'diff --git a/file.txt b/file.txt\nindex 83db48f..f4baaf1 100644\n--- a/file.txt\n+++ b/file.txt\n@@ -1 +1 @@\n-Hello world\n+Hello, world!',
			},
		} as unknown as Request;

		const generateCommitMessageMock = mock.fn<(diff: string) => Promise<string | null>>(() =>
			Promise.resolve('fix: correct minor typos in code'),
		);

		const OpenAIService: OpenAIServiceType = {
			openai: {} as OpenAI,
			generateCommitMessage: generateCommitMessageMock,
		};

		const statusMock = mock.fn<(status: number) => Response>(() => res);
		const jsonMock = mock.fn<(body: any) => Response>(() => res);
		const res = {
			status: statusMock,
			json: jsonMock,
		} as unknown as Response;

		const handler = postGenerateCommitMessageHandler(OpenAIService);
		await handler(req, res);

		assert.strictEqual(generateCommitMessageMock.mock.calls.length, 1);
		assert.strictEqual(generateCommitMessageMock.mock.calls[0].arguments[0], req.body.diff);

		assert.strictEqual(statusMock.mock.calls.length, 1);
		assert.strictEqual(statusMock.mock.calls[0].arguments[0], 200);

		assert.strictEqual(jsonMock.mock.calls.length, 1);
		assert.deepStrictEqual(jsonMock.mock.calls[0].arguments[0], {
			message: 'fix: correct minor typos in code',
		});
	});

	it('should throw a ValidationError if diff is empty', async () => {
		const req = {
			body: {
				diff: '',
			},
		} as unknown as Request;

		const generateCommitMessageMock = mock.fn<(diff: string) => Promise<string | null>>();

		const OpenAIService: OpenAIServiceType = {
			openai: {} as OpenAI,
			generateCommitMessage: generateCommitMessageMock,
		};

		const statusMock = mock.fn<(status: number) => Response>(() => res);
		const jsonMock = mock.fn<(body: any) => Response>(() => res);
		const res = {
			status: statusMock,
			json: jsonMock,
		} as unknown as Response;

		const handler = postGenerateCommitMessageHandler(OpenAIService);

		let caughtError: Error | null = null;
		try {
			await handler(req, res);
		} catch (error) {
			caughtError = error;
		}

		assert(caughtError instanceof ValidationError);
		assert.strictEqual(caughtError?.message, 'Diff must not be empty!');

		assert.strictEqual(generateCommitMessageMock.mock.calls.length, 0);

		assert.strictEqual(statusMock.mock.calls.length, 0);
		assert.strictEqual(jsonMock.mock.calls.length, 0);
	});

	it('should throw a ValidationError if token context length is exceeded', async () => {
		const req = {
			body: {
				diff: 'A very large diff that exceeds the maximum token length limit...',
			},
		} as unknown as Request;

		const generateCommitMessageMock = mock.fn<(diff: string) => Promise<string | null>>(() =>
			Promise.reject(
				new ValidationError('The provided input exceeds the maximum allowed token length.'),
			),
		);

		const OpenAIService: OpenAIServiceType = {
			openai: {} as OpenAI,
			generateCommitMessage: generateCommitMessageMock,
		};

		const statusMock = mock.fn<(status: number) => Response>(() => res);
		const jsonMock = mock.fn<(body: any) => Response>(() => res);
		const res = {
			status: statusMock,
			json: jsonMock,
		} as unknown as Response;

		const handler = postGenerateCommitMessageHandler(OpenAIService);

		let caughtError: Error | null = null;
		try {
			await handler(req, res);
		} catch (error) {
			caughtError = error;
		}

		assert(caughtError instanceof ValidationError);
		assert.strictEqual(
			caughtError?.message,
			'The provided input exceeds the maximum allowed token length.',
		);

		assert.strictEqual(generateCommitMessageMock.mock.calls.length, 1);
		assert.strictEqual(statusMock.mock.calls.length, 0);
		assert.strictEqual(jsonMock.mock.calls.length, 0);
	});
});
describe('getDownloadCommitDotShHandler', () => {
	it('should return the commit.sh file with the correct headers', async () => {
		const req = {} as Request;

		const readFileMock = mock.fn<(path: string, encoding: string) => Promise<string>>(() =>
			Promise.resolve('echo "http://localhost"'),
		);

		const fs = {
			readFile: readFileMock,
		} as unknown as typeof import('node:fs/promises');

		const cacheGetMock = mock.fn<(key: string) => string | null>(() => null);
		const cacheSetMock = mock.fn<(key: string, value: string) => void>();
		const cache: CacheType = {
			get: cacheGetMock,
			set: cacheSetMock,
			clear: mock.fn(),
		};

		const extractDomainMock = mock.fn<(req: Request) => string>(() => 'http://example.com');

		const setHeaderMock = mock.fn<(name: string, value: string) => Response>(() => res);
		const statusMock = mock.fn<(status: number) => Response>(() => res);
		const sendMock = mock.fn<(body: any) => Response>(() => res);
		const res = {
			setHeader: setHeaderMock,
			status: statusMock,
			send: sendMock,
		} as unknown as Response;

		const handler = getDownloadCommitDotShHandler(
			fs,
			cache,
			'commit.sh',
			'/path/to/commit.sh',
			extractDomainMock,
		);
		await handler(req, res);

		assert.strictEqual(readFileMock.mock.calls.length, 1);
		assert.strictEqual(readFileMock.mock.calls[0].arguments[0], '/path/to/commit.sh');
		assert.strictEqual(readFileMock.mock.calls[0].arguments[1], 'utf-8');

		assert.strictEqual(extractDomainMock.mock.calls.length, 1);
		assert.strictEqual(extractDomainMock.mock.calls[0].arguments[0], req);

		assert.strictEqual(cacheSetMock.mock.calls.length, 1);
		assert.strictEqual(cacheSetMock.mock.calls[0].arguments[0], '/path/to/commit.sh');
		assert.strictEqual(cacheSetMock.mock.calls[0].arguments[1], 'echo "http://example.com/"');

		assert.strictEqual(setHeaderMock.mock.calls.length, 2);
		assert.strictEqual(setHeaderMock.mock.calls[0].arguments[0], 'Content-Disposition');
		assert.strictEqual(setHeaderMock.mock.calls[0].arguments[1], 'attachment; filename=commit.sh');
		assert.strictEqual(setHeaderMock.mock.calls[1].arguments[0], 'Cache-Control');
		assert.strictEqual(setHeaderMock.mock.calls[1].arguments[1], 'public, max-age=2592000');

		assert.strictEqual(statusMock.mock.calls.length, 1);
		assert.strictEqual(statusMock.mock.calls[0].arguments[0], 200);

		assert.strictEqual(sendMock.mock.calls.length, 1);
		assert.strictEqual(sendMock.mock.calls[0].arguments[0], 'echo "http://example.com/"');
	});

	it('should return the cached commit.sh file if available', async () => {
		const req = {} as Request;

		const readFileMock = mock.fn<(path: string, encoding: string) => Promise<string>>();
		const fs = {
			readFile: readFileMock,
		} as unknown as typeof import('node:fs/promises');

		const cachedFile = 'echo "http://example.com/"';
		const cacheGetMock = mock.fn<(key: string) => string | null>(() => cachedFile);
		const cacheSetMock = mock.fn<(key: string, value: string) => void>();
		const cache: CacheType = {
			get: cacheGetMock,
			set: cacheSetMock,
			clear: mock.fn(),
		};

		const extractDomainMock = mock.fn<(req: Request) => string>(() => 'http://example.com');

		const setHeaderMock = mock.fn<(name: string, value: string) => Response>(() => res);
		const statusMock = mock.fn<(status: number) => Response>(() => res);
		const sendMock = mock.fn<(body: any) => Response>(() => res);
		const res = {
			setHeader: setHeaderMock,
			status: statusMock,
			send: sendMock,
		} as unknown as Response;

		const handler = getDownloadCommitDotShHandler(
			fs,
			cache,
			'commit.sh',
			'/path/to/commit.sh',
			extractDomainMock,
		);
		await handler(req, res);

		assert.strictEqual(readFileMock.mock.calls.length, 0);

		assert.strictEqual(extractDomainMock.mock.calls.length, 0);

		assert.strictEqual(cacheGetMock.mock.calls.length, 1);
		assert.strictEqual(cacheGetMock.mock.calls[0].arguments[0], '/path/to/commit.sh');

		assert.strictEqual(cacheSetMock.mock.calls.length, 0);

		assert.strictEqual(setHeaderMock.mock.calls.length, 2);
		assert.strictEqual(setHeaderMock.mock.calls[0].arguments[0], 'Content-Disposition');
		assert.strictEqual(setHeaderMock.mock.calls[0].arguments[1], 'attachment; filename=commit.sh');
		assert.strictEqual(setHeaderMock.mock.calls[1].arguments[0], 'Cache-Control');
		assert.strictEqual(setHeaderMock.mock.calls[1].arguments[1], 'public, max-age=2592000');

		assert.strictEqual(statusMock.mock.calls.length, 1);
		assert.strictEqual(statusMock.mock.calls[0].arguments[0], 200);

		assert.strictEqual(sendMock.mock.calls.length, 1);
		assert.strictEqual(sendMock.mock.calls[0].arguments[0], cachedFile);
	});
});
