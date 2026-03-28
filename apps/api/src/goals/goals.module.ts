import { Module } from "@nestjs/common";

import { UserContextGuard } from "../common/http/user-context.guard";
import { UsersModule } from "../users/users.module";
import { GoalsController } from "./goals.controller";
import { GoalsService } from "./goals.service";

@Module({
  imports: [UsersModule],
  controllers: [GoalsController],
  providers: [GoalsService, UserContextGuard],
  exports: [GoalsService],
})
export class GoalsModule {}
