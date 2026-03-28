import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  Query,
  UseGuards,
} from "@nestjs/common";
import type {
  ApiResponse,
  ProgressionHistoryData,
  ProgressionSummaryData,
} from "@kshetra/types";

import { successResponse } from "../common/http/api-response";
import { requireUserId } from "../common/http/request-context";
import { UserContextGuard } from "../common/http/user-context.guard";
import { ProgressionService } from "./progression.service";

@Controller("progression")
@UseGuards(UserContextGuard)
export class ProgressionController {
  constructor(private readonly progressionService: ProgressionService) {}

  @Get("summary")
  async getSummary(
    @Headers("x-user-id") userIdHeader?: string,
  ): Promise<ApiResponse<ProgressionSummaryData>> {
    const userId = requireUserId(userIdHeader);

    return successResponse(await this.progressionService.getSummary(userId));
  }

  @Get("history")
  async getHistory(
    @Headers("x-user-id") userIdHeader?: string,
    @Query("range") range = "30d",
  ): Promise<ApiResponse<ProgressionHistoryData>> {
    const userId = requireUserId(userIdHeader);

    if (!["7d", "30d", "90d", "1y"].includes(range)) {
      throw new BadRequestException("Invalid history range.");
    }

    return successResponse(
      await this.progressionService.getHistory(
        userId,
        range as ProgressionHistoryData["range"],
      ),
    );
  }
}
