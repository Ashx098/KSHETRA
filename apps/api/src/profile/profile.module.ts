import { Module } from "@nestjs/common";

import { UserContextGuard } from "../common/http/user-context.guard";
import { GuideModule } from "../guide/guide.module";
import { ProfileController } from "./profile.controller";
import { ProfileService } from "./profile.service";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [GuideModule, UsersModule],
  controllers: [ProfileController],
  providers: [ProfileService, UserContextGuard],
  exports: [ProfileService],
})
export class ProfileModule {}
