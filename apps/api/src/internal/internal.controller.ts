import { Controller, Get, Query } from "@nestjs/common";

import { successResponse } from "../common/http/api-response";
import { InternalService } from "./internal.service";

@Controller("internal")
export class InternalController {
  constructor(private readonly internalService: InternalService) {}

  @Get("quests/template-frequency")
  async getQuestTemplateFrequency(
    @Query("userId") userId: string,
    @Query("days") days?: string,
  ) {
    return successResponse(
      await this.internalService.getQuestTemplateFrequency(
        userId,
        Math.max(1, Math.min(Number(days ?? 7) || 7, 30)),
      ),
    );
  }

  @Get("ai/generations")
  async getAiGenerations(@Query("userId") userId: string) {
    return successResponse(await this.internalService.getAiGenerationAudit(userId));
  }
}
