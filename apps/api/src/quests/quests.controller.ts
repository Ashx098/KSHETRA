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
  ApiResponse,
  DailyQuestBundleData,
  QuestCompletionInput,
  QuestCompletionResponseData,
} from "@kshetra/types";

import { successResponse } from "../common/http/api-response";
import { requireUserId } from "../common/http/request-context";
import { UserContextGuard } from "../common/http/user-context.guard";
import { QuestsService } from "./quests.service";

@Controller("quests")
@UseGuards(UserContextGuard)
export class QuestsController {
  constructor(private readonly questsService: QuestsService) {}

  @Get("today")
  async getTodayBundle(
    @Headers("x-user-id") userIdHeader?: string,
  ): Promise<ApiResponse<DailyQuestBundleData>> {
    const userId = requireUserId(userIdHeader);

    return successResponse(await this.questsService.getTodayBundle(userId));
  }

  @Post(":questId/complete")
  async completeQuest(
    @Headers("x-user-id") userIdHeader: string | undefined,
    @Param("questId") questId: string,
    @Body() body: QuestCompletionInput,
  ): Promise<ApiResponse<QuestCompletionResponseData>> {
    const userId = requireUserId(userIdHeader);

    return successResponse(await this.questsService.completeQuest(userId, questId, body));
  }
}
