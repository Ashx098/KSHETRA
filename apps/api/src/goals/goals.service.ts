import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type { GoalPayload, GoalResponseData, GoalType } from "@kshetra/types";
import { GOAL_TYPES } from "@kshetra/types";

import { decimalToNumber } from "../common/http/serializers";
import { PrismaService } from "../prisma/prisma.service";

const MIN_GOAL_TITLE_LENGTH = 3;
const MAX_GOAL_TITLE_LENGTH = 120;

@Injectable()
export class GoalsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string): Promise<GoalResponseData[]> {
    const goals = await this.prisma.userGoal.findMany({
      where: { userId },
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    });

    return goals.map((goal) => this.toResponse(goal));
  }

  async create(userId: string, input: GoalPayload): Promise<GoalResponseData> {
    const payload = this.validatePayload(input);
    const goal = await this.prisma.userGoal.create({
      data: {
        userId,
        goalType: payload.goal_type,
        title: payload.title,
        description: payload.description,
        priorityWeight: payload.priority_weight ?? 1,
      },
    });

    return this.toResponse(goal);
  }

  async createBatch(
    tx: Prisma.TransactionClient,
    userId: string,
    inputs: GoalPayload[],
  ): Promise<void> {
    const data = inputs.map((input) => {
      const payload = this.validatePayload(input);

      return {
        userId,
        goalType: payload.goal_type,
        title: payload.title,
        description: payload.description,
        priorityWeight: payload.priority_weight ?? 1,
        isActive: true,
      };
    });

    if (data.length === 0) {
      return;
    }

    await tx.userGoal.createMany({ data });
  }

  async update(
    userId: string,
    goalId: string,
    input: Partial<GoalPayload>,
  ): Promise<GoalResponseData> {
    await this.ensureGoalOwnership(userId, goalId);

    const data: Record<string, unknown> = {};

    if (input.goal_type !== undefined) {
      this.assertGoalType(input.goal_type);
      data.goalType = input.goal_type;
    }

    if (input.title !== undefined) {
      const title = input.title.trim();
      if (!title) {
        throw new BadRequestException("Goal title is required.");
      }
      this.assertGoalTitleLength(title);
      data.title = title;
    }

    if (input.description !== undefined) {
      data.description = input.description.trim() || null;
    }

    if (input.priority_weight !== undefined) {
      if (Number.isNaN(input.priority_weight) || input.priority_weight <= 0) {
        throw new BadRequestException("Priority weight must be greater than 0.");
      }
      data.priorityWeight = input.priority_weight;
    }

    const goal = await this.prisma.userGoal.update({
      where: { id: goalId },
      data,
    });

    return this.toResponse(goal);
  }

  async deactivate(userId: string, goalId: string): Promise<GoalResponseData> {
    await this.ensureGoalOwnership(userId, goalId);

    const goal = await this.prisma.userGoal.update({
      where: { id: goalId },
      data: {
        isActive: false,
      },
    });

    return this.toResponse(goal);
  }

  private async ensureGoalOwnership(userId: string, goalId: string): Promise<void> {
    const goal = await this.prisma.userGoal.findFirst({
      where: {
        id: goalId,
        userId,
      },
      select: { id: true },
    });

    if (!goal) {
      throw new NotFoundException("Goal does not exist or is not accessible.");
    }
  }

  private validatePayload(input: GoalPayload): GoalPayload {
    this.assertGoalType(input.goal_type);

    const title = input.title.trim();

    if (!title) {
      throw new BadRequestException("Goal title is required.");
    }
    this.assertGoalTitleLength(title);

    const description = input.description?.trim();
    const priorityWeight = input.priority_weight ?? 1;

    if (Number.isNaN(priorityWeight) || priorityWeight <= 0) {
      throw new BadRequestException("Priority weight must be greater than 0.");
    }

    return {
      ...input,
      title,
      description,
      priority_weight: priorityWeight,
    };
  }

  private assertGoalType(value: string): asserts value is GoalType {
    if (!GOAL_TYPES.includes(value as GoalType)) {
      throw new BadRequestException("Goal type is invalid.");
    }
  }

  private assertGoalTitleLength(title: string): void {
    if (title.length < MIN_GOAL_TITLE_LENGTH) {
      throw new BadRequestException(
        `Goal title must be at least ${MIN_GOAL_TITLE_LENGTH} characters.`,
      );
    }

    if (title.length > MAX_GOAL_TITLE_LENGTH) {
      throw new BadRequestException(
        `Goal title must be at most ${MAX_GOAL_TITLE_LENGTH} characters.`,
      );
    }
  }

  private toResponse(goal: {
    id: string;
    userId: string;
    goalType: GoalType;
    title: string;
    description: string | null;
    priorityWeight: unknown;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): GoalResponseData {
    return {
      id: goal.id,
      user_id: goal.userId,
      goal_type: goal.goalType,
      title: goal.title,
      description: goal.description,
      priority_weight: decimalToNumber(goal.priorityWeight as number),
      is_active: goal.isActive,
      created_at: goal.createdAt.toISOString(),
      updated_at: goal.updatedAt.toISOString(),
    };
  }
}
