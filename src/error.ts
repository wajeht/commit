import { statusCode as code } from './util';

export class HttpError extends Error {
	statusCode: number;

	constructor(statusCode = code.INTERNAL_SERVER_ERROR, message = 'Oh no, something went wrong!') {
		super(message);
		this.statusCode = statusCode;
	}
}

export class ForbiddenError extends HttpError {
	constructor(message = 'Forbidden') {
		super(code.FORBIDDEN, message);
	}
}

export class UnauthorizedError extends HttpError {
	constructor(message = 'Unauthorized') {
		super(code.UNAUTHORIZED, message);
	}
}

export class NotFoundError extends HttpError {
	constructor(message = 'Not Found') {
		super(code.NOT_FOUND, message);
	}
}

export class ValidationError extends HttpError {
	constructor(message = 'Validation Error') {
		super(code.UNPROCESSABLE_ENTITY, message);
	}
}

export class UnimplementedFunctionError extends HttpError {
	constructor(message = 'Function Not Implemented') {
		super(code.NOT_IMPLEMENTED, message);
	}
}
