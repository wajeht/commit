import assert from 'node:assert';
import { describe, it, mock } from 'node:test';
import { getHealthzHandler, getIndexHandler } from './handler';
import { Request, Response } from 'express';

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
