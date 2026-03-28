import { Body, Controller, Post } from "@nestjs/common";
import type { ApiResponse, OnboardingInput, OnboardingResponseData } from "@kshetra/types";

import { successResponse } from "../common/http/api-response";
import { OnboardingService } from "./onboarding.service";

@Controller("onboarding")
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Post()
  async onboard(
    @Body() body: OnboardingInput,
  ): Promise<ApiResponse<OnboardingResponseData>> {
    return successResponse(await this.onboardingService.onboard(body));
  }
}

