import { BadRequestException } from "@nestjs/common";

export function requireUserId(userId?: string): string {
  const normalized = userId?.trim();

  if (!normalized) {
    throw new BadRequestException("Missing x-user-id header.");
  }

  return normalized;
}

