import { app } from './app';
import http from 'node:http';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import { claudeAI, openAI } from './ai';
import { describe, it, before, after, mock } from 'node:test';

let server: any;

before((done) => {
	server = http.createServer(app);
	server.listen(3000, done);
});

after((done) => {
	server.close(done);
	mock.reset();
});

describe('GET /healthz', { concurrency: true }, () => {
	it('should reach with content json', async () => {
		const response = await fetch('http://localhost:3000/healthz', {
			headers: {
				'Content-Type': 'application/json',
			},
		});
		const body = await response.json();
		assert.equal(response.status, 200);
		assert.equal(body.message, 'ok');
	});

	it('should reach with html', async () => {
		const response = await fetch('http://localhost:3000/healthz');
		assert.equal(response.status, 200);
		assert.equal(response.headers.get('Content-Type'), 'text/html; charset=utf-8');
	});
});

describe('GET /', { concurrency: true }, () => {
	it('should return the script with domain replaced', async () => {
		const readFileMock = mock.method(fs, 'readFile', async () => 'echo "http://localhost"');
		const response = await fetch('http://localhost:3000/', {
			headers: { 'user-agent': 'curl/8.6.0' },
		});
		const body = await response.text();

		assert.strictEqual(response.status, 200);
		assert.strictEqual(
			response.headers.get('Content-Disposition'),
			'attachment; filename=commit.sh',
		);
		assert.strictEqual(body, 'echo "http://localhost:3000/"');

		assert.strictEqual(readFileMock.mock.calls.length, 1);
	});
});

describe('POST /', { concurrency: true }, () => {
	it('should call OpenAI API and stream a commit message', async () => {
		const mockMessage = 'fix: correct minor typos in code';
		const generateStreamMock = mock.method(
			openAI,
			'generateStream',
			async (diff: string, apiKey: string | undefined, callback: (token: string) => void) => {
				// Simulate streaming by sending each character as a token
				for (const char of mockMessage) {
					callback(char);
				}
				return Promise.resolve();
			},
		);

		const response = await fetch('http://localhost:3000/', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ diff: 'some codes' }),
		});

		assert.strictEqual(response.status, 200);
		assert.strictEqual(response.headers.get('Content-Type'), 'text/event-stream');
		assert.strictEqual(response.headers.get('Cache-Control'), 'no-cache');
		assert.strictEqual(response.headers.get('Connection'), 'keep-alive');

		const reader = response.body?.getReader();
		assert.ok(reader, 'Response body reader should exist');

		let receivedMessage = '';
		let done = false;

		while (!done) {
			const { value, done: isDone } = await reader!.read();
			done = isDone;

			if (value) {
				const chunk = new TextDecoder().decode(value);
				receivedMessage += chunk;
			}
		}

		// Check that the response contains the streamed message data in JSON format
		assert.ok(
			receivedMessage.includes('data: {"token":"f"}'),
			'Response should contain streamed token in JSON format',
		);
		assert.strictEqual(generateStreamMock.mock.calls.length, 1);
	});

	it('should call ClaudeAI API and stream a commit message', async () => {
		const mockMessage = 'fix: correct minor typos in code';
		const generateStreamMock = mock.method(
			claudeAI,
			'generateStream',
			async (diff: string, apiKey: string | undefined, callback: (token: string) => void) => {
				// Simulate streaming by sending each character as a token
				for (const char of mockMessage) {
					callback(char);
				}
				return Promise.resolve();
			},
		);

		const response = await fetch('http://localhost:3000/', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ diff: 'some codes', provider: 'claudeai' }),
		});

		assert.strictEqual(response.status, 200);
		assert.strictEqual(response.headers.get('Content-Type'), 'text/event-stream');
		assert.strictEqual(response.headers.get('Cache-Control'), 'no-cache');
		assert.strictEqual(response.headers.get('Connection'), 'keep-alive');

		const reader = response.body?.getReader();
		assert.ok(reader, 'Response body reader should exist');

		let receivedMessage = '';
		let done = false;

		while (!done) {
			const { value, done: isDone } = await reader!.read();
			done = isDone;

			if (value) {
				const chunk = new TextDecoder().decode(value);
				receivedMessage += chunk;
			}
		}

		// Check that the response contains the streamed message data in JSON format
		assert.ok(
			receivedMessage.includes('data: {"token":"f"}'),
			'Response should contain streamed token in JSON format',
		);
		assert.strictEqual(generateStreamMock.mock.calls.length, 1);
	});
});
