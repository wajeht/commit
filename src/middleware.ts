import { NextFunction, Request, Response} from "express";
import { appConfig } from "./config";

export function limitIPsMiddleware(req: Request, res: Response, next: NextFunction){
  try {
    const ips = appConfig.IPS.split(', ');
    // @ts-ignore
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress).split(', ')[0];

    if (!ips!.includes(ip)) {
      throw new Error('no');
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
  return res.status(500).json({ message: "error" });
}
