import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";

import { UsersService } from "../../users/users.service";
import { requireUserId } from "./request-context";

@Injectable()
export class UserContextGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    }>();
    const rawHeader = request.headers["x-user-id"];
    const userId = requireUserId(
      Array.isArray(rawHeader) ? rawHeader[0] : rawHeader,
    );

    await this.usersService.assertUserExists(userId);
    return true;
  }
}
