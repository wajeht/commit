import { statusCode as code } from './util';

export class HttpError extends Error {
	statusCode: number;
	constructor(
		statusCode: number = code.INTERNAL_SERVER_ERROR,
		message: string = 'Oh no, something went wrong!',
	) {
		super(message);
		this.statusCode = statusCode;
	}
}

export class ForbiddenError extends HttpError {
	constructor(message: string = 'Forbidden') {
		super(code.FORBIDDEN, message);
	}
}

export class UnauthorizedError extends HttpError {
	constructor(message: string = 'Unauthorized') {
		super(code.UNAUTHORIZED, message);
	}
}

export class NotFoundError extends HttpError {
	constructor(message: string = 'Not Found') {
		super(code.NOT_FOUND, message);
	}
}

export class ValidationError extends HttpError {
	constructor(message: string = 'Validation Error') {
		super(code.UNPROCESSABLE_ENTITY, message);
	}
}

export class UnimplementedFunctionError extends HttpError {
	constructor(message: string = 'Function Not Implemented') {
		super(code.NOT_IMPLEMENTED, message);
	}
}
