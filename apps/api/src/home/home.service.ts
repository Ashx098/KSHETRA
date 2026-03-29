import { Injectable } from "@nestjs/common";
import type { HomePayloadData } from "@kshetra/types";

import { AttributesService } from "../attributes/attributes.service";
import { EventsService } from "../events/events.service";
import { GuideService } from "../guide/guide.service";
import { NotificationsService } from "../notifications/notifications.service";
import { ProgressionService } from "../progression/progression.service";
import { QuestsService } from "../quests/quests.service";

@Injectable()
export class HomeService {
  constructor(
    private readonly progressionService: ProgressionService,
    private readonly questsService: QuestsService,
    private readonly attributesService: AttributesService,
    private readonly eventsService: EventsService,
    private readonly guideService: GuideService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getHome(userId: string): Promise<HomePayloadData> {
    const [progression, quests, attributes] = await Promise.all([
      this.progressionService.getSummary(userId),
      this.questsService.getTodayBundle(userId),
      this.attributesService.listForUser(userId),
    ]);
    const { active_event } = await this.eventsService.getActiveEvent(userId);
    const notificationState = await this.notificationsService.getHomeNotificationState(userId);
    const guide = await this.guideService.getHomeGuide(userId, {
      progression,
      quests,
      active_event,
      top_notification: notificationState.top_notification,
      notification_count: notificationState.notification_count,
    });

    return {
      progression,
      quests,
      attributes,
      active_event,
      top_notification: notificationState.top_notification,
      notification_count: notificationState.notification_count,
      guide_card: guide.guide_card,
      guide_message: guide.guide_message,
    };
  }
}
