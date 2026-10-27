import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: any;
}

export class ResponseUtil {
  static success<T>(res: Response, data?: T, message?: string, statusCode: number = 200): void {
    res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  static error(res: Response, message: string, statusCode: number = 400, errors?: any): void {
    res.status(statusCode).json({
      success: false,
      message,
      errors,
    });
  }
}
