import { Request, Response, NextFunction } from 'express';

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  console.error('[request-error]', error);

  res.status(500).json({
    success: false,
    error: 'INTERNAL_SERVER_ERROR',
    message: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
  });
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: 'ROUTE_NOT_FOUND'
  });
}
