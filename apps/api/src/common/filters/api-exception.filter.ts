import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import type { ApiError, ApiResponse } from "@kshetra/types";

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<{
      status: (code: number) => { json: (body: ApiResponse<null>) => void };
    }>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const error: ApiError = {
      code: this.getCode(exception, status),
      message: this.getMessage(exception),
    };

    response.status(status).json({
      success: false,
      data: null,
      error,
      meta: {},
    });
  }

  private getCode(exception: unknown, status: number): string {
    if (exception instanceof HttpException) {
      const payload = exception.getResponse();

      if (typeof payload === "object" && payload !== null) {
        const maybeCode = Reflect.get(payload, "code");

        if (typeof maybeCode === "string" && maybeCode.length > 0) {
          return maybeCode;
        }
      }
    }

    if (status === HttpStatus.NOT_FOUND) {
      return "NOT_FOUND";
    }

    if (status === HttpStatus.BAD_REQUEST) {
      return "BAD_REQUEST";
    }

    return "INTERNAL_SERVER_ERROR";
  }

  private getMessage(exception: unknown): string {
    if (exception instanceof HttpException) {
      const payload = exception.getResponse();

      if (typeof payload === "string") {
        return payload;
      }

      if (typeof payload === "object" && payload !== null) {
        const message = Reflect.get(payload, "message");

        if (typeof message === "string") {
          return message;
        }

        if (Array.isArray(message)) {
          return message.join(", ");
        }
      }
    }

    if (exception instanceof Error) {
      return exception.message;
    }

    return "Unexpected error.";
  }
}

