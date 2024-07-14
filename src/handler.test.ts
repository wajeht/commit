import assert from 'node:assert';
import { describe, it, mock } from 'node:test';
import { getHealthzHandler } from './handler';
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
