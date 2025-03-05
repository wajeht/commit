import assert from 'node:assert';
import { ValidationError } from './error';
import { Request, Response } from 'express';
import { describe, it, mock } from 'node:test';
import { AIService, CacheType, Provider } from './types';
import { getHealthzHandler, getIndexHandler, postGenerateCommitMessageHandler } from './handler';

describe('getHealthzHandler', { concurrency: true }, () => {
	it('should return ok', () => {
		const req = {
			get: mock.fn((header: string) =>
				header === 'Content-Type' ? 'application/json' : 'application/json',
			),
		} as unknown as Request;

		const status = mock.fn<(status: number) => Response>(() => res);
		const json = mock.fn<(body: any) => Response>(() => res);
		const res = {
			status,
			json,
		} as unknown as Response;
		const html = mock.fn<(content: string) => string>(() => '');

		const handler = getHealthzHandler(html);
		handler(req, res);

		assert.strictEqual(status.mock.calls.length, 1);
		assert.strictEqual(status.mock.calls[0].arguments[0], 200);

		assert.strictEqual(json.mock.calls.length, 1);
		assert.deepStrictEqual(json.mock.calls[0].arguments[0], { message: 'ok' });
	});
});

describe('getIndexHandler', { concurrency: true }, () => {
	it('should return the commit.sh file with the correct headers', async () => {
		const req = {
			headers: {
				'user-agent': 'curl/8.6.0',
			},
		} as unknown as Request;

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

		const html = mock.fn<(content: string) => string>(() => '');

		const extractDomainMock = mock.fn<(req: Request) => string>(() => 'http://example.com');

		const setHeaderMock = mock.fn<(name: string, value: string) => Response>(() => res);
		const statusMock = mock.fn<(status: number) => Response>(() => res);
		const sendMock = mock.fn<(body: any) => Response>(() => res);
		const res = {
			setHeader: setHeaderMock,
			status: statusMock,
			send: sendMock,
		} as unknown as Response;

		const handler = getIndexHandler(
			fs,
			cache,
			'commit.sh',
			'/path/to/commit.sh',
			html,
			extractDomainMock,
		);
		await handler(req, res);

		assert.strictEqual(readFileMock.mock.calls.length, 1);
		assert.strictEqual(readFileMock.mock.calls[0].arguments[0], '/path/to/commit.sh');
		assert.strictEqual(readFileMock.mock.calls[0].arguments[1], 'utf-8');

		assert.strictEqual(extractDomainMock.mock.calls.length, 1);
		assert.strictEqual(extractDomainMock.mock.calls[0].arguments[0], req);

		assert.strictEqual(cacheSetMock.mock.calls.length, 2);
		assert.strictEqual(cacheSetMock.mock.calls[0].arguments[0], 'domain');
		assert.strictEqual(cacheSetMock.mock.calls[0].arguments[1], 'http://example.com');

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
		const req = {
			headers: {
				'user-agent': 'curl/8.6.0',
			},
		} as unknown as Request;

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

		const html = mock.fn<(content: string) => string>(() => '');

		const extractDomainMock = mock.fn<(req: Request) => string>(() => 'http://example.com');

		const setHeaderMock = mock.fn<(name: string, value: string) => Response>(() => res);
		const statusMock = mock.fn<(status: number) => Response>(() => res);
		const sendMock = mock.fn<(body: any) => Response>(() => res);
		const res = {
			setHeader: setHeaderMock,
			status: statusMock,
			send: sendMock,
		} as unknown as Response;

		const handler = getIndexHandler(
			fs,
			cache,
			'commit.sh',
			'/path/to/commit.sh',
			html,
			extractDomainMock,
		);
		await handler(req, res);

		assert.strictEqual(readFileMock.mock.calls.length, 0);

		assert.strictEqual(extractDomainMock.mock.calls.length, 0);

		assert.strictEqual(cacheGetMock.mock.calls.length, 2);
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

	it('should return a message if the user-agent header does not include "curl"', async () => {
		const req = {
			headers: {
				'user-agent': 'Mozilla/5.0',
			},
			get: mock.fn((header: string) =>
				header === 'Content-Type' ? 'application/json' : 'application/json',
			),
		} as unknown as Request;

		const jsonMock = mock.fn<(body: any) => Response>(() => res);
		const statusMock = mock.fn<(status: number) => Response>(() => res);
		const setHeader = mock.fn<(status: number) => Response>(() => res);
		const send = mock.fn<(value: string) => Response>(() => res);
		const res = {
			status: statusMock,
			json: jsonMock,
			setHeader,
			send,
		} as unknown as Response;
		const cachedFile = 'http://example.com';
		const cacheGetMock = mock.fn<(key: string) => string | null>(() => cachedFile);
		const cacheSetMock = mock.fn<(key: string, value: string) => void>();
		const cache: CacheType = {
			get: cacheGetMock,
			set: cacheSetMock,
			clear: mock.fn(),
		};

		const html = mock.fn<(content: string) => string>(() => '');

		const extractDomainMock = mock.fn<(req: Request) => string>(() => 'http://example.com');

		const handler = getIndexHandler(
			{} as unknown as typeof import('node:fs/promises'),
			cache,
			'commit.sh',
			'/path/to/commit.sh',
			html,
			extractDomainMock,
		);
		await handler(req, res);

		assert.strictEqual(statusMock.mock.calls.length, 1);
		assert.strictEqual(statusMock.mock.calls[0].arguments[0], 200);

		assert.strictEqual(jsonMock.mock.calls.length, 1);
		assert.deepStrictEqual(jsonMock.mock.calls[0].arguments[0], {
			message:
				"Run this command from your terminal: curl -s http://example.com/ | sh -- -k 'YOUR_OPEN_AI_API_KEY'",
		});
	});
});

describe('postGenerateCommitMessageHandler', { concurrency: true }, () => {
	const createMockAIService = (mockMessage: string | null) => ({
		generateStream: mock.fn<
			(diff: string, apiKey: string | undefined, callback: (token: string) => void) => Promise<void>
		>(async (_diff, _apiKey, callback) => {
			if (mockMessage) {
				// Simulate streaming by sending each character as a token
				for (const char of mockMessage) {
					callback(char);
				}
			}
			return Promise.resolve();
		}),
	});

	const createMockAIFactory = (mockService: AIService) =>
		mock.fn<(type?: Provider) => AIService>(() => mockService);

	it('should return the generated commit message', async () => {
		const req = {
			body: {
				diff: 'diff --git a/file.txt b/file.txt\nindex 83db48f..f4baaf1 100644\n--- a/file.txt\n+++ b/file.txt\n@@ -1 +1 @@\n-Hello world\n+Hello, world!',
				provider: 'openai',
			},
		} as unknown as Request;

		const setHeaderMock = mock.fn<(...args: any[]) => any>(() => {});
		const writeMock = mock.fn<(...args: any[]) => any>(() => {});
		const endMock = mock.fn<(...args: any[]) => any>(() => {});

		const res = {
			setHeader: setHeaderMock,
			write: writeMock,
			end: endMock,
		} as unknown as Response;

		const mockMessage = 'feat: Add new feature';
		const mockAIService = createMockAIService(mockMessage);
		const mockAIFactory = createMockAIFactory(mockAIService);

		const handler = postGenerateCommitMessageHandler(mockAIFactory);
		await handler(req, res);

		assert.strictEqual(mockAIFactory.mock.calls.length, 1);
		assert.strictEqual(mockAIFactory.mock.calls[0].arguments[0], 'openai');

		assert.strictEqual(mockAIService.generateStream.mock.calls.length, 1);
		assert.strictEqual(setHeaderMock.mock.calls.length, 3); // Three headers set for streaming
		assert(writeMock.mock.calls.length > 0, 'Write method should be called for streaming');
		assert.strictEqual(endMock.mock.calls.length, 1, 'End method should be called once');
	});

	it('should throw a ValidationError if diff is empty', { skip: true }, () => {
		// Skipped test
	});

	it('should throw a ValidationError if invalid provider is specified', { skip: true }, () => {
		// Skipped test
	});

	it('should throw a ValidationError if token context length is exceeded', { skip: true }, () => {
		// Skipped test
	});

	it('should use Claude AI when specified', async () => {
		const req = {
			body: {
				diff: 'diff --git a/file.txt b/file.txt\nindex 83db48f..f4baaf1 100644\n--- a/file.txt\n+++ b/file.txt\n@@ -1 +1 @@\n-Hello world\n+Hello, world!',
				provider: 'claudeai',
			},
		} as unknown as Request;

		const setHeaderMock = mock.fn<(...args: any[]) => any>(() => {});
		const writeMock = mock.fn<(...args: any[]) => any>(() => {});
		const endMock = mock.fn<(...args: any[]) => any>(() => {});

		const res = {
			setHeader: setHeaderMock,
			write: writeMock,
			end: endMock,
		} as unknown as Response;

		const mockMessage = 'feat: Add new feature';
		const mockAIService = createMockAIService(mockMessage);
		const mockAIFactory = createMockAIFactory(mockAIService);

		const handler = postGenerateCommitMessageHandler(mockAIFactory);
		await handler(req, res);

		assert.strictEqual(mockAIFactory.mock.calls.length, 1);
		assert.strictEqual(mockAIFactory.mock.calls[0].arguments[0], 'claudeai');

		assert.strictEqual(mockAIService.generateStream.mock.calls.length, 1);
		assert.strictEqual(setHeaderMock.mock.calls.length, 3); // Three headers set for streaming
		assert(writeMock.mock.calls.length > 0, 'Write method should be called for streaming');
		assert.strictEqual(endMock.mock.calls.length, 1, 'End method should be called once');
	});
});
