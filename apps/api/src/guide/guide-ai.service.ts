import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

const GUIDE_AI_TIMEOUT_MS = 8000;
const GUIDE_AI_MAX_RETRIES = 2;
const GUIDE_AI_TEMPERATURE = 0.3;
const GUIDE_AI_MAX_TOKENS = 260;

type GuideAiResult = {
  status: "success" | "failed" | "skipped";
  provider: string | null;
  model: string | null;
  requestPayload: Record<string, unknown>;
  rawResponseText: string | null;
  parsedOutput: unknown | null;
  failureReason: string | null;
};

@Injectable()
export class GuideAiService {
  constructor(private readonly configService: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(
      this.configService.get<string>("AI_BASE_URL") &&
        this.configService.get<string>("AI_MODEL") &&
        this.configService.get<string>("AI_API_KEY"),
    );
  }

  async composeReactiveMessage(input: {
    screen: string;
    trigger_type: string;
    trigger_label: string;
    current_state: Record<string, unknown>;
    allowed_style: {
      max_words: number;
      tone: string;
    };
  }): Promise<GuideAiResult> {
    return this.runStrictJsonRequest({
      task: "Write one short companion reaction for a game-like productivity system.",
      output_schema: {
        title: "string",
        body: "string",
      },
      output_requirements: [
        "Return exactly one JSON object.",
        "Use only the keys title and body.",
        "Keep title under 6 words.",
        "Keep body to one sentence, maximum 22 words.",
        "Do not mention hidden mechanics or unsupported rules.",
        "Do not use copyrighted names or lore.",
        "No markdown, no bullets, no extra keys.",
      ],
      input,
    });
  }

  async answerExplain(input: {
    screen: string;
    question: string;
    topic: string | null;
    current_state: Record<string, unknown>;
    glossary: Array<{ term: string; meaning: string }>;
  }): Promise<GuideAiResult> {
    return this.runStrictJsonRequest({
      task: "Answer a companion guide question about the system state.",
      output_schema: {
        title: "string",
        body: "string",
        bullets: ["string"],
      },
      output_requirements: [
        "Return exactly one JSON object.",
        "Use only the keys title, body, bullets.",
        "body must be at most 3 short sentences.",
        "bullets must contain 0 to 3 short strings.",
        "Do not invent rules, rewards, or unavailable systems.",
        "If unsure, say the system has not unlocked that layer yet.",
        "No markdown, no extra keys.",
      ],
      input,
    });
  }

  private async runStrictJsonRequest(payloadInput: Record<string, unknown>): Promise<GuideAiResult> {
    const baseUrl = this.configService.get<string>("AI_BASE_URL");
    const model = this.configService.get<string>("AI_MODEL");
    const apiKey = this.configService.get<string>("AI_API_KEY");

    const requestPayload = {
      model,
      temperature: GUIDE_AI_TEMPERATURE,
      max_tokens: GUIDE_AI_MAX_TOKENS,
      response_format: { type: "json_object" },
      extra_body: {
        chat_template_kwargs: {
          enable_thinking: false,
        },
      },
      messages: [
        {
          role: "system",
          content: [
            "You are Kael, an original game companion for KSHETRA.",
            "Return one strict JSON object only.",
            "The first non-whitespace character of the reply must be { and the last must be }.",
            "No markdown. No prose outside JSON. No reasoning. No commentary. No preamble.",
            "Keep the tone energetic, sharp, and grounded.",
            "Do not use copyrighted character names, lore, or catchphrases.",
            "Never invent mechanics, rewards, rules, or progression state.",
          ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify(payloadInput),
        },
      ],
    };

    if (!baseUrl || !model || !apiKey) {
      return {
        status: "skipped",
        provider: null,
        model: model ?? null,
        requestPayload,
        rawResponseText: null,
        parsedOutput: null,
        failureReason: "Guide AI is not configured.",
      };
    }

    let lastFailureReason: string | null = null;
    let lastRawResponseText: string | null = null;

    for (let attempt = 1; attempt <= GUIDE_AI_MAX_RETRIES; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), GUIDE_AI_TIMEOUT_MS);

      try {
        const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(requestPayload),
          signal: controller.signal,
        });

        if (!response.ok) {
          lastRawResponseText = await response.text();
          lastFailureReason = `Guide AI request failed with status ${response.status} on attempt ${attempt}/${GUIDE_AI_MAX_RETRIES}.`;
          if (attempt < GUIDE_AI_MAX_RETRIES && response.status >= 500) {
            continue;
          }

          return {
            status: "failed",
            provider: baseUrl,
            model,
            requestPayload,
            rawResponseText: lastRawResponseText,
            parsedOutput: null,
            failureReason: lastFailureReason,
          };
        }

        const payload = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const rawContent = payload.choices?.[0]?.message?.content ?? null;

        if (!rawContent) {
          lastFailureReason = `Guide AI response did not contain message content on attempt ${attempt}/${GUIDE_AI_MAX_RETRIES}.`;
          if (attempt < GUIDE_AI_MAX_RETRIES) {
            continue;
          }

          return {
            status: "failed",
            provider: baseUrl,
            model,
            requestPayload,
            rawResponseText: null,
            parsedOutput: null,
            failureReason: lastFailureReason,
          };
        }

        lastRawResponseText = rawContent;

        try {
          return {
            status: "success",
            provider: baseUrl,
            model,
            requestPayload,
            rawResponseText: rawContent,
            parsedOutput: JSON.parse(rawContent),
            failureReason: null,
          };
        } catch {
          lastFailureReason = `Guide AI response was not strict JSON on attempt ${attempt}/${GUIDE_AI_MAX_RETRIES}.`;
          if (attempt < GUIDE_AI_MAX_RETRIES) {
            continue;
          }

          return {
            status: "failed",
            provider: baseUrl,
            model,
            requestPayload,
            rawResponseText: rawContent,
            parsedOutput: null,
            failureReason: lastFailureReason,
          };
        }
      } catch (error) {
        const timedOut = error instanceof Error && error.name === "AbortError";
        lastFailureReason = timedOut
          ? `Guide AI request timed out after ${GUIDE_AI_TIMEOUT_MS}ms on attempt ${attempt}/${GUIDE_AI_MAX_RETRIES}.`
          : error instanceof Error
            ? `${error.message} on attempt ${attempt}/${GUIDE_AI_MAX_RETRIES}.`
            : `Unknown guide AI error on attempt ${attempt}/${GUIDE_AI_MAX_RETRIES}.`;

        if (attempt < GUIDE_AI_MAX_RETRIES) {
          continue;
        }
      } finally {
        clearTimeout(timeout);
      }
    }

    return {
      status: "failed",
      provider: baseUrl ?? null,
      model: model ?? null,
      requestPayload,
      rawResponseText: lastRawResponseText,
      parsedOutput: null,
      failureReason: lastFailureReason ?? "Guide AI failed unexpectedly.",
    };
  }
}
