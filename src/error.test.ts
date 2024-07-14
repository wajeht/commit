import assert from 'assert';
import { describe, it } from 'node:test';
import {
	HttpError,
	ForbiddenError,
	UnauthorizedError,
	NotFoundError,
	ValidationError,
	UnimplementedFunctionError,
} from './error';

describe('HttpError Classes', () => {
	describe('HttpError', () => {
		it('should set the statusCode and message correctly', () => {
			const error = new HttpError(500, 'Oh no, something went wrong!');
			assert.strictEqual(error.statusCode, 500);
			assert.strictEqual(error.message, 'Oh no, something went wrong!');
		});

		it('should set default statusCode and message', () => {
			const error = new HttpError();
			assert.strictEqual(error.statusCode, 500);
			assert.strictEqual(error.message, 'Oh no, something went wrong!');
		});
	});

	describe('ForbiddenError', () => {
		it('should set the statusCode to 403 and message correctly', () => {
			const error = new ForbiddenError('Forbidden');
			assert.strictEqual(error.statusCode, 403);
			assert.strictEqual(error.message, 'Forbidden');
		});

		it('should set default message', () => {
			const error = new ForbiddenError();
			assert.strictEqual(error.statusCode, 403);
			assert.strictEqual(error.message, 'Forbidden');
		});
	});

	describe('UnauthorizedError', () => {
		it('should set the statusCode to 401 and message correctly', () => {
			const error = new UnauthorizedError('Unauthorized');
			assert.strictEqual(error.statusCode, 401);
			assert.strictEqual(error.message, 'Unauthorized');
		});

		it('should set default message', () => {
			const error = new UnauthorizedError();
			assert.strictEqual(error.statusCode, 401);
			assert.strictEqual(error.message, 'Unauthorized');
		});
	});

	describe('NotFoundError', () => {
		it('should set the statusCode to 404 and message correctly', () => {
			const error = new NotFoundError('Not Found');
			assert.strictEqual(error.statusCode, 404);
			assert.strictEqual(error.message, 'Not Found');
		});

		it('should set default message', () => {
			const error = new NotFoundError();
			assert.strictEqual(error.statusCode, 404);
			assert.strictEqual(error.message, 'Not Found');
		});
	});

	describe('ValidationError', () => {
		it('should set the statusCode to 422 and message correctly', () => {
			const error = new ValidationError('Validation Error');
			assert.strictEqual(error.statusCode, 422);
			assert.strictEqual(error.message, 'Validation Error');
		});

		it('should set default message', () => {
			const error = new ValidationError();
			assert.strictEqual(error.statusCode, 422);
			assert.strictEqual(error.message, 'Validation Error');
		});
	});

	describe('UnimplementedFunctionError', () => {
		it('should set the statusCode to 501 and message correctly', () => {
			const error = new UnimplementedFunctionError('Function Not Implemented');
			assert.strictEqual(error.statusCode, 501);
			assert.strictEqual(error.message, 'Function Not Implemented');
		});

		it('should set default message', () => {
			const error = new UnimplementedFunctionError();
			assert.strictEqual(error.statusCode, 501);
			assert.strictEqual(error.message, 'Function Not Implemented');
		});
	});
});
