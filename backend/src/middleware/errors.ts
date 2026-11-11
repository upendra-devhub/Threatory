import { Request, Response, NextFunction } from "express";
import { ZodError, ZodType } from "zod";

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "TARGET_BLOCKED"
  | "RATE_LIMITED"
  | "INTERNAL"
  | "UPSTREAM_FAILURE";

export const HTTP_STATUS_MAP: Record<ApiErrorCode, number> = {
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  TARGET_BLOCKED: 422,
  RATE_LIMITED: 429,
  INTERNAL: 500,
  UPSTREAM_FAILURE: 502,
};

export interface ErrorField {
  path: string;
  message: string;
}

export class AppError extends Error {
  public readonly code: ApiErrorCode;
  public readonly statusCode: number;
  public readonly fields?: ErrorField[];

  constructor(code: ApiErrorCode, message: string, fields?: ErrorField[]) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = HTTP_STATUS_MAP[code];
    this.fields = fields;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function formatZodError(error: ZodError): AppError {
  const fields: ErrorField[] = error.errors.map((err) => ({
    path: err.path.join("."),
    message: err.message,
  }));
  return new AppError("VALIDATION_ERROR", "Validation failed", fields);
}

export function validateWithZod<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw formatZodError(result.error);
  }
  return result.data;
}

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new AppError("NOT_FOUND", `Route not found: ${req.method} ${req.path}`));
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.fields && err.fields.length > 0 ? { fields: err.fields } : {}),
      },
    });
    return;
  }

  if (err instanceof ZodError) {
    const appError = formatZodError(err);
    res.status(appError.statusCode).json({
      success: false,
      error: {
        code: appError.code,
        message: appError.message,
        fields: appError.fields,
      },
    });
    return;
  }

  if (typeof err === "object" && err !== null && "status" in err) {
    const status = (err as { status?: unknown }).status;
    if (status === 400) {
      res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Malformed JSON payload",
        },
      });
      return;
    }
    if (status === 413) {
      res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Request payload exceeds 20 kb limit",
        },
      });
      return;
    }
  }

  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL",
      message: "An internal server error occurred",
    },
  });
}
