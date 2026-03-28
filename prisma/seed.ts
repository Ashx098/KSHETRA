import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
    metadata: {
      effort_layer: "micro",
      attribute_weights: [{ code: "strength", weight: 1.0 }],
    },
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
    metadata: {
      effort_layer: "micro",
      attribute_weights: [{ code: "wisdom", weight: 1.0 }],
    },
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
    metadata: {
      effort_layer: "micro",
      attribute_weights: [
        { code: "focus", weight: 0.8 },
        { code: "wealth", weight: 0.2 },
      ],
    },
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
    metadata: {
      effort_layer: "structured",
      attribute_weights: [
        { code: "mastery", weight: 0.7 },
        { code: "wisdom", weight: 0.3 },
      ],
    },
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
    metadata: {
      effort_layer: "structured",
      attribute_weights: [
        { code: "wealth", weight: 0.7 },
        { code: "mastery", weight: 0.3 },
      ],
    },
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
    metadata: {
      effort_layer: "micro",
      attribute_weights: [{ code: "bond", weight: 1.0 }],
    },
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
