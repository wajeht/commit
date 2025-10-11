import { logger } from './logger';
import assert from 'node:assert';
import { describe, it } from 'node:test';

describe('logger', { concurrency: true }, () => {
	it('should log debug messages', () => {
		const originalWrite = process.stdout.write;
		let output = '';

		process.stdout.write = ((str: string) => {
			output += str;
			return true;
		}) as any;

		logger.debug('Debug message');
		assert(output.includes('🐛'), 'Debug log does not contain the expected emoji');
		assert(output.includes('Debug message'), 'Debug log does not contain the expected message');

		process.stdout.write = originalWrite;
	});

	it('should log error messages', () => {
		const originalWrite = process.stderr.write;
		let output = '';

		process.stderr.write = ((str: string) => {
			output += str;
			return true;
		}) as any;

		logger.error('Error message');
		assert(output.includes('❌'), 'Error log does not contain the expected emoji');
		assert(output.includes('Error message'), 'Error log does not contain the expected message');

		process.stderr.write = originalWrite;
	});

	it('should log info messages', () => {
		const originalWrite = process.stdout.write;
		let output = '';

		process.stdout.write = ((str: string) => {
			output += str;
			return true;
		}) as any;

		logger.info('Info message');

		assert(output.includes('✅'), 'Info log does not contain the expected emoji');
		assert(output.includes('Info message'), 'Info log does not contain the expected message');

		process.stdout.write = originalWrite;
	});
});
