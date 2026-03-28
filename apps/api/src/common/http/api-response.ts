import type { ApiResponse } from "@kshetra/types";

export function successResponse<T>(data: T, meta: Record<string, unknown> = {}): ApiResponse<T> {
  return {
    success: true,
    data,
    error: null,
    meta,
  };
}

