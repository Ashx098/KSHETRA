import { Module } from "@nestjs/common";

import { AttributesModule } from "../attributes/attributes.module";
import { GoalsModule } from "../goals/goals.module";
import { ProfileModule } from "../profile/profile.module";
import { ProgressionModule } from "../progression/progression.module";
import { StreakModule } from "../streak/streak.module";
import { UsersModule } from "../users/users.module";
import { OnboardingController } from "./onboarding.controller";
import { OnboardingService } from "./onboarding.service";

@Module({
  imports: [
    UsersModule,
    ProfileModule,
    GoalsModule,
    AttributesModule,
    StreakModule,
    ProgressionModule,
  ],
  controllers: [OnboardingController],
  providers: [OnboardingService],
})
export class OnboardingModule {}

