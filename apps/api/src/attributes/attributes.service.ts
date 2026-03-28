import {
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import type { Prisma, UserAttribute } from "@prisma/client";
import type { AttributeResponseData } from "@kshetra/types";
import { ATTRIBUTE_CODES } from "@kshetra/types";

import { decimalToNumber } from "../common/http/serializers";
import { PrismaService } from "../prisma/prisma.service";

type UserAttributeWithDefinition = UserAttribute & {
  attribute: {
    code: string;
    displayName: string;
    description: string;
  };
};

@Injectable()
export class AttributesService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureCatalogSeeded(tx: Prisma.TransactionClient): Promise<void> {
    const attributes = await tx.attribute.findMany({
      select: { code: true },
    });

    if (attributes.length !== ATTRIBUTE_CODES.length) {
      throw new InternalServerErrorException(
        "Attribute catalog is missing. Run the Prisma seed before onboarding users.",
      );
    }
  }

  async seedForUser(
    tx: Prisma.TransactionClient,
    userId: string,
  ): Promise<void> {
    await this.ensureCatalogSeeded(tx);

    await tx.userAttribute.createMany({
      data: ATTRIBUTE_CODES.map((code: (typeof ATTRIBUTE_CODES)[number]) => ({
        userId,
        attributeCode: code,
        value: 0,
        cap: 30,
        growthRate: 1,
      })),
    });
  }

  async listForUser(userId: string): Promise<AttributeResponseData[]> {
    const records = await this.prisma.userAttribute.findMany({
      where: { userId },
      include: {
        attribute: true,
      },
    });

    return records
      .map((record) => this.toResponse(record))
      .sort(
        (left, right) =>
          ATTRIBUTE_CODES.indexOf(left.code) - ATTRIBUTE_CODES.indexOf(right.code),
      );
  }

  toResponse(record: UserAttributeWithDefinition): AttributeResponseData {
    return {
      code: record.attribute.code as AttributeResponseData["code"],
      display_name: record.attribute.displayName,
      description: record.attribute.description,
      value: decimalToNumber(record.value),
      cap: decimalToNumber(record.cap),
      growth_rate: decimalToNumber(record.growthRate),
      last_updated_at: record.lastUpdatedAt.toISOString(),
    };
  }
}
