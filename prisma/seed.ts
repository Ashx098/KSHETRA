import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type SeedAttributeCode =
  | "strength"
  | "wisdom"
  | "focus"
  | "mastery"
  | "wealth"
  | "bond";

function dailyMetadata(input: {
  effortLayer: "micro" | "structured";
  attributeFamily: SeedAttributeCode;
  cooldownDays: number;
  maxOccurrencesIn7d: number;
  goalTags: string[];
  framingTags: string[];
  attributeWeights: Array<{ code: SeedAttributeCode; weight: number }>;
}) {
  return {
    effort_layer: input.effortLayer,
    cooldown_days: input.cooldownDays,
    max_occurrences_in_7d: input.maxOccurrencesIn7d,
    attribute_family: input.attributeFamily,
    goal_tags: input.goalTags,
    framing_tags: input.framingTags,
    attribute_weights: input.attributeWeights,
  };
}

const attributeSeeds = [
  {
    code: "strength",
    displayName: "Strength",
    description: "Physical health, activity consistency, and recovery discipline.",
  },
  {
    code: "wisdom",
    displayName: "Wisdom",
    description: "Reflection, philosophical grounding, and lived judgment.",
  },
  {
    code: "focus",
    displayName: "Focus",
    description: "Attention control, deep work, and distraction resistance.",
  },
  {
    code: "mastery",
    displayName: "Mastery",
    description: "Technical and intellectual growth through applied learning.",
  },
  {
    code: "wealth",
    displayName: "Wealth",
    description: "Productive output, leverage, and career-building progress.",
  },
  {
    code: "bond",
    displayName: "Bond",
    description: "Meaningful relationship investment, presence, and support.",
  },
] as const;

const questTemplateSeeds = [
  {
    code: "complete_workout_session",
    title: "Complete Workout Session",
    description: "Finish one honest workout session today.",
    questCategory: "daily",
    questType: "daily",
    assignmentKind: "mandatory",
    difficulty: "medium",
    rewardXpBase: 6,
    defaultAttributeCode: "strength",
    sortOrder: 10,
    metadata: dailyMetadata({
      effortLayer: "micro",
      attributeFamily: "strength",
      cooldownDays: 2,
      maxOccurrencesIn7d: 2,
      goalTags: ["fitness", "discipline"],
      framingTags: ["body", "activation"],
      attributeWeights: [{ code: "strength", weight: 1.0 }],
    }),
  },
  {
    code: "mobility_reset",
    title: "Mobility Reset",
    description: "Complete one honest mobility or recovery reset block.",
    questCategory: "daily",
    questType: "daily",
    assignmentKind: "mandatory",
    difficulty: "low",
    rewardXpBase: 6,
    defaultAttributeCode: "strength",
    sortOrder: 12,
    metadata: dailyMetadata({
      effortLayer: "micro",
      attributeFamily: "strength",
      cooldownDays: 2,
      maxOccurrencesIn7d: 2,
      goalTags: ["fitness", "recovery"],
      framingTags: ["repair", "reset"],
      attributeWeights: [
        { code: "strength", weight: 0.8 },
        { code: "focus", weight: 0.2 },
      ],
    }),
  },
  {
    code: "walk_target",
    title: "Walk Target",
    description: "Hit one deliberate walking target with attention and pace.",
    questCategory: "daily",
    questType: "daily",
    assignmentKind: "mandatory",
    difficulty: "low",
    rewardXpBase: 6,
    defaultAttributeCode: "strength",
    sortOrder: 14,
    metadata: dailyMetadata({
      effortLayer: "micro",
      attributeFamily: "strength",
      cooldownDays: 1,
      maxOccurrencesIn7d: 2,
      goalTags: ["fitness", "energy"],
      framingTags: ["movement", "stability"],
      attributeWeights: [
        { code: "strength", weight: 0.7 },
        { code: "wisdom", weight: 0.3 },
      ],
    }),
  },
  {
    code: "read_and_reflect",
    title: "Read and Reflect",
    description: "Read with attention and write a short reflection.",
    questCategory: "daily",
    questType: "daily",
    assignmentKind: "mandatory",
    difficulty: "low",
    rewardXpBase: 6,
    defaultAttributeCode: "wisdom",
    sortOrder: 20,
    metadata: dailyMetadata({
      effortLayer: "micro",
      attributeFamily: "wisdom",
      cooldownDays: 2,
      maxOccurrencesIn7d: 2,
      goalTags: ["learning", "spiritual"],
      framingTags: ["reflection", "integration"],
      attributeWeights: [{ code: "wisdom", weight: 1.0 }],
    }),
  },
  {
    code: "journal_and_integrate",
    title: "Journal and Integrate",
    description: "Write a short honest journal entry that closes one open loop.",
    questCategory: "daily",
    questType: "daily",
    assignmentKind: "mandatory",
    difficulty: "low",
    rewardXpBase: 6,
    defaultAttributeCode: "wisdom",
    sortOrder: 22,
    metadata: dailyMetadata({
      effortLayer: "micro",
      attributeFamily: "wisdom",
      cooldownDays: 2,
      maxOccurrencesIn7d: 2,
      goalTags: ["learning", "clarity"],
      framingTags: ["journaling", "grounding"],
      attributeWeights: [
        { code: "wisdom", weight: 0.8 },
        { code: "bond", weight: 0.2 },
      ],
    }),
  },
  {
    code: "silence_block",
    title: "Silence Block",
    description: "Hold one quiet block without input and let the mind settle.",
    questCategory: "daily",
    questType: "daily",
    assignmentKind: "mandatory",
    difficulty: "low",
    rewardXpBase: 6,
    defaultAttributeCode: "wisdom",
    sortOrder: 24,
    metadata: dailyMetadata({
      effortLayer: "micro",
      attributeFamily: "wisdom",
      cooldownDays: 2,
      maxOccurrencesIn7d: 2,
      goalTags: ["spiritual", "clarity"],
      framingTags: ["silence", "stability"],
      attributeWeights: [
        { code: "wisdom", weight: 0.75 },
        { code: "focus", weight: 0.25 },
      ],
    }),
  },
  {
    code: "complete_one_deep_work_block",
    title: "Complete One Deep Work Block",
    description: "Protect one focused work block without shallow switching.",
    questCategory: "daily",
    questType: "daily",
    assignmentKind: "mandatory",
    difficulty: "medium",
    rewardXpBase: 6,
    defaultAttributeCode: "focus",
    sortOrder: 30,
    metadata: dailyMetadata({
      effortLayer: "micro",
      attributeFamily: "focus",
      cooldownDays: 2,
      maxOccurrencesIn7d: 3,
      goalTags: ["career", "project"],
      framingTags: ["deep-work", "attention"],
      attributeWeights: [
        { code: "focus", weight: 0.8 },
        { code: "wealth", weight: 0.2 },
      ],
    }),
  },
  {
    code: "single_task_sprint",
    title: "Single-Task Sprint",
    description: "Complete one clean sprint on a single task without switching.",
    questCategory: "daily",
    questType: "daily",
    assignmentKind: "mandatory",
    difficulty: "medium",
    rewardXpBase: 6,
    defaultAttributeCode: "focus",
    sortOrder: 32,
    metadata: dailyMetadata({
      effortLayer: "micro",
      attributeFamily: "focus",
      cooldownDays: 2,
      maxOccurrencesIn7d: 3,
      goalTags: ["career", "project"],
      framingTags: ["discipline", "attention"],
      attributeWeights: [
        { code: "focus", weight: 0.75 },
        { code: "mastery", weight: 0.25 },
      ],
    }),
  },
  {
    code: "device_restraint_block",
    title: "Device Restraint Block",
    description: "Keep one block clear of compulsive device checking.",
    questCategory: "daily",
    questType: "daily",
    assignmentKind: "mandatory",
    difficulty: "medium",
    rewardXpBase: 6,
    defaultAttributeCode: "focus",
    sortOrder: 34,
    metadata: dailyMetadata({
      effortLayer: "micro",
      attributeFamily: "focus",
      cooldownDays: 2,
      maxOccurrencesIn7d: 2,
      goalTags: ["discipline", "clarity"],
      framingTags: ["restraint", "signal"],
      attributeWeights: [
        { code: "focus", weight: 0.8 },
        { code: "wisdom", weight: 0.2 },
      ],
    }),
  },
  {
    code: "technical_learning_session",
    title: "Technical Learning Session",
    description: "Complete one meaningful technical learning session.",
    questCategory: "daily",
    questType: "daily",
    assignmentKind: "optional",
    difficulty: "medium",
    rewardXpBase: 16,
    defaultAttributeCode: "mastery",
    sortOrder: 40,
    metadata: dailyMetadata({
      effortLayer: "structured",
      attributeFamily: "mastery",
      cooldownDays: 2,
      maxOccurrencesIn7d: 2,
      goalTags: ["learning", "career"],
      framingTags: ["skill", "depth"],
      attributeWeights: [
        { code: "mastery", weight: 0.7 },
        { code: "wisdom", weight: 0.3 },
      ],
    }),
  },
  {
    code: "deliberate_skill_drill",
    title: "Deliberate Skill Drill",
    description: "Run one focused drill on a skill that still feels weak.",
    questCategory: "daily",
    questType: "daily",
    assignmentKind: "optional",
    difficulty: "medium",
    rewardXpBase: 16,
    defaultAttributeCode: "mastery",
    sortOrder: 42,
    metadata: dailyMetadata({
      effortLayer: "structured",
      attributeFamily: "mastery",
      cooldownDays: 2,
      maxOccurrencesIn7d: 2,
      goalTags: ["learning", "project"],
      framingTags: ["drill", "practice"],
      attributeWeights: [
        { code: "mastery", weight: 0.75 },
        { code: "focus", weight: 0.25 },
      ],
    }),
  },
  {
    code: "study_and_apply",
    title: "Study and Apply",
    description: "Learn one concept and apply it immediately to real work.",
    questCategory: "daily",
    questType: "daily",
    assignmentKind: "optional",
    difficulty: "medium",
    rewardXpBase: 16,
    defaultAttributeCode: "mastery",
    sortOrder: 44,
    metadata: dailyMetadata({
      effortLayer: "structured",
      attributeFamily: "mastery",
      cooldownDays: 2,
      maxOccurrencesIn7d: 2,
      goalTags: ["learning", "career"],
      framingTags: ["application", "synthesis"],
      attributeWeights: [
        { code: "mastery", weight: 0.65 },
        { code: "wealth", weight: 0.2 },
        { code: "wisdom", weight: 0.15 },
      ],
    }),
  },
  {
    code: "meaningful_project_progress",
    title: "Meaningful Project Progress",
    description: "Move one real project forward with visible output.",
    questCategory: "daily",
    questType: "daily",
    assignmentKind: "optional",
    difficulty: "medium",
    rewardXpBase: 16,
    defaultAttributeCode: "wealth",
    sortOrder: 50,
    metadata: dailyMetadata({
      effortLayer: "structured",
      attributeFamily: "wealth",
      cooldownDays: 2,
      maxOccurrencesIn7d: 2,
      goalTags: ["career", "project"],
      framingTags: ["shipping", "output"],
      attributeWeights: [
        { code: "wealth", weight: 0.7 },
        { code: "mastery", weight: 0.3 },
      ],
    }),
  },
  {
    code: "financial_review_block",
    title: "Financial Review Block",
    description: "Review one real money signal, expense pattern, or financial decision.",
    questCategory: "daily",
    questType: "daily",
    assignmentKind: "optional",
    difficulty: "medium",
    rewardXpBase: 16,
    defaultAttributeCode: "wealth",
    sortOrder: 52,
    metadata: dailyMetadata({
      effortLayer: "structured",
      attributeFamily: "wealth",
      cooldownDays: 3,
      maxOccurrencesIn7d: 1,
      goalTags: ["career", "wealth"],
      framingTags: ["clarity", "money"],
      attributeWeights: [
        { code: "wealth", weight: 0.75 },
        { code: "wisdom", weight: 0.25 },
      ],
    }),
  },
  {
    code: "leverage_task_push",
    title: "Leverage Task Push",
    description: "Finish one task that increases future leverage instead of just clearing backlog.",
    questCategory: "daily",
    questType: "daily",
    assignmentKind: "optional",
    difficulty: "medium",
    rewardXpBase: 16,
    defaultAttributeCode: "wealth",
    sortOrder: 54,
    metadata: dailyMetadata({
      effortLayer: "structured",
      attributeFamily: "wealth",
      cooldownDays: 2,
      maxOccurrencesIn7d: 2,
      goalTags: ["career", "project"],
      framingTags: ["leverage", "systems"],
      attributeWeights: [
        { code: "wealth", weight: 0.6 },
        { code: "focus", weight: 0.2 },
        { code: "mastery", weight: 0.2 },
      ],
    }),
  },
  {
    code: "quality_presence",
    title: "Quality Presence",
    description: "Show up with real attention for one meaningful interaction.",
    questCategory: "daily",
    questType: "daily",
    assignmentKind: "stretch",
    difficulty: "medium",
    rewardXpBase: 6,
    defaultAttributeCode: "bond",
    sortOrder: 60,
    metadata: dailyMetadata({
      effortLayer: "micro",
      attributeFamily: "bond",
      cooldownDays: 2,
      maxOccurrencesIn7d: 2,
      goalTags: ["relationship", "presence"],
      framingTags: ["attention", "connection"],
      attributeWeights: [{ code: "bond", weight: 1.0 }],
    }),
  },
  {
    code: "family_check_in",
    title: "Family Check-In",
    description: "Make one sincere check-in with family or someone who genuinely matters.",
    questCategory: "daily",
    questType: "daily",
    assignmentKind: "stretch",
    difficulty: "medium",
    rewardXpBase: 6,
    defaultAttributeCode: "bond",
    sortOrder: 62,
    metadata: dailyMetadata({
      effortLayer: "micro",
      attributeFamily: "bond",
      cooldownDays: 2,
      maxOccurrencesIn7d: 2,
      goalTags: ["relationship", "family"],
      framingTags: ["repair", "connection"],
      attributeWeights: [
        { code: "bond", weight: 0.85 },
        { code: "wisdom", weight: 0.15 },
      ],
    }),
  },
  {
    code: "gratitude_message",
    title: "Gratitude Message",
    description: "Send one honest gratitude message that is specific and real.",
    questCategory: "daily",
    questType: "daily",
    assignmentKind: "stretch",
    difficulty: "low",
    rewardXpBase: 6,
    defaultAttributeCode: "bond",
    sortOrder: 64,
    metadata: dailyMetadata({
      effortLayer: "micro",
      attributeFamily: "bond",
      cooldownDays: 2,
      maxOccurrencesIn7d: 2,
      goalTags: ["relationship", "presence"],
      framingTags: ["gratitude", "signal"],
      attributeWeights: [
        { code: "bond", weight: 0.8 },
        { code: "wisdom", weight: 0.2 },
      ],
    }),
  },
  {
    code: "sleep_hygiene_lock",
    title: "Sleep Hygiene Lock",
    description: "Set up tonight so recovery is protected before the day ends.",
    questCategory: "daily",
    questType: "daily",
    assignmentKind: "stretch",
    difficulty: "medium",
    rewardXpBase: 6,
    defaultAttributeCode: "strength",
    sortOrder: 66,
    metadata: dailyMetadata({
      effortLayer: "micro",
      attributeFamily: "strength",
      cooldownDays: 2,
      maxOccurrencesIn7d: 2,
      goalTags: ["fitness", "recovery"],
      framingTags: ["rest", "discipline"],
      attributeWeights: [
        { code: "strength", weight: 0.7 },
        { code: "wisdom", weight: 0.3 },
      ],
    }),
  },
  {
    code: "planning_block",
    title: "Planning Block",
    description: "Plan the next meaningful push with clarity instead of drift.",
    questCategory: "daily",
    questType: "daily",
    assignmentKind: "stretch",
    difficulty: "medium",
    rewardXpBase: 6,
    defaultAttributeCode: "focus",
    sortOrder: 68,
    metadata: dailyMetadata({
      effortLayer: "micro",
      attributeFamily: "focus",
      cooldownDays: 2,
      maxOccurrencesIn7d: 2,
      goalTags: ["career", "clarity"],
      framingTags: ["planning", "command"],
      attributeWeights: [
        { code: "focus", weight: 0.65 },
        { code: "wealth", weight: 0.2 },
        { code: "wisdom", weight: 0.15 },
      ],
    }),
  },
] as const;

const eventTemplateSeeds = [
  {
    code: "recovery_rescue_block",
    title: "Rescue Block",
    description: "Take one focused 15-minute rescue block to stabilize the day.",
    eventType: "recovery",
    difficulty: "low",
    rewardXpBase: 6,
    defaultAttributeCode: "focus",
    sortOrder: 10,
    metadata: {
      effort_layer: "micro",
      trigger_reason: "save_the_day",
      attribute_weights: [
        { code: "focus", weight: 0.7 },
        { code: "mastery", weight: 0.3 },
      ],
    },
  },
  {
    code: "mystery_golden_window",
    title: "Golden Window",
    description: "Use the current window well. Finish one high-quality, self-contained push.",
    eventType: "mystery",
    difficulty: "medium",
    rewardXpBase: 16,
    defaultAttributeCode: "mastery",
    sortOrder: 20,
    metadata: {
      effort_layer: "structured",
      trigger_reason: "rare_bonus_window",
      attribute_weights: [
        { code: "mastery", weight: 0.6 },
        { code: "wealth", weight: 0.4 },
      ],
    },
  },
] as const;

const dungeonTemplateSeeds = [
  {
    code: "foundation_forge",
    title: "Foundation Forge",
    description:
      "A heavier weekly structure that reinforces training, deep work, and reflection without replacing the daily loop.",
    difficulty: "high",
    rewardXpBase: 40,
    expectedDurationDays: 7,
    defaultAttributeCode: "focus",
    sortOrder: 10,
    metadata: {
      effort_layer: "dungeon",
      attribute_weights: [
        { code: "focus", weight: 0.45 },
        { code: "strength", weight: 0.3 },
        { code: "wisdom", weight: 0.25 },
      ],
    },
    objectives: [
      {
        objectiveCode: "forge_workouts",
        title: "Forge the Body",
        description: "Log 3 real workout sessions across the dungeon run.",
        targetCount: 3,
        sortOrder: 10,
      },
      {
        objectiveCode: "forge_deep_work",
        title: "Forge the Mind",
        description: "Complete 4 deep work blocks with clear output.",
        targetCount: 4,
        sortOrder: 20,
      },
      {
        objectiveCode: "forge_reflection",
        title: "Forge Through Reflection",
        description: "Finish 2 honest read-and-reflect sessions.",
        targetCount: 2,
        sortOrder: 30,
      },
    ],
  },
  {
    code: "wealth_engine",
    title: "Wealth Engine",
    description:
      "A medium-term structured push around tangible project movement, technical growth, and leverage.",
    difficulty: "high",
    rewardXpBase: 40,
    expectedDurationDays: 7,
    defaultAttributeCode: "wealth",
    sortOrder: 20,
    metadata: {
      effort_layer: "dungeon",
      attribute_weights: [
        { code: "wealth", weight: 0.5 },
        { code: "mastery", weight: 0.35 },
        { code: "focus", weight: 0.15 },
      ],
    },
    objectives: [
      {
        objectiveCode: "engine_project_push",
        title: "Project Pushes",
        description: "Ship 3 meaningful project progress sessions.",
        targetCount: 3,
        sortOrder: 10,
      },
      {
        objectiveCode: "engine_learning_blocks",
        title: "Learning Blocks",
        description: "Complete 3 technical learning sessions tied to applied growth.",
        targetCount: 3,
        sortOrder: 20,
      },
      {
        objectiveCode: "engine_output_review",
        title: "Output Review",
        description: "Review, refine, or consolidate output twice before closing the dungeon.",
        targetCount: 2,
        sortOrder: 30,
      },
    ],
  },
  {
    code: "body_reset_protocol",
    title: "Body Reset Protocol",
    description:
      "A grounded reset arc for sleep, movement, and recovery discipline when the body needs order again.",
    difficulty: "high",
    rewardXpBase: 40,
    expectedDurationDays: 7,
    defaultAttributeCode: "strength",
    sortOrder: 30,
    metadata: {
      effort_layer: "dungeon",
      theme: "body_reset",
      attribute_weights: [
        { code: "strength", weight: 0.55 },
        { code: "wisdom", weight: 0.25 },
        { code: "focus", weight: 0.2 },
      ],
    },
    objectives: [
      {
        objectiveCode: "reset_walks",
        title: "Reclaim Movement",
        description: "Log 4 deliberate walk or movement sessions.",
        targetCount: 4,
        sortOrder: 10,
      },
      {
        objectiveCode: "reset_sleep_locks",
        title: "Protect Recovery",
        description: "Complete 3 recovery or sleep-hygiene locks.",
        targetCount: 3,
        sortOrder: 20,
      },
      {
        objectiveCode: "reset_mobility",
        title: "Restore Mobility",
        description: "Finish 3 mobility or recovery reset blocks.",
        targetCount: 3,
        sortOrder: 30,
      },
    ],
  },
  {
    code: "deep_work_week",
    title: "Deep Work Week",
    description:
      "A focused arc for protecting attention and shipping real cognitive work over several sessions.",
    difficulty: "high",
    rewardXpBase: 40,
    expectedDurationDays: 7,
    defaultAttributeCode: "focus",
    sortOrder: 40,
    metadata: {
      effort_layer: "dungeon",
      theme: "deep_work",
      attribute_weights: [
        { code: "focus", weight: 0.55 },
        { code: "mastery", weight: 0.25 },
        { code: "wealth", weight: 0.2 },
      ],
    },
    objectives: [
      {
        objectiveCode: "deep_blocks",
        title: "Deep Blocks",
        description: "Complete 5 protected deep-work blocks.",
        targetCount: 5,
        sortOrder: 10,
      },
      {
        objectiveCode: "plan_sessions",
        title: "Plan the Push",
        description: "Run 2 deliberate planning sessions before high-value work.",
        targetCount: 2,
        sortOrder: 20,
      },
      {
        objectiveCode: "distraction_restraint",
        title: "Resist Drift",
        description: "Log 3 device-restraint or no-switching wins.",
        targetCount: 3,
        sortOrder: 30,
      },
    ],
  },
  {
    code: "relationship_repair",
    title: "Relationship Repair",
    description:
      "A medium-term arc for showing up better, repairing distance, and investing in real connection.",
    difficulty: "high",
    rewardXpBase: 40,
    expectedDurationDays: 7,
    defaultAttributeCode: "bond",
    sortOrder: 50,
    metadata: {
      effort_layer: "dungeon",
      theme: "relationship_repair",
      attribute_weights: [
        { code: "bond", weight: 0.6 },
        { code: "wisdom", weight: 0.25 },
        { code: "focus", weight: 0.15 },
      ],
    },
    objectives: [
      {
        objectiveCode: "repair_presence",
        title: "Presence Blocks",
        description: "Complete 3 quality-presence or conversation sessions.",
        targetCount: 3,
        sortOrder: 10,
      },
      {
        objectiveCode: "repair_reach_out",
        title: "Reach Out Cleanly",
        description: "Make 3 intentional check-ins or gratitude gestures.",
        targetCount: 3,
        sortOrder: 20,
      },
      {
        objectiveCode: "repair_reflection",
        title: "Reflect Before Reacting",
        description: "Finish 2 short reflection passes tied to relationship repair.",
        targetCount: 2,
        sortOrder: 30,
      },
    ],
  },
  {
    code: "reflection_clarity_cycle",
    title: "Reflection and Clarity Cycle",
    description:
      "A steadier arc for reducing inner noise and rebuilding clarity through reading, journaling, and silence.",
    difficulty: "high",
    rewardXpBase: 40,
    expectedDurationDays: 7,
    defaultAttributeCode: "wisdom",
    sortOrder: 60,
    metadata: {
      effort_layer: "dungeon",
      theme: "reflection_clarity",
      attribute_weights: [
        { code: "wisdom", weight: 0.55 },
        { code: "focus", weight: 0.25 },
        { code: "bond", weight: 0.2 },
      ],
    },
    objectives: [
      {
        objectiveCode: "clarity_reflections",
        title: "Reflection Sessions",
        description: "Complete 4 read-and-reflect or journaling sessions.",
        targetCount: 4,
        sortOrder: 10,
      },
      {
        objectiveCode: "clarity_silence",
        title: "Silence Discipline",
        description: "Hold 3 silence or no-input blocks.",
        targetCount: 3,
        sortOrder: 20,
      },
      {
        objectiveCode: "clarity_review",
        title: "Review and Integrate",
        description: "Do 2 review-and-integrate passes on what is changing.",
        targetCount: 2,
        sortOrder: 30,
      },
    ],
  },
] as const;

const raidTemplateSeeds = [
  {
    code: "career_ascension_arc",
    title: "Career Ascension Arc",
    description:
      "A high-significance raid focused on shipping visible work, refining it, and proving closure with a real summary.",
    difficulty: "high",
    rewardXpBase: 100,
    expectedDurationDays: 14,
    defaultAttributeCode: "wealth",
    sortOrder: 10,
    metadata: {
      effort_layer: "raid",
      attribute_weights: [
        { code: "wealth", weight: 0.45 },
        { code: "mastery", weight: 0.35 },
        { code: "focus", weight: 0.2 },
      ],
    },
    objectives: [
      {
        objectiveCode: "ascension_ship_work",
        title: "Ship Visible Work",
        description: "Log 5 substantial output pushes that visibly move work forward.",
        targetCount: 5,
        requiresVerification: true,
        sortOrder: 10,
      },
      {
        objectiveCode: "ascension_refine",
        title: "Refine and Review",
        description: "Complete 3 deliberate review or refinement passes.",
        targetCount: 3,
        requiresVerification: false,
        sortOrder: 20,
      },
      {
        objectiveCode: "ascension_close",
        title: "Close the Arc",
        description: "Finish 1 final consolidation step that can be described clearly in the completion summary.",
        targetCount: 1,
        requiresVerification: true,
        sortOrder: 30,
      },
    ],
  },
  {
    code: "self_mastery_summit",
    title: "Self-Mastery Summit",
    description:
      "A higher-effort raid around discipline, reflection, and sustained personal control across multiple sessions.",
    difficulty: "high",
    rewardXpBase: 100,
    expectedDurationDays: 14,
    defaultAttributeCode: "focus",
    sortOrder: 20,
    metadata: {
      effort_layer: "raid",
      attribute_weights: [
        { code: "focus", weight: 0.4 },
        { code: "wisdom", weight: 0.35 },
        { code: "strength", weight: 0.25 },
      ],
    },
    objectives: [
      {
        objectiveCode: "summit_training",
        title: "Training Discipline",
        description: "Log 4 serious training or recovery discipline steps.",
        targetCount: 4,
        requiresVerification: false,
        sortOrder: 10,
      },
      {
        objectiveCode: "summit_deep_blocks",
        title: "Attention Control",
        description: "Complete 4 deep work or distraction-resistant focus blocks.",
        targetCount: 4,
        requiresVerification: true,
        sortOrder: 20,
      },
      {
        objectiveCode: "summit_reflection",
        title: "Reflective Closure",
        description: "Finish 2 deeper reflection sessions that can support a final raid summary.",
        targetCount: 2,
        requiresVerification: true,
        sortOrder: 30,
      },
    ],
  },
  {
    code: "relationship_restoration_campaign",
    title: "Relationship Restoration Campaign",
    description:
      "A high-significance raid focused on presence, repair, and proving relational follow-through with a real summary.",
    difficulty: "high",
    rewardXpBase: 100,
    expectedDurationDays: 14,
    defaultAttributeCode: "bond",
    sortOrder: 30,
    metadata: {
      effort_layer: "raid",
      theme: "relationship_restoration",
      attribute_weights: [
        { code: "bond", weight: 0.5 },
        { code: "wisdom", weight: 0.3 },
        { code: "focus", weight: 0.2 },
      ],
    },
    objectives: [
      {
        objectiveCode: "restoration_presence",
        title: "Presence Commitments",
        description: "Log 4 serious presence or conversation commitments.",
        targetCount: 4,
        requiresVerification: true,
        sortOrder: 10,
      },
      {
        objectiveCode: "restoration_repair",
        title: "Repair Gestures",
        description: "Complete 3 repair or gratitude gestures with real intent.",
        targetCount: 3,
        requiresVerification: true,
        sortOrder: 20,
      },
      {
        objectiveCode: "restoration_closure",
        title: "Relational Closure",
        description: "Finish 1 clean closure step that can be described honestly in the summary.",
        targetCount: 1,
        requiresVerification: true,
        sortOrder: 30,
      },
    ],
  },
  {
    code: "financial_order_campaign",
    title: "Financial Order Campaign",
    description:
      "A major arc for restoring financial clarity, discipline, and leverage through evidence-backed action.",
    difficulty: "high",
    rewardXpBase: 100,
    expectedDurationDays: 14,
    defaultAttributeCode: "wealth",
    sortOrder: 40,
    metadata: {
      effort_layer: "raid",
      theme: "financial_order",
      attribute_weights: [
        { code: "wealth", weight: 0.5 },
        { code: "wisdom", weight: 0.25 },
        { code: "mastery", weight: 0.25 },
      ],
    },
    objectives: [
      {
        objectiveCode: "order_reviews",
        title: "Financial Reviews",
        description: "Run 4 deliberate financial review or cleanup sessions.",
        targetCount: 4,
        requiresVerification: false,
        sortOrder: 10,
      },
      {
        objectiveCode: "order_leverage",
        title: "Leverage Moves",
        description: "Complete 3 leverage-building actions tied to money or career structure.",
        targetCount: 3,
        requiresVerification: true,
        sortOrder: 20,
      },
      {
        objectiveCode: "order_closure",
        title: "Order Closure",
        description: "Finish 1 consolidation step that proves the campaign actually changed something.",
        targetCount: 1,
        requiresVerification: true,
        sortOrder: 30,
      },
    ],
  },
  {
    code: "builder_launch_arc",
    title: "Builder Launch Arc",
    description:
      "A high-effort raid for shipping a real builder push from focused work through visible output and closure.",
    difficulty: "high",
    rewardXpBase: 100,
    expectedDurationDays: 14,
    defaultAttributeCode: "mastery",
    sortOrder: 50,
    metadata: {
      effort_layer: "raid",
      theme: "builder_launch",
      attribute_weights: [
        { code: "mastery", weight: 0.4 },
        { code: "wealth", weight: 0.35 },
        { code: "focus", weight: 0.25 },
      ],
    },
    objectives: [
      {
        objectiveCode: "launch_build",
        title: "Build Sessions",
        description: "Log 5 real build or implementation pushes.",
        targetCount: 5,
        requiresVerification: false,
        sortOrder: 10,
      },
      {
        objectiveCode: "launch_ship",
        title: "Ship Evidence",
        description: "Produce 2 visible shipping or release moments.",
        targetCount: 2,
        requiresVerification: true,
        sortOrder: 20,
      },
      {
        objectiveCode: "launch_summary",
        title: "Launch Closure",
        description: "Complete 1 final closure step that can anchor the completion summary.",
        targetCount: 1,
        requiresVerification: true,
        sortOrder: 30,
      },
    ],
  },
] as const;

async function main(): Promise<void> {
  for (const attribute of attributeSeeds) {
    await prisma.attribute.upsert({
      where: { code: attribute.code },
      update: {
        displayName: attribute.displayName,
        description: attribute.description,
      },
      create: attribute,
    });
  }

  for (const template of questTemplateSeeds) {
    await prisma.questTemplate.upsert({
      where: { code: template.code },
      update: {
        title: template.title,
        description: template.description,
        questCategory: template.questCategory,
        questType: template.questType,
        assignmentKind: template.assignmentKind,
        difficulty: template.difficulty,
        rewardXpBase: template.rewardXpBase,
        defaultAttributeCode: template.defaultAttributeCode,
        sortOrder: template.sortOrder,
        metadata: template.metadata,
        isActive: true,
      },
      create: {
        code: template.code,
        title: template.title,
        description: template.description,
        questCategory: template.questCategory,
        questType: template.questType,
        assignmentKind: template.assignmentKind,
        difficulty: template.difficulty,
        rewardXpBase: template.rewardXpBase,
        defaultAttributeCode: template.defaultAttributeCode,
        sortOrder: template.sortOrder,
        metadata: template.metadata,
      },
    });
  }

  for (const template of eventTemplateSeeds) {
    await prisma.eventTemplate.upsert({
      where: { code: template.code },
      update: {
        title: template.title,
        description: template.description,
        eventType: template.eventType,
        difficulty: template.difficulty,
        rewardXpBase: template.rewardXpBase,
        defaultAttributeCode: template.defaultAttributeCode,
        sortOrder: template.sortOrder,
        metadata: template.metadata,
        isActive: true,
      },
      create: {
        code: template.code,
        title: template.title,
        description: template.description,
        eventType: template.eventType,
        difficulty: template.difficulty,
        rewardXpBase: template.rewardXpBase,
        defaultAttributeCode: template.defaultAttributeCode,
        sortOrder: template.sortOrder,
        metadata: template.metadata,
      },
    });
  }

  for (const template of dungeonTemplateSeeds) {
    const dungeonTemplate = await prisma.dungeonTemplate.upsert({
      where: { code: template.code },
      update: {
        title: template.title,
        description: template.description,
        difficulty: template.difficulty,
        rewardXpBase: template.rewardXpBase,
        expectedDurationDays: template.expectedDurationDays,
        defaultAttributeCode: template.defaultAttributeCode,
        sortOrder: template.sortOrder,
        metadata: template.metadata,
        isActive: true,
      },
      create: {
        code: template.code,
        title: template.title,
        description: template.description,
        difficulty: template.difficulty,
        rewardXpBase: template.rewardXpBase,
        expectedDurationDays: template.expectedDurationDays,
        defaultAttributeCode: template.defaultAttributeCode,
        sortOrder: template.sortOrder,
        metadata: template.metadata,
      },
    });

    for (const objective of template.objectives) {
      await prisma.dungeonTemplateObjective.upsert({
        where: {
          templateId_objectiveCode: {
            templateId: dungeonTemplate.id,
            objectiveCode: objective.objectiveCode,
          },
        },
        update: {
          title: objective.title,
          description: objective.description,
          targetCount: objective.targetCount,
          sortOrder: objective.sortOrder,
          metadata: {},
        },
        create: {
          templateId: dungeonTemplate.id,
          objectiveCode: objective.objectiveCode,
          title: objective.title,
          description: objective.description,
          targetCount: objective.targetCount,
          sortOrder: objective.sortOrder,
          metadata: {},
        },
      });
    }
  }

  for (const template of raidTemplateSeeds) {
    const raidTemplate = await prisma.raidTemplate.upsert({
      where: { code: template.code },
      update: {
        title: template.title,
        description: template.description,
        difficulty: template.difficulty,
        rewardXpBase: template.rewardXpBase,
        expectedDurationDays: template.expectedDurationDays,
        defaultAttributeCode: template.defaultAttributeCode,
        sortOrder: template.sortOrder,
        metadata: template.metadata,
        isActive: true,
      },
      create: {
        code: template.code,
        title: template.title,
        description: template.description,
        difficulty: template.difficulty,
        rewardXpBase: template.rewardXpBase,
        expectedDurationDays: template.expectedDurationDays,
        defaultAttributeCode: template.defaultAttributeCode,
        sortOrder: template.sortOrder,
        metadata: template.metadata,
      },
    });

    for (const objective of template.objectives) {
      await prisma.raidTemplateObjective.upsert({
        where: {
          templateId_objectiveCode: {
            templateId: raidTemplate.id,
            objectiveCode: objective.objectiveCode,
          },
        },
        update: {
          title: objective.title,
          description: objective.description,
          targetCount: objective.targetCount,
          requiresVerification: objective.requiresVerification,
          sortOrder: objective.sortOrder,
          metadata: {},
        },
        create: {
          templateId: raidTemplate.id,
          objectiveCode: objective.objectiveCode,
          title: objective.title,
          description: objective.description,
          targetCount: objective.targetCount,
          requiresVerification: objective.requiresVerification,
          sortOrder: objective.sortOrder,
          metadata: {},
        },
      });
    }
  }
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
    await prisma.$disconnect();
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
