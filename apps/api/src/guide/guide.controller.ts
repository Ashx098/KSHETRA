import { Body, Controller, Get, Headers, Patch, Post, UseGuards, Param } from "@nestjs/common";
import type {
  ApiResponse,
  GuideAskInput,
  GuideAskResponseData,
  GuideMessageDismissResponseData,
  GuidePreferencesResponseData,
  GuidePreferencesUpdateInput,
} from "@kshetra/types";

import { successResponse } from "../common/http/api-response";
import { requireUserId } from "../common/http/request-context";
import { UserContextGuard } from "../common/http/user-context.guard";
import { GuideService } from "./guide.service";

@Controller("guide")
@UseGuards(UserContextGuard)
export class GuideController {
  constructor(private readonly guideService: GuideService) {}

  @Post("ask")
  async askGuide(
    @Headers("x-user-id") userIdHeader: string | undefined,
    @Body() body: GuideAskInput,
  ): Promise<ApiResponse<GuideAskResponseData>> {
    const userId = requireUserId(userIdHeader);
    return successResponse(await this.guideService.askGuide(userId, body));
  }

  @Post("messages/:messageId/dismiss")
  async dismissMessage(
    @Headers("x-user-id") userIdHeader: string | undefined,
    @Param("messageId") messageId: string,
  ): Promise<ApiResponse<GuideMessageDismissResponseData>> {
    const userId = requireUserId(userIdHeader);
    return successResponse(await this.guideService.dismissMessage(userId, messageId));
  }

  @Get("preferences")
  async getPreferences(
    @Headers("x-user-id") userIdHeader: string | undefined,
  ): Promise<ApiResponse<GuidePreferencesResponseData>> {
    const userId = requireUserId(userIdHeader);
    return successResponse(await this.guideService.getPreferences(userId));
  }

  @Patch("preferences")
  async updatePreferences(
    @Headers("x-user-id") userIdHeader: string | undefined,
    @Body() body: GuidePreferencesUpdateInput,
  ): Promise<ApiResponse<GuidePreferencesResponseData>> {
    const userId = requireUserId(userIdHeader);
    return successResponse(await this.guideService.updatePreferences(userId, body));
  }
}
