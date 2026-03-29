import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module";
import { UserContextGuard } from "../common/http/user-context.guard";
import { UsersModule } from "../users/users.module";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";

@Module({
  imports: [PrismaModule, UsersModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, UserContextGuard],
  exports: [NotificationsService],
})
export class NotificationsModule {}
