import { Injectable } from "@nestjs/common";
import type { MissionsPayloadData } from "@kshetra/types";

import { DungeonsService } from "../dungeons/dungeons.service";
import { GuideService } from "../guide/guide.service";
import { RaidsService } from "../raids/raids.service";

@Injectable()
export class MissionsService {
  constructor(
    private readonly dungeonsService: DungeonsService,
    private readonly raidsService: RaidsService,
    private readonly guideService: GuideService,
  ) {}

  async getMissions(userId: string): Promise<MissionsPayloadData> {
    const [dungeon, raid] = await Promise.all([
      this.dungeonsService.getActiveDungeon(userId),
      this.raidsService.getActiveRaid(userId),
    ]);

    const guide = await this.guideService.getMissionsGuide(userId, {
      active_dungeon: dungeon.active_dungeon,
      active_raid: raid.active_raid,
    });

    return {
      active_dungeon: dungeon.active_dungeon,
      available_dungeon_templates: dungeon.available_templates,
      active_raid: raid.active_raid,
      available_raid_templates: raid.available_templates,
      guide_card: guide.guide_card,
      guide_message: guide.guide_message,
    };
  }
}
