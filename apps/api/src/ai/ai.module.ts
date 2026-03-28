import { Module } from "@nestjs/common";

import { AiPlannerService } from "./ai-planner.service";
import { AiQuestValidatorService } from "./ai-quest-validator.service";

@Module({
  providers: [AiPlannerService, AiQuestValidatorService],
  exports: [AiPlannerService, AiQuestValidatorService],
})
export class AiModule {}
