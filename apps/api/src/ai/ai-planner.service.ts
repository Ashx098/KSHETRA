import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

const AI_TIMEOUT_MS = 8000;
const AI_TEMPERATURE = 0.2;
const AI_MAX_COMPLETION_TOKENS = 220;
const AI_MAX_RETRIES = 3;

export interface AiPlannerTemplateChoice {
  code: string;
  title: string;
  description: string;
  assignment_kind: "mandatory" | "optional" | "stretch";
  difficulty: "low" | "medium" | "high";
  attribute_family?: string;
  cooldown_days?: number;
  max_occurrences_in_7d?: number;
  goal_tags?: string[];
  framing_tags?: string[];
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
  recent_history: {
    assigned_template_codes: string[];
    completed_template_codes: string[];
  };
  underused_attributes: string[];
  active_arcs: {
    dungeon_theme: string | null;
    raid_theme: string | null;
  };
  rank_context: {
    label: string;
    subtitle: string;
  };
  recovery_state: {
    valid_day_secured: boolean;
    completed_today: number;
    remaining_mandatory: number;
  };
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
      max_tokens: AI_MAX_COMPLETION_TOKENS,
      response_format: { type: "json_object" },
      extra_body: {
        chat_template_kwargs: {
          enable_thinking: false,
        },
      },
      messages: [
        {
          role: "system",
          content:
            [
              "Return one strict JSON object only.",
              "The first non-whitespace character of the reply must be { and the last non-whitespace character must be }.",
              "No markdown. No prose. No reasoning. No commentary. No preamble. No trailing text.",
              "Do not include thinking, reasoning_content, analysis, notes, explanations, or provider-specific wrapper fields.",
              "Select only from allowed template codes.",
              "Do not invent templates, mechanics, rewards, stories, explanations, or progression changes.",
              "Preserve realistic daily load.",
              "Prefer variety within explicit constraints.",
              "Avoid guilt-heavy, manipulative, or grind-maximizing choices.",
              "Tone target is mythic, disciplined, and restrained, but output must still be JSON only.",
            ].join(" "),
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
            output_requirements: [
              "Return exactly one JSON object.",
              "Begin with { and end with }.",
              "Use only the keys mandatory, optional, stretch.",
              "mandatory must contain exactly 3 items.",
              "optional must contain exactly 2 items.",
              "stretch must contain exactly 1 object or null.",
              "Each item must be {\"template_code\":\"...\"}.",
              "No duplicates.",
              "No extra keys anywhere.",
              "No reasoning text anywhere.",
              "Do not echo the input.",
              "Do not wrap the JSON in markdown or quotes.",
            ],
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

    let lastFailureReason: string | null = null;
    let lastRawResponseText: string | null = null;

    for (let attempt = 1; attempt <= AI_MAX_RETRIES; attempt += 1) {
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
          lastRawResponseText = await response.text();
          lastFailureReason = `AI request failed with status ${response.status} on attempt ${attempt}/${AI_MAX_RETRIES}.`;
          if (attempt < AI_MAX_RETRIES && response.status >= 500) {
            continue;
          }

          return {
            status: "failed",
            provider: baseUrl,
            model,
            request_payload: requestPayload,
            raw_response_text: lastRawResponseText,
            parsed_output: null,
            failure_reason: lastFailureReason,
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
          lastFailureReason = `AI response did not contain message content on attempt ${attempt}/${AI_MAX_RETRIES}.`;
          if (attempt < AI_MAX_RETRIES) {
            continue;
          }

          return {
            status: "failed",
            provider: baseUrl,
            model,
            request_payload: requestPayload,
            raw_response_text: null,
            parsed_output: null,
            failure_reason: lastFailureReason,
          };
        }

        lastRawResponseText = rawContent;

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
          lastFailureReason = `AI response was not strict JSON on attempt ${attempt}/${AI_MAX_RETRIES}.`;
          if (attempt < AI_MAX_RETRIES) {
            continue;
          }

          return {
            status: "failed",
            provider: baseUrl,
            model,
            request_payload: requestPayload,
            raw_response_text: rawContent,
            parsed_output: null,
            failure_reason: lastFailureReason,
          };
        }
      } catch (error) {
        const timedOut = error instanceof Error && error.name === "AbortError";
        lastFailureReason = timedOut
          ? `AI request timed out after ${AI_TIMEOUT_MS}ms on attempt ${attempt}/${AI_MAX_RETRIES}.`
          : error instanceof Error
            ? `${error.message} on attempt ${attempt}/${AI_MAX_RETRIES}.`
            : `Unknown AI planner error on attempt ${attempt}/${AI_MAX_RETRIES}.`;

        if (attempt < AI_MAX_RETRIES) {
          continue;
        }
      } finally {
        clearTimeout(timeout);
      }
    }

    return {
      status: "failed",
      provider: baseUrl,
      model,
      request_payload: requestPayload,
      raw_response_text: lastRawResponseText,
      parsed_output: null,
      failure_reason: lastFailureReason ?? "AI planner failed after retry budget was exhausted.",
    };
  }
}
