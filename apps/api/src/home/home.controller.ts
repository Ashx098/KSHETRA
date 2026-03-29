import { Controller, Get, Headers, UseGuards } from "@nestjs/common";
import type { ApiResponse, HomePayloadData } from "@kshetra/types";

import { successResponse } from "../common/http/api-response";
import { requireUserId } from "../common/http/request-context";
import { UserContextGuard } from "../common/http/user-context.guard";
import { HomeService } from "./home.service";

@Controller("home")
@UseGuards(UserContextGuard)
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Get()
  async getHome(
    @Headers("x-user-id") userIdHeader?: string,
  ): Promise<ApiResponse<HomePayloadData>> {
    const userId = requireUserId(userIdHeader);
    return successResponse(await this.homeService.getHome(userId));
  }
}
