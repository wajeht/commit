import assert from 'assert';
import { describe, it, mock } from 'node:test';
import { Request, Response, NextFunction } from 'express';
import { limitIPsMiddleware, notFoundMiddleware } from './middleware';
import { ForbiddenError, NotFoundError } from './error';

describe('limitIPsMiddleware', () => {
	it('should call next() if IP is allowed', () => {
		const req = {} as Request;
		const res = {} as Response;
		const nextMock = mock.fn<NextFunction>();

		const appConfig = { IPS: '127.0.0.1, 192.168.1.1' };
		const getIpAddressMock = mock.fn<(req: Request) => string>(() => '127.0.0.1');

		const middleware = limitIPsMiddleware(appConfig, getIpAddressMock);
		middleware(req, res, nextMock);

		assert.strictEqual(getIpAddressMock.mock.calls.length, 1);
		assert.strictEqual(getIpAddressMock.mock.calls[0].arguments[0], req);

		assert.strictEqual(nextMock.mock.calls.length, 1);
		assert.strictEqual(nextMock.mock.calls[0].arguments.length, 0);
	});

	it('should call next() with ForbiddenError if IP is not allowed', () => {
		const req = {} as Request;
		const res = {} as Response;
		const nextMock = mock.fn<NextFunction>();

		const appConfig = { IPS: '127.0.0.1, 192.168.1.1' };
		const getIpAddressMock = mock.fn<(req: Request) => string>(() => '10.0.0.1');

		const middleware = limitIPsMiddleware(appConfig, getIpAddressMock);
		middleware(req, res, nextMock);

		assert.strictEqual(getIpAddressMock.mock.calls.length, 1);
		assert.strictEqual(getIpAddressMock.mock.calls[0].arguments[0], req);

		assert.strictEqual(nextMock.mock.calls.length, 1);
		const error = nextMock.mock.calls[0].arguments[0] as unknown;
		assert(error instanceof ForbiddenError);
	});

	it('should call next() with error if an exception occurs', () => {
		const req = {} as Request;
		const res = {} as Response;
		const nextMock = mock.fn<NextFunction>();

		const appConfig = { IPS: '127.0.0.1, 192.168.1.1' };
		const getIpAddressMock = mock.fn<(req: Request) => string>(() => {
			throw new Error('Test error');
		});

		const middleware = limitIPsMiddleware(appConfig, getIpAddressMock);
		middleware(req, res, nextMock);

		assert.strictEqual(getIpAddressMock.mock.calls.length, 1);
		assert.strictEqual(getIpAddressMock.mock.calls[0].arguments[0], req);

		assert.strictEqual(nextMock.mock.calls.length, 1);
		const error = nextMock.mock.calls[0].arguments[0] as unknown;
		assert(error instanceof Error);
		assert.strictEqual(error.message, 'Test error');
	});
});

describe('notFoundMiddleware', () => {
	it('should throw NotFoundError', () => {
		const req = {} as Request;
		const res = {} as Response;
		const nextMock = mock.fn<NextFunction>();

		try {
			notFoundMiddleware(req, res, nextMock);
		} catch (error) {
			assert(error instanceof NotFoundError);
			assert.strictEqual(error.message, 'Not Found');
			return;
		}

		assert.fail('NotFoundError was not thrown');
	});
});
