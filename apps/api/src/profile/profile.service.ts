import { BadRequestException, Injectable } from "@nestjs/common";
import type { MeResponseData, ProfileUpdateInput } from "@kshetra/types";

import { decimalToNumber } from "../common/http/serializers";
import { GuideService } from "../guide/guide.service";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "../users/users.service";

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly guideService: GuideService,
  ) {}

  async getMe(userId: string): Promise<MeResponseData> {
    const user = await this.usersService.getUserStateOrThrow(userId);
    const me = this.toMeResponse(user);
    const guide = await this.guideService.getProfileGuide(userId, { me });

    return {
      ...me,
      guide_card: guide.guide_card,
      guide_message: guide.guide_message,
    };
  }

  async updateProfile(
    userId: string,
    input: ProfileUpdateInput,
  ): Promise<MeResponseData> {
    const displayName = input.display_name?.trim();
    const timezone = input.timezone?.trim();
    const motivationMode =
      input.motivation_mode === undefined ? undefined : input.motivation_mode?.trim() || null;

    if (input.display_name !== undefined && !displayName) {
      throw new BadRequestException("Display name is required.");
    }

    if (input.timezone !== undefined && !timezone) {
      throw new BadRequestException("Timezone is required.");
    }

    await this.usersService.getUserStateOrThrow(userId);

    await this.prisma.$transaction(async (tx) => {
      if (displayName !== undefined || timezone !== undefined) {
        await tx.user.update({
          where: { id: userId },
          data: {
            ...(displayName !== undefined ? { displayName } : {}),
            ...(timezone !== undefined ? { timezone } : {}),
          },
        });
      }

      if (motivationMode !== undefined) {
        await tx.userProfile.update({
          where: { userId },
          data: {
            motivationMode,
          },
        });
      }
    });

    return this.getMe(userId);
  }

  toMeResponse(user: {
    id: string;
    email: string;
    username: string;
    displayName: string;
    timezone: string;
    profile: {
      currentRank: MeResponseData["current_rank"];
      currentLevel: number;
      totalXp: number;
      fatigueScore: unknown;
      motivationMode: string | null;
      onboardingComplete: boolean;
    } | null;
  }): MeResponseData {
    if (!user.profile) {
      throw new BadRequestException("User profile is missing.");
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      display_name: user.displayName,
      current_rank: user.profile.currentRank,
      current_level: user.profile.currentLevel,
      total_xp: user.profile.totalXp,
      fatigue_score: decimalToNumber(user.profile.fatigueScore as number),
      timezone: user.timezone,
      motivation_mode: user.profile.motivationMode,
      onboarding_complete: user.profile.onboardingComplete,
    };
  }
}
