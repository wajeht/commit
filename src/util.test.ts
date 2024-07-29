import {
	cache,
	logger,
	extractDomain,
	getIpAddress,
	getRandomElement,
	validateConfig,
} from './util';
import assert from 'node:assert';
import { Request } from 'express';
import { describe, it, beforeEach, afterEach } from 'node:test';

describe('Cache', () => {
	it('should set and get a value', () => {
		cache.set('key1', 'value1');
		assert.equal(cache.get('key1'), 'value1');
	});

	it('should return null for a non-existent key', () => {
		assert.equal(cache.get('nonExistentKey'), null);
	});

	it('should clear a value', () => {
		cache.set('key2', 'value2');
		cache.clear('key2');
		assert.equal(cache.get('key2'), null);
	});
});

describe('logger', () => {
	it('should log debug messages', () => {
		const originalDebug = console.debug;
		let output = '';

		console.debug = (...args: any) => {
			output += args.join(' ');
		};

		logger.debug('Debug message');
		assert(output.includes('🐛'), 'Debug log does not contain the expected emoji');
		assert(output.includes('Debug message'), 'Debug log does not contain the expected message');

		console.debug = originalDebug;
	});

	it('should log error messages', () => {
		const originalError = console.error;
		let output = '';

		console.error = (...args: any) => {
			output += args.join(' ');
		};

		logger.error('Error message');
		assert(output.includes('❌'), 'Error log does not contain the expected emoji');
		assert(output.includes('Error message'), 'Error log does not contain the expected message');

		console.error = originalError;
	});

	it('should log info messages', () => {
		const originalInfo = console.info;
		let output = '';

		console.info = (...args: any) => {
			output += args.join(' ');
		};

		logger.info('Info message');

		assert(output.includes('✅'), 'Info log does not contain the expected emoji');
		assert(output.includes('Info message'), 'Info log does not contain the expected message');

		console.info = originalInfo;
	});
});

describe('extractDomain', () => {
	it('should extract domain with port', () => {
		const req = {
			hostname: 'example.com',
			protocol: 'https',
			get: (header: any) => 'example.com:443',
		};

		const result = extractDomain(req as Request);

		assert.equal(result, 'https://example.com:443');
	});

	it('should extract domain without port', () => {
		const req = {
			hostname: 'example.com',
			protocol: 'https',
			get: (header: any) => 'example.com',
		};

		const result = extractDomain(req as Request);

		assert.equal(result, 'https://example.com');
	});
});

describe('getIpAddress', () => {
	it('should get IP address from x-forwarded-for header (string)', () => {
		const req = {
			headers: {
				'x-forwarded-for': '127.0.0.1',
			},
		} as unknown as Request;

		const ip = getIpAddress(req);

		assert.equal(ip, '127.0.0.1');
	});

	it('should get IP address from x-forwarded-for header (array)', () => {
		const req = {
			headers: {
				'x-forwarded-for': ['127.0.0.1'],
			},
		} as unknown as Request;

		const ip = getIpAddress(req);

		assert.equal(ip, '127.0.0.1');
	});

	it('should get IP address from req.ip if x-forwarded-for is not present', () => {
		const req = {
			headers: {},
			ip: '192.168.1.1',
			socket: {},
		} as unknown as Request;

		const ip = getIpAddress(req);

		assert.equal(ip, '192.168.1.1');
	});

	it('should get IP address from remoteAddress if x-forwarded-for and req.ip are not present', () => {
		const req = {
			headers: {},
			socket: {
				remoteAddress: '192.168.1.1',
			},
		} as unknown as Request;

		const ip = getIpAddress(req);

		assert.equal(ip, '192.168.1.1');
	});

	it('should return an empty string if no IP address is found', () => {
		const req = {
			headers: {},
			socket: {},
		} as unknown as Request;

		const ip = getIpAddress(req);

		assert.equal(ip, '');
	});

	it('should handle x-forwarded-for header with multiple IPs', () => {
		const req = {
			headers: {
				'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178',
			},
		} as unknown as Request;

		const ip = getIpAddress(req);

		assert.equal(ip, '203.0.113.195');
	});

	it('should handle x-forwarded-for header with spaces and multiple IPs', () => {
		const req = {
			headers: {
				'x-forwarded-for': ' 203.0.113.195 , 70.41.3.18 , 150.172.238.178 ',
			},
		} as unknown as Request;

		const ip = getIpAddress(req);

		assert.equal(ip, '203.0.113.195');
	});

	it('should handle x-forwarded-for header with only one IP', () => {
		const req = {
			headers: {
				'x-forwarded-for': '203.0.113.195',
			},
		} as unknown as Request;

		const ip = getIpAddress(req);

		assert.equal(ip, '203.0.113.195');
	});
});

describe('getRandomElement', () => {
	it('should return an element from the list', () => {
		const list = [1, 2, 3, 4, 5];
		const element = getRandomElement(list);
		assert.equal(list.includes(element), true);
	});

	it('should return the only element when the list has one item', () => {
		const list = ['192.168.1.1'];
		const element = getRandomElement(list);
		assert.equal(element, '192.168.1.1');
	});

	it('should handle an empty list', () => {
		const list: any[] = [];
		assert.equal(null, getRandomElement(list));
	});
});

describe('validateConfig', () => {
	let originalLoggerError: (...args: any[]) => void;
	let loggerOutput: string;

	beforeEach(() => {
		// Mock logger.error
		originalLoggerError = logger.error;
		loggerOutput = '';

		logger.error = (...args: any) => {
			loggerOutput += args.join(' ');
		};
	});

	afterEach(() => {
		logger.error = originalLoggerError;
	});

	it('should return the correct config with defaults and types', () => {
		process.env.HOSTNAME = '127.0.0.1';
		process.env.PORT = '6969';

		const config = {
			PORT: {
				value: process.env.PORT,
				default: 6969,
				type: (value: any) => Number(value),
				required: true,
			},
			HOSTNAME: {
				value: process.env.HOSTNAME,
				default: '127.0.0.1',
				type: (value: any) => value.toString(),
				required: true,
			},
		};

		const result = validateConfig(config);

		assert.deepEqual(result, {
			PORT: 6969,
			HOSTNAME: '127.0.0.1',
		});
	});

	it('should log an error if a required field is missing and exit', () => {
		const config = {
			PORT: {
				value: undefined,
				default: 6969,
				type: (value: any) => Number(value),
				required: true,
			},
			HOSTNAME: {
				value: undefined,
				default: '127.0.0.1',
				type: (value: any) => value.toString(),
				required: true,
			},
		};

		const originalProcessExit = process.exit;
		let exitCalled = false;

		process.exit = ((code?: number) => {
			exitCalled = true;
		}) as any;

		try {
			validateConfig(config);
		} catch (e) {
			assert(
				loggerOutput.includes('HOSTNAME: has not been set yet!'),
				'Logger did not log the expected error message',
			);
			assert(exitCalled, 'process.exit was not called');
		} finally {
			process.exit = originalProcessExit;
		}
	});

	it('should use default value if value is not provided', () => {
		const config = {
			PORT: {
				value: undefined,
				default: 6969,
				type: (value: any) => Number(value),
				required: false,
			},
		};

		const result = validateConfig(config);

		assert.deepEqual(result, {
			PORT: 6969,
		});
	});

	it('should log an error if type conversion fails and exit', () => {
		const config = {
			PORT: {
				value: 'invalid-port',
				default: 6969,
				type: (value: any) => {
					const parsed = Number(value);
					if (isNaN(parsed)) throw new Error('Invalid number');
					return parsed;
				},
				required: true,
			},
		};

		const originalProcessExit = process.exit;
		let exitCalled = false;

		process.exit = ((code?: number) => {
			exitCalled = true;
		}) as any;

		try {
			validateConfig(config);
		} catch (e) {
			assert(
				loggerOutput.includes('PORT: could not be converted to the required type.'),
				'Logger did not log the expected error message',
			);
			assert(exitCalled, 'process.exit was not called');
		} finally {
			process.exit = originalProcessExit;
		}
	});

	it('should handle optional fields correctly', () => {
		const config = {
			PORT: {
				value: undefined,
				default: 6969,
				type: (value: any) => Number(value),
				required: false,
			},
			HOSTNAME: {
				value: undefined,
				default: '127.0.0.1',
				type: (value: any) => value.toString(),
				required: false,
			},
		};

		const result = validateConfig(config);

		assert.deepEqual(result, {
			PORT: 6969,
			HOSTNAME: '127.0.0.1',
		});
	});

	it('should correctly handle fields with falsy values', () => {
		const config = {
			PORT: {
				value: 0,
				default: 6969,
				type: (value: any) => Number(value),
				required: true,
			},
			HOSTNAME: {
				value: '',
				default: '127.0.0.1',
				type: (value: any) => value.toString(),
				required: true,
			},
		};

		const result = validateConfig(config);

		assert.deepEqual(result, {
			PORT: 0,
			HOSTNAME: '',
		});
	});
});
