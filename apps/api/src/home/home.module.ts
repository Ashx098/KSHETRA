import { Module } from "@nestjs/common";

import { AttributesModule } from "../attributes/attributes.module";
import { UserContextGuard } from "../common/http/user-context.guard";
import { EventsModule } from "../events/events.module";
import { GuideModule } from "../guide/guide.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { ProgressionModule } from "../progression/progression.module";
import { QuestsModule } from "../quests/quests.module";
import { UsersModule } from "../users/users.module";
import { HomeController } from "./home.controller";
import { HomeService } from "./home.service";

@Module({
  imports: [AttributesModule, EventsModule, GuideModule, NotificationsModule, ProgressionModule, QuestsModule, UsersModule],
  controllers: [HomeController],
  providers: [HomeService, UserContextGuard],
})
export class HomeModule {}
