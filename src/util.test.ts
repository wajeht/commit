import assert from 'node:assert';
import { Request } from 'express';
import { describe, it } from 'node:test';
import { cache, logger, extractDomain, getIpAddress, getRandomElement } from './util';

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
	it('should get IP address from x-forwarded-for header', () => {
		const req = {
			headers: {
				'x-forwarded-for': '127.0.0.1',
			},
		} as unknown as Request;

		const ip = getIpAddress(req);

		assert.equal(ip, '127.0.0.1');
	});

	it('should get IP address from remoteAddress if x-forwarded-for is not present', () => {
		const req = {
			headers: {},
			socket: {
				remoteAddress: '192.168.1.1',
			},
		} as Request;

		const ip = getIpAddress(req);

		assert.equal(ip, '192.168.1.1');
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
