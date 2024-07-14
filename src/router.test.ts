import { app } from './app';
import http from 'node:http';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import { OpenAIService } from './util';
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

describe('GET /healthz', () => {
	it('should reach', async () => {
		const response = await fetch('http://localhost:3000/healthz');
		const body = await response.json();
		assert.equal(response.status, 200);
		assert.equal(body.message, 'Ok');
	});
});

describe('GET /', () => {
	it('should index', async () => {
		const response = await fetch('http://localhost:3000/');
		const body = await response.json();
		assert.equal(response.status, 200);
		assert.equal(body.message, `Run this command: 'curl -s http://localhost:3000/commit.sh | sh'`);
	});
});

describe('GET /commit.sh', () => {
	it('should return the script with domain replaced', async () => {
		const readFileMock = mock.method(fs, 'readFile', async () => 'echo "http://localhost"');
		const response = await fetch('http://localhost:3000/commit.sh');
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

describe('POST /', () => {
	it('should call OpenAI API and return a commit message', async () => {
		const generateCommitMessageMock = mock.method(
			OpenAIService,
			'generateCommitMessage',
			async (diff: string) => 'fix: correct minor typos in code',
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
});
