import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

type UserStateRecord = {
  id: string;
  email: string;
  username: string;
  displayName: string;
  timezone: string;
  profile: {
    currentRank: "E" | "D" | "C" | "B" | "A" | "S";
    currentLevel: number;
    totalXp: number;
    fatigueScore: unknown;
    motivationMode: string | null;
    onboardingComplete: boolean;
  };
  streak: {
    currentStreakDays: number;
    longestStreakDays: number;
    lastValidDay: Date | null;
    streakStatus: "inactive" | "active" | "broken";
  };
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async assertUserExists(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException("User does not exist.");
    }
  }

  async assertIdentityAvailable(email: string, username: string): Promise<void> {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
      select: {
        email: true,
        username: true,
      },
    });

    if (!existing) {
      return;
    }

    if (existing.email === email) {
      throw new ConflictException("Email is already in use.");
    }

    throw new ConflictException("Username is already in use.");
  }

  async getUserStateOrThrow(userId: string): Promise<UserStateRecord> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        streak: true,
      },
    });

    if (!user || !user.profile || !user.streak) {
      throw new NotFoundException("User state not found.");
    }

    return user as UserStateRecord;
  }
}
