import { logger } from './util';
import { appConfig } from "./config";
import { NextFunction, Request, Response} from "express";
import { HttpError, ForbiddenError, UnauthorizedError, NotFoundError, ValidationError, UnimplementedFunctionError } from './error';

export function limitIPsMiddleware(req: Request, res: Response, next: NextFunction){
  try {
    const ips = appConfig.IPS.split(', ');
    // @ts-ignore
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress).split(', ')[0];

    if (!ips!.includes(ip)) {
      throw new ForbiddenError();
    }

    next();
  } catch (error) {
    next(error);
  }
}

export function notFoundMiddleware(req: Request, res: Response, next: NextFunction) {
  return res.status(404).json({ message: "not found" });
}


export function errorMiddleware(error: Error, req: Request, res: Response, next: NextFunction) {
  const errorMap = new Map([
    [ForbiddenError, 403],
    [UnauthorizedError, 401],
    [NotFoundError, 404],
    [ValidationError, 422],
    [UnimplementedFunctionError, 501]
  ]);

  logger.error(error);

  for (const [ErrorClass, statusCode] of errorMap) {
    if (error instanceof ErrorClass) {
      return res.status(statusCode).json({ message: error.message });
    }
  }

  if (error instanceof HttpError) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  return res.status(500).json({ message: "Oh no, something went wrong!" });
}

export function catchAsyncErrorMiddleware<T = any>(
  fn: (
    req: Request<T>,
    res: Response,
    next: NextFunction
  ) => Response | Promise<Response<any>> | void | Promise<void>
): (req: Request<T>, res: Response, next: NextFunction) => Promise<void> {
  return async (req: Request<T>, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = fn(req, res, next);
      if (result instanceof Promise) {
        await result;
      }
    } catch (err) {
      next(err);
    }
  };
}
