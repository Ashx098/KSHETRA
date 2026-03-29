import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module";
import { InternalController } from "./internal.controller";
import { InternalService } from "./internal.service";

@Module({
  imports: [PrismaModule],
  controllers: [InternalController],
  providers: [InternalService],
})
export class InternalModule {}
