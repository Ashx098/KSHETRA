import { BadRequestException, Injectable } from "@nestjs/common";
import type { OnboardingInput, OnboardingResponseData } from "@kshetra/types";

import { AttributesService } from "../attributes/attributes.service";
import { GoalsService } from "../goals/goals.service";
import { PrismaService } from "../prisma/prisma.service";
import { ProfileService } from "../profile/profile.service";
import { ProgressionService } from "../progression/progression.service";
import { StreakService } from "../streak/streak.service";
import { UsersService } from "../users/users.service";

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly profileService: ProfileService,
    private readonly goalsService: GoalsService,
    private readonly attributesService: AttributesService,
    private readonly streakService: StreakService,
    private readonly progressionService: ProgressionService,
  ) {}

  async onboard(input: OnboardingInput): Promise<OnboardingResponseData> {
    const payload = this.validateInput(input);
    await this.usersService.assertIdentityAvailable(payload.email, payload.username);

    const user = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: payload.email,
          username: payload.username,
          displayName: payload.display_name,
          timezone: payload.timezone,
        },
      });

      await tx.userProfile.create({
        data: {
          userId: createdUser.id,
          currentRank: "E",
          currentLevel: this.progressionService.calculateLevel(0),
          totalXp: 0,
          fatigueScore: 0,
          onboardingComplete: true,
        },
      });

      await this.streakService.createInitial(tx, createdUser.id);
      await this.attributesService.seedForUser(tx, createdUser.id);
      await this.goalsService.createBatch(tx, createdUser.id, payload.goals);

      return createdUser;
    });

    return {
      user_id: user.id,
      profile: await this.profileService.getMe(user.id),
      goals: await this.goalsService.listForUser(user.id),
      attributes: await this.attributesService.listForUser(user.id),
      streak: await this.streakService.getForUserOrThrow(user.id),
    };
  }

  private validateInput(input: OnboardingInput): OnboardingInput {
    const email = input.email.trim().toLowerCase();
    const username = input.username.trim().toLowerCase();
    const displayName = input.display_name.trim();
    const timezone = input.timezone.trim();

    if (!email) {
      throw new BadRequestException("Email is required.");
    }

    if (!username) {
      throw new BadRequestException("Username is required.");
    }

    if (!displayName) {
      throw new BadRequestException("Display name is required.");
    }

    if (!timezone) {
      throw new BadRequestException("Timezone is required.");
    }

    if (input.goals.length === 0) {
      throw new BadRequestException("At least one goal is required.");
    }

    return {
      ...input,
      email,
      username,
      display_name: displayName,
      timezone,
    };
  }
}

