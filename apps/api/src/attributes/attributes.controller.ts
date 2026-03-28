import { Controller, Get, Headers, UseGuards } from "@nestjs/common";
import type { ApiResponse, AttributeResponseData } from "@kshetra/types";

import { successResponse } from "../common/http/api-response";
import { requireUserId } from "../common/http/request-context";
import { UserContextGuard } from "../common/http/user-context.guard";
import { AttributesService } from "./attributes.service";

@Controller("attributes")
@UseGuards(UserContextGuard)
export class AttributesController {
  constructor(private readonly attributesService: AttributesService) {}

  @Get()
  async list(
    @Headers("x-user-id") userIdHeader?: string,
  ): Promise<ApiResponse<AttributeResponseData[]>> {
    const userId = requireUserId(userIdHeader);

    return successResponse(await this.attributesService.listForUser(userId));
  }
}
