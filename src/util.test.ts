import { describe, it } from 'node:test';
import assert from 'node:assert';
import { cache, logger, extractDomain } from './util';
import { Request } from 'express';

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