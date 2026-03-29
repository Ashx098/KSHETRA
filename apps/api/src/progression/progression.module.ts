import { Module } from "@nestjs/common";

import { UserContextGuard } from "../common/http/user-context.guard";
import { PrismaModule } from "../prisma/prisma.module";
import { StreakModule } from "../streak/streak.module";
import { GuideModule } from "../guide/guide.module";
import { ProgressionController } from "./progression.controller";
import { ProgressionService } from "./progression.service";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [GuideModule, UsersModule, PrismaModule, StreakModule],
  controllers: [ProgressionController],
  providers: [ProgressionService, UserContextGuard],
  exports: [ProgressionService],
})
export class ProgressionModule {}
