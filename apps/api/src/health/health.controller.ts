import { Controller, Get } from "@nestjs/common";
import type { ApiResponse, HealthResponseData } from "@kshetra/types";

import { successResponse } from "../common/http/api-response";
import { PrismaService } from "../prisma/prisma.service";

@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getHealth(): Promise<ApiResponse<HealthResponseData>> {
    await this.prisma.$queryRawUnsafe("SELECT 1");

    return successResponse({
      service: "api",
      status: "ok",
      database: "up",
      timestamp: new Date().toISOString(),
    });
  }
}
