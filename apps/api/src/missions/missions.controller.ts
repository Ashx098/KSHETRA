import { Controller, Get, Headers, UseGuards } from "@nestjs/common";
import type { ApiResponse, MissionsPayloadData } from "@kshetra/types";

import { successResponse } from "../common/http/api-response";
import { requireUserId } from "../common/http/request-context";
import { UserContextGuard } from "../common/http/user-context.guard";
import { MissionsService } from "./missions.service";

@Controller("missions")
@UseGuards(UserContextGuard)
export class MissionsController {
  constructor(private readonly missionsService: MissionsService) {}

  @Get()
  async getMissions(
    @Headers("x-user-id") userIdHeader?: string,
  ): Promise<ApiResponse<MissionsPayloadData>> {
    const userId = requireUserId(userIdHeader);
    return successResponse(await this.missionsService.getMissions(userId));
  }
}
