import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

const AI_TIMEOUT_MS = 2500;
const AI_TEMPERATURE = 0.2;

export interface AiPlannerTemplateChoice {
  code: string;
  title: string;
  description: string;
  assignment_kind: "mandatory" | "optional" | "stretch";
  difficulty: "low" | "medium" | "high";
}

export interface AiPlannerInput {
  user_id: string;
  timezone: string;
  local_date: string;
  profile: {
    current_rank: string;
    current_level: number;
    total_xp: number;
    current_streak_days: number;
  };
  goals: Array<{
    goal_type: string;
    title: string;
    description: string | null;
    priority_weight: number;
  }>;
  attributes: Array<{
    code: string;
    value: number;
    cap: number;
  }>;
  allowed_templates: AiPlannerTemplateChoice[];
  hard_rules: {
    mandatory_count: number;
    optional_count: number;
    stretch_count: number;
    allowed_template_codes: string[];
    allow_template_invention: false;
    allow_scoring_fields: false;
    allow_progression_mutation: false;
  };
}

export interface AiPlannerResult {
  status: "success" | "failed" | "skipped";
  provider: string | null;
  model: string | null;
  request_payload: Record<string, unknown>;
  raw_response_text: string | null;
  parsed_output: unknown | null;
  failure_reason: string | null;
}

@Injectable()
export class AiPlannerService {
  constructor(private readonly configService: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(
      this.configService.get<string>("AI_BASE_URL") &&
        this.configService.get<string>("AI_MODEL") &&
        this.configService.get<string>("AI_API_KEY"),
    );
  }

  async planDailyQuests(input: AiPlannerInput): Promise<AiPlannerResult> {
    const baseUrl = this.configService.get<string>("AI_BASE_URL");
    const model = this.configService.get<string>("AI_MODEL");
    const apiKey = this.configService.get<string>("AI_API_KEY");

    const requestPayload = {
      model,
      temperature: AI_TEMPERATURE,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Return JSON only. No markdown. No commentary. Select only from allowed template codes. Do not invent templates or scoring.",
        },
        {
          role: "user",
          content: JSON.stringify({
            task: "Plan a daily quest bundle from the allowed templates only.",
            output_schema: {
              mandatory: [{ template_code: "string" }],
              optional: [{ template_code: "string" }],
              stretch: { template_code: "string" },
            },
            input,
          }),
        },
      ],
    };

    if (!baseUrl || !model || !apiKey) {
      return {
        status: "skipped",
        provider: null,
        model: model ?? null,
        request_payload: requestPayload,
        raw_response_text: null,
        parsed_output: null,
        failure_reason: "AI planner is not configured.",
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

    try {
      const response = await fetch(
        `${baseUrl.replace(/\/$/, "")}/chat/completions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(requestPayload),
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        return {
          status: "failed",
          provider: baseUrl,
          model,
          request_payload: requestPayload,
          raw_response_text: await response.text(),
          parsed_output: null,
          failure_reason: `AI request failed with status ${response.status}.`,
        };
      }

      const payload = (await response.json()) as {
        choices?: Array<{
          message?: {
            content?: string;
          };
        }>;
      };
      const rawContent = payload.choices?.[0]?.message?.content ?? null;

      if (!rawContent) {
        return {
          status: "failed",
          provider: baseUrl,
          model,
          request_payload: requestPayload,
          raw_response_text: null,
          parsed_output: null,
          failure_reason: "AI response did not contain message content.",
        };
      }

      try {
        return {
          status: "success",
          provider: baseUrl,
          model,
          request_payload: requestPayload,
          raw_response_text: rawContent,
          parsed_output: JSON.parse(rawContent),
          failure_reason: null,
        };
      } catch {
        return {
          status: "failed",
          provider: baseUrl,
          model,
          request_payload: requestPayload,
          raw_response_text: rawContent,
          parsed_output: null,
          failure_reason: "AI response was not strict JSON.",
        };
      }
    } catch (error) {
      const timedOut =
        error instanceof Error && error.name === "AbortError";

      return {
        status: "failed",
        provider: baseUrl,
        model,
        request_payload: requestPayload,
        raw_response_text: null,
        parsed_output: null,
        failure_reason: timedOut
          ? `AI request timed out after ${AI_TIMEOUT_MS}ms.`
          : error instanceof Error
            ? error.message
            : "Unknown AI planner error.",
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
