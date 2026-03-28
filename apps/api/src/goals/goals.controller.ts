import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import type { ApiResponse, GoalPayload, GoalResponseData } from "@kshetra/types";

import { successResponse } from "../common/http/api-response";
import { requireUserId } from "../common/http/request-context";
import { UserContextGuard } from "../common/http/user-context.guard";
import { GoalsService } from "./goals.service";

@Controller("goals")
@UseGuards(UserContextGuard)
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Get()
  async list(
    @Headers("x-user-id") userIdHeader?: string,
  ): Promise<ApiResponse<GoalResponseData[]>> {
    const userId = requireUserId(userIdHeader);

    return successResponse(await this.goalsService.listForUser(userId));
  }

  @Post()
  async create(
    @Headers("x-user-id") userIdHeader: string | undefined,
    @Body() body: GoalPayload,
  ): Promise<ApiResponse<GoalResponseData>> {
    const userId = requireUserId(userIdHeader);

    return successResponse(await this.goalsService.create(userId, body));
  }

  @Patch(":goalId")
  async update(
    @Headers("x-user-id") userIdHeader: string | undefined,
    @Param("goalId") goalId: string,
    @Body() body: Partial<GoalPayload>,
  ): Promise<ApiResponse<GoalResponseData>> {
    const userId = requireUserId(userIdHeader);

    return successResponse(await this.goalsService.update(userId, goalId, body));
  }

  @Delete(":goalId")
  async deactivate(
    @Headers("x-user-id") userIdHeader: string | undefined,
    @Param("goalId") goalId: string,
  ): Promise<ApiResponse<GoalResponseData>> {
    const userId = requireUserId(userIdHeader);

    return successResponse(await this.goalsService.deactivate(userId, goalId));
  }
}
