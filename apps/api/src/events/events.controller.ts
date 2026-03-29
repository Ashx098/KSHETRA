import { Body, Controller, Get, Headers, Param, Post, UseGuards } from "@nestjs/common";
import type {
  ApiResponse,
  ActiveEventPayloadData,
  EventCompletionInput,
  EventCompletionResponseData,
  EventDismissResponseData,
} from "@kshetra/types";

import { successResponse } from "../common/http/api-response";
import { requireUserId } from "../common/http/request-context";
import { UserContextGuard } from "../common/http/user-context.guard";
import { EventsService } from "./events.service";

@Controller("events")
@UseGuards(UserContextGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get("active")
  async getActiveEvent(
    @Headers("x-user-id") userIdHeader?: string,
  ): Promise<ApiResponse<ActiveEventPayloadData>> {
    const userId = requireUserId(userIdHeader);
    return successResponse(await this.eventsService.getActiveEvent(userId));
  }

  @Post(":eventId/complete")
  async completeEvent(
    @Headers("x-user-id") userIdHeader: string | undefined,
    @Param("eventId") eventId: string,
    @Body() input: EventCompletionInput,
  ): Promise<ApiResponse<EventCompletionResponseData>> {
    const userId = requireUserId(userIdHeader);
    return successResponse(await this.eventsService.completeEvent(userId, eventId, input));
  }

  @Post(":eventId/dismiss")
  async dismissEvent(
    @Headers("x-user-id") userIdHeader: string | undefined,
    @Param("eventId") eventId: string,
  ): Promise<ApiResponse<EventDismissResponseData>> {
    const userId = requireUserId(userIdHeader);
    return successResponse(await this.eventsService.dismissEvent(userId, eventId));
  }
}
