import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module";
import { GuideModule } from "../guide/guide.module";
import { UsersModule } from "../users/users.module";
import { EventsController } from "./events.controller";
import { EventsService } from "./events.service";

@Module({
  imports: [PrismaModule, UsersModule, GuideModule],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
