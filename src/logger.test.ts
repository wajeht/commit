import { logger } from './logger';
import assert from 'node:assert';
import { describe, it } from 'node:test';

describe('logger', { concurrency: true }, () => {
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
