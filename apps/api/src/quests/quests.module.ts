import { Module } from "@nestjs/common";

import { AiModule } from "../ai/ai.module";
import { AttributesModule } from "../attributes/attributes.module";
import { UserContextGuard } from "../common/http/user-context.guard";
import { PrismaModule } from "../prisma/prisma.module";
import { StreakModule } from "../streak/streak.module";
import { UsersModule } from "../users/users.module";
import { QuestsController } from "./quests.controller";
import { QuestsService } from "./quests.service";

@Module({
  imports: [AiModule, PrismaModule, UsersModule, AttributesModule, StreakModule],
  controllers: [QuestsController],
  providers: [QuestsService, UserContextGuard],
})
export class QuestsModule {}
