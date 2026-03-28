import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AttributesModule } from "./attributes/attributes.module";
import { AiModule } from "./ai/ai.module";
import { GoalsModule } from "./goals/goals.module";
import { HealthModule } from "./health/health.module";
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
    PrismaModule,
    UsersModule,
    StreakModule,
    AttributesModule,
    GoalsModule,
    ProfileModule,
    ProgressionModule,
    QuestsModule,
    OnboardingModule,
    HealthModule,
  ],
})
export class AppModule {}
