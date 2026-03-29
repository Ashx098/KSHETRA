import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module";
import { UserContextGuard } from "../common/http/user-context.guard";
import { GuideModule } from "../guide/guide.module";
import { UsersModule } from "../users/users.module";
import { RaidsController } from "./raids.controller";
import { RaidsService } from "./raids.service";

@Module({
  imports: [PrismaModule, UsersModule, GuideModule],
  controllers: [RaidsController],
  providers: [RaidsService, UserContextGuard],
  exports: [RaidsService],
})
export class RaidsModule {}
