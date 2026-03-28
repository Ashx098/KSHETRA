import { Module } from "@nestjs/common";

import { UserContextGuard } from "../common/http/user-context.guard";
import { ProfileController } from "./profile.controller";
import { ProfileService } from "./profile.service";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [UsersModule],
  controllers: [ProfileController],
  providers: [ProfileService, UserContextGuard],
  exports: [ProfileService],
})
export class ProfileModule {}
