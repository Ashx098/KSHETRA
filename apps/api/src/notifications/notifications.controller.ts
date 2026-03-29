import { Body, Controller, Get, Headers, Param, Patch, Post, UseGuards } from "@nestjs/common";
import type {
  ApiResponse,
  NotificationDismissResponseData,
  NotificationPreferencesResponseData,
  NotificationPreferencesUpdateInput,
  NotificationsInboxData,
} from "@kshetra/types";

import { successResponse } from "../common/http/api-response";
import { requireUserId } from "../common/http/request-context";
import { UserContextGuard } from "../common/http/user-context.guard";
import { NotificationsService } from "./notifications.service";

@Controller()
@UseGuards(UserContextGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get("notifications")
  async getNotifications(
    @Headers("x-user-id") userIdHeader?: string,
  ): Promise<ApiResponse<NotificationsInboxData>> {
    const userId = requireUserId(userIdHeader);
    return successResponse(await this.notificationsService.getInbox(userId));
  }

  @Post("notifications/:notificationId/dismiss")
  async dismissNotification(
    @Headers("x-user-id") userIdHeader: string | undefined,
    @Param("notificationId") notificationId: string,
  ): Promise<ApiResponse<NotificationDismissResponseData>> {
    const userId = requireUserId(userIdHeader);
    return successResponse(
      await this.notificationsService.dismissNotification(userId, notificationId),
    );
  }

  @Get("notification-preferences")
  async getPreferences(
    @Headers("x-user-id") userIdHeader?: string,
  ): Promise<ApiResponse<NotificationPreferencesResponseData>> {
    const userId = requireUserId(userIdHeader);
    return successResponse(await this.notificationsService.getPreferences(userId));
  }

  @Patch("notification-preferences")
  async updatePreferences(
    @Headers("x-user-id") userIdHeader: string | undefined,
    @Body() input: NotificationPreferencesUpdateInput,
  ): Promise<ApiResponse<NotificationPreferencesResponseData>> {
    const userId = requireUserId(userIdHeader);
    return successResponse(await this.notificationsService.updatePreferences(userId, input));
  }
}
