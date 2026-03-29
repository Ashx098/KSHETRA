import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AttributesModule } from "./attributes/attributes.module";
import { AiModule } from "./ai/ai.module";
import { GoalsModule } from "./goals/goals.module";
import { GuideModule } from "./guide/guide.module";
import { EventsModule } from "./events/events.module";
import { HealthModule } from "./health/health.module";
import { HomeModule } from "./home/home.module";
import { InternalModule } from "./internal/internal.module";
import { DungeonsModule } from "./dungeons/dungeons.module";
import { RaidsModule } from "./raids/raids.module";
import { MissionsModule } from "./missions/missions.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { OnboardingModule } from "./onboarding/onboarding.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ProfileModule } from "./profile/profile.module";
import { ProgressionModule } from "./progression/progression.module";
import { QuestsModule } from "./quests/quests.module";
import { StreakModule } from "./streak/streak.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../../.env"],
    }),
    AiModule,
    DungeonsModule,
    EventsModule,
    GuideModule,
    InternalModule,
    NotificationsModule,
    MissionsModule,
    RaidsModule,
    PrismaModule,
    UsersModule,
    StreakModule,
    AttributesModule,
    GoalsModule,
    ProfileModule,
    ProgressionModule,
    QuestsModule,
    HomeModule,
    OnboardingModule,
    HealthModule,
  ],
})
export class AppModule {}
