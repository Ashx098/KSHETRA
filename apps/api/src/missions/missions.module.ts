import { Module } from "@nestjs/common";

import { UserContextGuard } from "../common/http/user-context.guard";
import { DungeonsModule } from "../dungeons/dungeons.module";
import { GuideModule } from "../guide/guide.module";
import { RaidsModule } from "../raids/raids.module";
import { UsersModule } from "../users/users.module";
import { MissionsController } from "./missions.controller";
import { MissionsService } from "./missions.service";

@Module({
  imports: [DungeonsModule, GuideModule, RaidsModule, UsersModule],
  controllers: [MissionsController],
  providers: [MissionsService, UserContextGuard],
})
export class MissionsModule {}
