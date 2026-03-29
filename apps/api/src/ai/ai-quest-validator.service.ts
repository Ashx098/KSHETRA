import { Injectable } from "@nestjs/common";

export interface ValidatedDailyQuestPlan {
  mandatory: string[];
  optional: string[];
  stretch: string[];
}

interface AllowedTemplate {
  code: string;
  assignment_kind: "mandatory" | "optional" | "stretch";
  difficulty?: "low" | "medium" | "high";
  attribute_family?: string;
  cooldown_days?: number;
  max_occurrences_in_7d?: number;
}

@Injectable()
export class AiQuestValidatorService {
  validateDailyPlan(
    value: unknown,
    allowedTemplates: AllowedTemplate[],
    constraints?: {
      recentMandatoryTemplateCodes?: string[];
      recent7dTemplateCounts?: Record<string, number>;
    },
  ): {
    valid: boolean;
    normalized: ValidatedDailyQuestPlan | null;
    rejection_reasons: string[];
  } {
    const rejectionReasons: string[] = [];

    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {
        valid: false,
        normalized: null,
        rejection_reasons: ["AI output was not a JSON object."],
      };
    }

    const record = value as Record<string, unknown>;
    const allowedKeys = ["mandatory", "optional", "stretch"];
    const extraKeys = Object.keys(record).filter((key) => !allowedKeys.includes(key));

    if (extraKeys.length > 0) {
      rejectionReasons.push(`Unexpected keys: ${extraKeys.join(", ")}.`);
    }

    const mandatory = this.readTemplateCodes(record.mandatory, "mandatory", rejectionReasons);
    const optional = this.readTemplateCodes(record.optional, "optional", rejectionReasons);
    const stretch = this.readStretch(record.stretch, rejectionReasons);

    if (mandatory.length !== 3) {
      rejectionReasons.push("Mandatory quest count must be exactly 3.");
    }

    if (optional.length !== 2) {
      rejectionReasons.push("Optional quest count must be exactly 2.");
    }

    if (stretch.length > 1) {
      rejectionReasons.push("Stretch quest count must be at most 1.");
    }

    const allCodes = [...mandatory, ...optional, ...stretch];
    const duplicateCodes = allCodes.filter(
      (code, index) => allCodes.indexOf(code) !== index,
    );

    if (duplicateCodes.length > 0) {
      rejectionReasons.push(`Duplicate template codes: ${[...new Set(duplicateCodes)].join(", ")}.`);
    }

    const allowedByCode = new Map(allowedTemplates.map((template) => [template.code, template]));

    for (const code of mandatory) {
      const match = allowedByCode.get(code);
      if (!match || match.assignment_kind !== "mandatory") {
        rejectionReasons.push(`Invalid mandatory template code: ${code}.`);
      }
    }

    for (const code of optional) {
      const match = allowedByCode.get(code);
      if (!match || match.assignment_kind !== "optional") {
        rejectionReasons.push(`Invalid optional template code: ${code}.`);
      }
    }

    for (const code of stretch) {
      const match = allowedByCode.get(code);
      if (!match || match.assignment_kind !== "stretch") {
        rejectionReasons.push(`Invalid stretch template code: ${code}.`);
      }
    }

    const mandatoryFamilies = new Set(
      mandatory
        .map((code) => allowedByCode.get(code)?.attribute_family)
        .filter((value): value is string => Boolean(value)),
    );
    if (mandatoryFamilies.size < Math.min(3, mandatory.length)) {
      rejectionReasons.push("Mandatory quests must cover at least 3 attribute families.");
    }

    const highDifficultyCount = allCodes.filter(
      (code) => allowedByCode.get(code)?.difficulty === "high",
    ).length;
    if (highDifficultyCount > 1) {
      rejectionReasons.push("Daily plan overloads high difficulty content.");
    }

    const recentMandatory = new Set(constraints?.recentMandatoryTemplateCodes ?? []);
    for (const code of mandatory) {
      if (recentMandatory.has(code)) {
        rejectionReasons.push(`Mandatory template repeated too soon: ${code}.`);
      }
    }

    const recent7dCounts = constraints?.recent7dTemplateCounts ?? {};
    for (const code of allCodes) {
      const match = allowedByCode.get(code);
      if (!match?.max_occurrences_in_7d) {
        continue;
      }

      if ((recent7dCounts[code] ?? 0) >= match.max_occurrences_in_7d) {
        rejectionReasons.push(`Template exceeds 7-day repetition limit: ${code}.`);
      }
    }

    if (rejectionReasons.length > 0) {
      return {
        valid: false,
        normalized: null,
        rejection_reasons: rejectionReasons,
      };
    }

    return {
      valid: true,
      normalized: {
        mandatory,
        optional,
        stretch,
      },
      rejection_reasons: [],
    };
  }

  private readTemplateCodes(
    value: unknown,
    key: string,
    rejectionReasons: string[],
  ): string[] {
    if (!Array.isArray(value)) {
      rejectionReasons.push(`${key} must be an array.`);
      return [];
    }

    return value.flatMap((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        rejectionReasons.push(`${key} items must be objects.`);
        return [];
      }

      const record = item as Record<string, unknown>;
      const keys = Object.keys(record);
      if (keys.length !== 1 || keys[0] !== "template_code") {
        rejectionReasons.push(`${key} items must only contain template_code.`);
        return [];
      }

      if (typeof record.template_code !== "string" || !record.template_code.trim()) {
        rejectionReasons.push(`${key} template_code must be a non-empty string.`);
        return [];
      }

      return [record.template_code.trim()];
    });
  }

  private readStretch(
    value: unknown,
    rejectionReasons: string[],
  ): string[] {
    if (value === null || typeof value === "undefined") {
      return [];
    }

    if (!value || typeof value !== "object" || Array.isArray(value)) {
      rejectionReasons.push("stretch must be an object or null.");
      return [];
    }

    const record = value as Record<string, unknown>;
    const keys = Object.keys(record);
    if (keys.length !== 1 || keys[0] !== "template_code") {
      rejectionReasons.push("stretch must only contain template_code.");
      return [];
    }

    if (typeof record.template_code !== "string" || !record.template_code.trim()) {
      rejectionReasons.push("stretch template_code must be a non-empty string.");
      return [];
    }

    return [record.template_code.trim()];
  }
}
