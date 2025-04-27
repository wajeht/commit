import {
	HttpError,
	NotFoundError,
	ForbiddenError,
	ValidationError,
	UnauthorizedError,
	UnimplementedFunctionError,
} from './error';
import assert from 'assert';
import { describe, it, mock } from 'node:test';
import { Request, Response, NextFunction } from 'express';
import { errorMiddleware, limitIPsMiddleware, notFoundMiddleware } from './middleware';

describe('limitIPsMiddleware', { concurrency: true }, () => {
	it('should call next() if IP is allowed', () => {
		const req = {
			headers: {},
			query: {},
		} as unknown as Request;
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

	it('should call next() if API key is in headers', () => {
		const req = {
			headers: {
				'x-api-key': 'valid-key',
			},
		} as unknown as Request;
		const res = {} as Response;
		const nextMock = mock.fn<NextFunction>();

		const appConfig = { IPS: '127.0.0.1, 192.168.1.1' };
		const getIpAddressMock = mock.fn<(req: Request) => string>(() => '10.0.0.1');

		const middleware = limitIPsMiddleware(appConfig, getIpAddressMock);
		middleware(req, res, nextMock);

		assert.strictEqual(getIpAddressMock.mock.calls.length, 0);
		assert.strictEqual(nextMock.mock.calls.length, 1);
		assert.strictEqual(nextMock.mock.calls[0].arguments.length, 0);
	});

	it('should call next() if API key is in query parameters', () => {
		const req = {
			headers: {},
			query: {
				apiKey: 'valid-key',
			},
		} as unknown as Request;
		const res = {} as Response;
		const nextMock = mock.fn<NextFunction>();

		const appConfig = { IPS: '127.0.0.1, 192.168.1.1' };
		const getIpAddressMock = mock.fn<(req: Request) => string>(() => '10.0.0.1');

		const middleware = limitIPsMiddleware(appConfig, getIpAddressMock);
		middleware(req, res, nextMock);

		assert.strictEqual(getIpAddressMock.mock.calls.length, 0);
		assert.strictEqual(nextMock.mock.calls.length, 1);
		assert.strictEqual(nextMock.mock.calls[0].arguments.length, 0);
	});

	it('should call next() with ForbiddenError if IP is not allowed', () => {
		const req = {
			headers: {},
			query: {},
		} as Request;
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

	it('should handle flexible IP format with different separators', () => {
		const req = {
			headers: {},
			query: {},
		} as unknown as Request;
		const res = {} as Response;
		const nextMock = mock.fn<NextFunction>();

		const appConfig = { IPS: '127.0.0.1,192.168.1.1,  10.0.0.1' };
		const getIpAddressMock = mock.fn<(req: Request) => string>(() => '10.0.0.1');

		const middleware = limitIPsMiddleware(appConfig, getIpAddressMock);
		middleware(req, res, nextMock);

		assert.strictEqual(getIpAddressMock.mock.calls.length, 1);
		assert.strictEqual(nextMock.mock.calls.length, 1);
		assert.strictEqual(nextMock.mock.calls[0].arguments.length, 0);
	});

	it('should call next() with error if an exception occurs', () => {
		const req = {
			headers: {},
			query: {},
		} as unknown as Request;
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

describe('notFoundMiddleware', { concurrency: true }, () => {
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

describe('errorMiddleware', { concurrency: true }, () => {
	it('should return 403 for ForbiddenError', () => {
		const req = {
			headers: {
				'user-agent': 'Mozilla/5.0',
			},
			get: mock.fn((header: string) => (header === 'Content-Type' ? 'application/json' : null)),
		} as unknown as Request;

		const json = mock.fn<(body: any) => Response>(() => res);
		const status = mock.fn<(status: number) => Response>(() => res);
		const setHeader = mock.fn<(status: number) => Response>(() => res);
		const send = mock.fn<(value: string) => Response>(() => res);
		const res = {
			status,
			json,
			setHeader,
			send,
		} as unknown as Response;

		const nextMock = mock.fn<NextFunction>();
		const error = new ForbiddenError();

		const middleware = errorMiddleware();
		middleware(error, req, res, nextMock);

		assert.strictEqual(status.mock.calls.length, 1);
		assert.strictEqual(status.mock.calls[0].arguments[0], 403);
		assert.strictEqual(json.mock.calls.length, 1);
		assert.strictEqual(json.mock.calls[0].arguments[0].message, 'Forbidden');
	});

	it('should return 401 for UnauthorizedError', () => {
		const req = {
			headers: {
				'user-agent': 'Mozilla/5.0',
			},
			get: mock.fn((header: string) => (header === 'Content-Type' ? 'application/json' : null)),
		} as unknown as Request;

		const json = mock.fn<(body: any) => Response>(() => res);
		const status = mock.fn<(status: number) => Response>(() => res);
		const setHeader = mock.fn<(status: number) => Response>(() => res);
		const send = mock.fn<(value: string) => Response>(() => res);
		const res = {
			status,
			json,
			setHeader,
			send,
		} as unknown as Response;

		const nextMock = mock.fn<NextFunction>();
		const error = new UnauthorizedError();
		const middleware = errorMiddleware();
		middleware(error, req, res, nextMock);

		assert.strictEqual(status.mock.calls.length, 1);
		assert.strictEqual(status.mock.calls[0].arguments[0], 401);
		assert.strictEqual(json.mock.calls.length, 1);
		assert.strictEqual(json.mock.calls[0].arguments[0].message, 'Unauthorized');
	});

	it('should return 404 for NotFoundError', () => {
		const req = {
			headers: {
				'user-agent': 'Mozilla/5.0',
			},
			get: mock.fn((header: string) => (header === 'Content-Type' ? 'application/json' : null)),
		} as unknown as Request;

		const json = mock.fn<(body: any) => Response>(() => res);
		const status = mock.fn<(status: number) => Response>(() => res);
		const setHeader = mock.fn<(status: number) => Response>(() => res);
		const send = mock.fn<(value: string) => Response>(() => res);
		const res = {
			status,
			json,
			setHeader,
			send,
		} as unknown as Response;

		const nextMock = mock.fn<NextFunction>();
		const error = new NotFoundError();
		const middleware = errorMiddleware();
		middleware(error, req, res, nextMock);

		assert.strictEqual(status.mock.calls.length, 1);
		assert.strictEqual(status.mock.calls[0].arguments[0], 404);
		assert.strictEqual(json.mock.calls.length, 1);
		assert.strictEqual(json.mock.calls[0].arguments[0].message, 'Not Found');
	});

	it('should return 422 for ValidationError', () => {
		const req = {
			headers: {
				'user-agent': 'Mozilla/5.0',
			},
			get: mock.fn((header: string) => (header === 'Content-Type' ? 'application/json' : null)),
		} as unknown as Request;

		const json = mock.fn<(body: any) => Response>(() => res);
		const status = mock.fn<(status: number) => Response>(() => res);
		const setHeader = mock.fn<(status: number) => Response>(() => res);
		const send = mock.fn<(value: string) => Response>(() => res);
		const res = {
			status,
			json,
			setHeader,
			send,
		} as unknown as Response;

		const nextMock = mock.fn<NextFunction>();
		const error = new ValidationError();
		const middleware = errorMiddleware();
		middleware(error, req, res, nextMock);

		assert.strictEqual(status.mock.calls.length, 1);
		assert.strictEqual(status.mock.calls[0].arguments[0], 422);
		assert.strictEqual(json.mock.calls.length, 1);
		assert.strictEqual(json.mock.calls[0].arguments[0].message, 'Validation Error');
	});

	it('should return 501 for UnimplementedFunctionError', () => {
		const req = {
			headers: {
				'user-agent': 'Mozilla/5.0',
			},
			get: mock.fn((header: string) => (header === 'Content-Type' ? 'application/json' : null)),
		} as unknown as Request;

		const json = mock.fn<(body: any) => Response>(() => res);
		const status = mock.fn<(status: number) => Response>(() => res);
		const setHeader = mock.fn<(status: number) => Response>(() => res);
		const send = mock.fn<(value: string) => Response>(() => res);
		const res = {
			status,
			json,
			setHeader,
			send,
		} as unknown as Response;

		const nextMock = mock.fn<NextFunction>();
		const error = new UnimplementedFunctionError();
		const middleware = errorMiddleware();
		middleware(error, req, res, nextMock);

		assert.strictEqual(status.mock.calls.length, 1);
		assert.strictEqual(status.mock.calls[0].arguments[0], 501);
		assert.strictEqual(json.mock.calls.length, 1);
		assert.strictEqual(json.mock.calls[0].arguments[0].message, 'Function Not Implemented');
	});

	it('should return the statusCode and message from HttpError', () => {
		const req = {
			headers: {
				'user-agent': 'Mozilla/5.0',
			},
			get: mock.fn((header: string) => (header === 'Content-Type' ? 'application/json' : null)),
		} as unknown as Request;

		const json = mock.fn<(body: any) => Response>(() => res);
		const status = mock.fn<(status: number) => Response>(() => res);
		const setHeader = mock.fn<(status: number) => Response>(() => res);
		const send = mock.fn<(value: string) => Response>(() => res);
		const res = {
			status,
			json,
			setHeader,
			send,
		} as unknown as Response;

		const nextMock = mock.fn<NextFunction>();
		const error = new HttpError(418, 'I am a teapot');
		const middleware = errorMiddleware();
		middleware(error, req, res, nextMock);

		assert.strictEqual(status.mock.calls.length, 1);
		assert.strictEqual(status.mock.calls[0].arguments[0], 418);
		assert.strictEqual(json.mock.calls.length, 1);
		assert.strictEqual(json.mock.calls[0].arguments[0].message, 'I am a teapot');
	});

	it('should return 500 for a generic error', () => {
		const req = {
			headers: {
				'user-agent': 'Mozilla/5.0',
			},
			get: mock.fn((header: string) => (header === 'Content-Type' ? 'application/json' : null)),
		} as unknown as Request;

		const json = mock.fn<(body: any) => Response>(() => res);
		const status = mock.fn<(status: number) => Response>(() => res);
		const setHeader = mock.fn<(status: number) => Response>(() => res);
		const send = mock.fn<(value: string) => Response>(() => res);
		const res = {
			status,
			json,
			setHeader,
			send,
		} as unknown as Response;

		const nextMock = mock.fn<NextFunction>();
		const error = new HttpError(500, 'Generic error');
		const middleware = errorMiddleware();
		middleware(error, req, res, nextMock);

		assert.strictEqual(status.mock.calls.length, 1);
		assert.strictEqual(status.mock.calls[0].arguments[0], 500);
		assert.strictEqual(json.mock.calls.length, 1);
		assert.strictEqual(json.mock.calls[0].arguments[0].message, 'Generic error');
	});
});
