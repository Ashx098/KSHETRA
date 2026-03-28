import { Body, Controller, Get, Headers, Patch, UseGuards } from "@nestjs/common";
import type { ApiResponse, MeResponseData, ProfileUpdateInput } from "@kshetra/types";

import { successResponse } from "../common/http/api-response";
import { requireUserId } from "../common/http/request-context";
import { UserContextGuard } from "../common/http/user-context.guard";
import { ProfileService } from "./profile.service";

@Controller("me")
@UseGuards(UserContextGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  async getMe(
    @Headers("x-user-id") userIdHeader?: string,
  ): Promise<ApiResponse<MeResponseData>> {
    const userId = requireUserId(userIdHeader);

    return successResponse(await this.profileService.getMe(userId));
  }

  @Patch("profile")
  async updateProfile(
    @Headers("x-user-id") userIdHeader: string | undefined,
    @Body() body: ProfileUpdateInput,
  ): Promise<ApiResponse<MeResponseData>> {
    const userId = requireUserId(userIdHeader);

    return successResponse(await this.profileService.updateProfile(userId, body));
  }
}
