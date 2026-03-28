import { Module } from "@nestjs/common";

import { UserContextGuard } from "../common/http/user-context.guard";
import { UsersModule } from "../users/users.module";
import { AttributesController } from "./attributes.controller";
import { AttributesService } from "./attributes.service";

@Module({
  imports: [UsersModule],
  controllers: [AttributesController],
  providers: [AttributesService, UserContextGuard],
  exports: [AttributesService],
})
export class AttributesModule {}
