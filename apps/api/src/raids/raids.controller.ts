import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import type {
  ActiveRaidPayloadData,
  ApiResponse,
  RaidCompletionInput,
  RaidCompletionRewardData,
  RaidLogInput,
  RaidLogResponseData,
  StartRaidInput,
} from "@kshetra/types";

import { successResponse } from "../common/http/api-response";
import { requireUserId } from "../common/http/request-context";
import { UserContextGuard } from "../common/http/user-context.guard";
import { RaidsService } from "./raids.service";

@Controller("raids")
@UseGuards(UserContextGuard)
export class RaidsController {
  constructor(private readonly raidsService: RaidsService) {}

  @Get("active")
  async getActiveRaid(
    @Headers("x-user-id") userIdHeader?: string,
  ): Promise<ApiResponse<ActiveRaidPayloadData>> {
    const userId = requireUserId(userIdHeader);
    return successResponse(await this.raidsService.getActiveRaid(userId));
  }

  @Post("start")
  async startRaid(
    @Headers("x-user-id") userIdHeader: string | undefined,
    @Body() input: StartRaidInput,
  ): Promise<ApiResponse<ActiveRaidPayloadData>> {
    const userId = requireUserId(userIdHeader);
    return successResponse(await this.raidsService.startRaid(userId, input));
  }

  @Post(":raidId/objectives/:objectiveId/log")
  async logObjectiveProgress(
    @Headers("x-user-id") userIdHeader: string | undefined,
    @Param("raidId") raidId: string,
    @Param("objectiveId") objectiveId: string,
    @Body() input: RaidLogInput,
  ): Promise<ApiResponse<RaidLogResponseData>> {
    const userId = requireUserId(userIdHeader);
    return successResponse(
      await this.raidsService.logObjectiveProgress(userId, raidId, objectiveId, input),
    );
  }

  @Post(":raidId/complete")
  async completeRaid(
    @Headers("x-user-id") userIdHeader: string | undefined,
    @Param("raidId") raidId: string,
    @Body() input: RaidCompletionInput,
  ): Promise<ApiResponse<RaidCompletionRewardData>> {
    const userId = requireUserId(userIdHeader);
    return successResponse(await this.raidsService.completeRaid(userId, raidId, input));
  }
}
