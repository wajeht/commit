import { app } from './app';
import http from 'node:http';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import { claudeAI, geminiAI } from './ai';
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
	it('should call OpenAI API and return a commit message', async () => {
		const generateCommitMessageMock = mock.method(
			geminiAI,
			'generate',
			async (_diff: string) => 'fix: correct minor typos in code',
		);

		const response = await fetch('http://localhost:3000/', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ diff: 'some codes' }),
		});

		const body = await response.json();

		assert.strictEqual(response.status, 200);
		assert.strictEqual(body.message, 'fix: correct minor typos in code');
		assert.strictEqual(generateCommitMessageMock.mock.calls.length, 1);
	});

	it('should call ClaudeAI API and return a commit message', async () => {
		const generateCommitMessageMock = mock.method(
			claudeAI,
			'generate',
			async (_diff: string) => 'fix: correct minor typos in code',
		);

		const response = await fetch('http://localhost:3000/', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ diff: 'some codes', provider: 'claudeai' }),
		});

		const body = await response.json();

		assert.strictEqual(response.status, 200);
		assert.strictEqual(body.message, 'fix: correct minor typos in code');
		assert.strictEqual(generateCommitMessageMock.mock.calls.length, 1);
	});
});
