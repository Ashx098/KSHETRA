import { NestFactory } from "@nestjs/core";

import { ApiExceptionFilter } from "./common/filters/api-exception.filter";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";
  const port = Number(process.env.API_PORT ?? 4000);

  app.setGlobalPrefix("api/v1");
  app.enableCors({
    origin: webOrigin,
    credentials: true,
  });
  app.useGlobalFilters(new ApiExceptionFilter());

  await app.listen(port);
}

void bootstrap();
