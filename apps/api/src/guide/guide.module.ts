import { Module } from "@nestjs/common";

import { AiModule } from "../ai/ai.module";
import { UsersModule } from "../users/users.module";
import { GuideAiService } from "./guide-ai.service";
import { GuideController } from "./guide.controller";
import { GuideService } from "./guide.service";

@Module({
  imports: [AiModule, UsersModule],
  controllers: [GuideController],
  providers: [GuideService, GuideAiService],
  exports: [GuideService],
})
export class GuideModule {}
