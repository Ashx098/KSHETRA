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
  ActiveDungeonPayloadData,
  ApiResponse,
  DungeonLogInput,
  DungeonLogResponseData,
  StartDungeonInput,
} from "@kshetra/types";

import { successResponse } from "../common/http/api-response";
import { requireUserId } from "../common/http/request-context";
import { UserContextGuard } from "../common/http/user-context.guard";
import { DungeonsService } from "./dungeons.service";

@Controller("dungeons")
@UseGuards(UserContextGuard)
export class DungeonsController {
  constructor(private readonly dungeonsService: DungeonsService) {}

  @Get("active")
  async getActiveDungeon(
    @Headers("x-user-id") userIdHeader?: string,
  ): Promise<ApiResponse<ActiveDungeonPayloadData>> {
    const userId = requireUserId(userIdHeader);
    return successResponse(await this.dungeonsService.getActiveDungeon(userId));
  }

  @Post("start")
  async startDungeon(
    @Headers("x-user-id") userIdHeader: string | undefined,
    @Body() input: StartDungeonInput,
  ): Promise<ApiResponse<ActiveDungeonPayloadData>> {
    const userId = requireUserId(userIdHeader);
    return successResponse(await this.dungeonsService.startDungeon(userId, input));
  }

  @Post(":dungeonId/objectives/:objectiveId/log")
  async logObjectiveProgress(
    @Headers("x-user-id") userIdHeader: string | undefined,
    @Param("dungeonId") dungeonId: string,
    @Param("objectiveId") objectiveId: string,
    @Body() input: DungeonLogInput,
  ): Promise<ApiResponse<DungeonLogResponseData>> {
    const userId = requireUserId(userIdHeader);
    return successResponse(
      await this.dungeonsService.logObjectiveProgress(userId, dungeonId, objectiveId, input),
    );
  }
}
