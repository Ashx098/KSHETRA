import { Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class InternalService {
  constructor(private readonly prisma: PrismaService) {}

  async getQuestTemplateFrequency(userId: string, days: number): Promise<{
    user_id: string;
    days: number;
    templates: Array<{ code: string; assigned_count: number; completed_count: number }>;
  }> {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - days);

    const quests = await this.prisma.quest.findMany({
      where: {
        userId,
        questType: "daily",
        assignedDate: { gte: since },
        templateId: { not: null },
      },
      select: {
        status: true,
        template: {
          select: {
            code: true,
          },
        },
      },
    });

    const counts = new Map<string, { assigned_count: number; completed_count: number }>();
    for (const quest of quests) {
      const code = quest.template?.code;
      if (!code) {
        continue;
      }

      const current = counts.get(code) ?? { assigned_count: 0, completed_count: 0 };
      current.assigned_count += 1;
      if (quest.status === "completed") {
        current.completed_count += 1;
      }
      counts.set(code, current);
    }

    return {
      user_id: userId,
      days,
      templates: Array.from(counts.entries())
        .map(([code, value]) => ({ code, ...value }))
        .sort((a, b) => b.assigned_count - a.assigned_count || a.code.localeCompare(b.code)),
    };
  }

  async getAiGenerationAudit(userId: string, take = 20): Promise<{
    user_id: string;
    generations: Array<{
      id: string;
      status: string;
      provider: string | null;
      model_name: string | null;
      failure_reason: string | null;
      rejection_reasons: unknown;
      raw_response_preview: string | null;
      created_quests_count: number;
      created_at: string;
    }>;
  }> {
    const generations = await this.prisma.aiGeneration.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        status: true,
        provider: true,
        modelName: true,
        rejectionReasons: true,
        rawResponseText: true,
        createdQuestsCount: true,
        createdAt: true,
      },
    });

    return {
      user_id: userId,
      generations: generations.map((generation) => ({
        id: generation.id,
        status: generation.status,
        provider: generation.provider,
        model_name: generation.modelName,
        failure_reason: this.extractFailureReason(generation.rejectionReasons),
        rejection_reasons: generation.rejectionReasons,
        raw_response_preview: generation.rawResponseText
          ? generation.rawResponseText.slice(0, 280)
          : null,
        created_quests_count: generation.createdQuestsCount,
        created_at: generation.createdAt.toISOString(),
      })),
    };
  }

  private extractFailureReason(value: unknown): string | null {
    if (!Array.isArray(value) || value.length === 0) {
      return null;
    }

    const first = value[0];
    return typeof first === "string" ? first : null;
  }
}
