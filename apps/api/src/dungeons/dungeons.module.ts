import { Module } from "@nestjs/common";

import { UserContextGuard } from "../common/http/user-context.guard";
import { GuideModule } from "../guide/guide.module";
import { PrismaModule } from "../prisma/prisma.module";
import { UsersModule } from "../users/users.module";
import { DungeonsController } from "./dungeons.controller";
import { DungeonsService } from "./dungeons.service";

@Module({
  imports: [PrismaModule, UsersModule, GuideModule],
  controllers: [DungeonsController],
  providers: [DungeonsService, UserContextGuard],
  exports: [DungeonsService],
})
export class DungeonsModule {}
