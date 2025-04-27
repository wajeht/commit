import { logger } from './logger';
import assert from 'node:assert';
import { Request } from 'express';
import { describe, it, beforeEach, afterEach } from 'node:test';
import {
	cache,
	cleanIp,
	getIpAddress,
	extractDomain,
	validateConfig,
	getRandomElement,
} from './util';

describe('Cache', { concurrency: true }, () => {
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

describe('extractDomain', { concurrency: true }, () => {
	it('should extract domain with port', () => {
		const req = {
			hostname: 'example.com',
			protocol: 'https',
			get: (_header: any) => 'example.com:443',
		};

		const result = extractDomain(req as Request);

		assert.equal(result, 'https://example.com:443');
	});

	it('should extract domain without port', () => {
		const req = {
			hostname: 'example.com',
			protocol: 'https',
			get: (_header: any) => 'example.com',
		};

		const result = extractDomain(req as Request);

		assert.equal(result, 'https://example.com');
	});

	it('should enforce https in production', () => {
		process.env.NODE_ENV = 'production';
		const req = {
			hostname: 'example.com',
			protocol: 'http',
			get: (_header: any) => 'example.com',
		};

		const result = extractDomain(req as Request);

		assert.equal(result, 'https://example.com');

		process.env.NODE_ENV = '';
	});
});

describe('getIpAddress', { concurrency: true }, () => {
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

	it('should try forwarded header if x-forwarded-for is not present', () => {
		const req = {
			headers: {
				forwarded: 'for=192.168.1.1',
			},
			ip: '10.0.0.1',
		} as unknown as Request;

		const ip = getIpAddress(req);

		assert.equal(ip, '192.168.1.1');
	});

	it('should try x-real-ip header if other headers are not present', () => {
		const req = {
			headers: {
				'x-real-ip': '192.168.2.1',
			},
			ip: '10.0.0.1',
		} as unknown as Request;

		const ip = getIpAddress(req);

		assert.equal(ip, '192.168.2.1');
	});

	it('should get IP address from req.ip if no headers are present', () => {
		const req = {
			headers: {},
			ip: '192.168.1.1',
			socket: {},
		} as unknown as Request;

		const ip = getIpAddress(req);

		assert.equal(ip, '192.168.1.1');
	});

	it('should get IP address from remoteAddress as last resort', () => {
		const req = {
			headers: {},
			socket: {
				remoteAddress: '192.168.1.1',
			},
		} as unknown as Request;

		const ip = getIpAddress(req);

		assert.equal(ip, '192.168.1.1');
	});

	it('should return "unknown" if no IP address is found', () => {
		const req = {
			headers: {},
			socket: {},
		} as unknown as Request;

		const ip = getIpAddress(req);

		assert.equal(ip, 'unknown');
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

	it('should prefer the first valid header in the priority order', () => {
		const req = {
			headers: {
				'x-forwarded-for': '10.0.0.1',
				forwarded: 'for=192.168.1.1',
				'x-real-ip': '172.16.0.1',
			},
			ip: '127.0.0.1',
		} as unknown as Request;

		const ip = getIpAddress(req);

		assert.equal(ip, '10.0.0.1');
	});
});

describe('cleanIp', { concurrency: true }, () => {
	it('should clean a simple IPv4 address', () => {
		const result = cleanIp('192.168.1.1');
		assert.equal(result, '192.168.1.1');
	});

	it('should remove port from IPv4 address', () => {
		const result = cleanIp('192.168.1.1:8080');
		assert.equal(result, '192.168.1.1');
	});

	it('should remove IPv6 brackets', () => {
		const result = cleanIp('[2001:db8::1]');
		assert.equal(result, '2001:db8::1');
	});

	it('should remove port from IPv6 address with brackets', () => {
		const result = cleanIp('[2001:db8::1]:8080');
		assert.equal(result, '2001:db8::1');
	});

	it('should return empty string for invalid IP', () => {
		const result = cleanIp('not-an-ip-address');
		assert.equal(result, '');
	});

	it('should return empty string for empty input', () => {
		const result = cleanIp('');
		assert.equal(result, '');
	});
});

describe('getRandomElement', { concurrency: true }, () => {
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

describe('validateConfig', { concurrency: true }, () => {
	let originalLoggerError: (...args: any[]) => void;
	let loggerOutput: string;

	beforeEach(() => {
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
