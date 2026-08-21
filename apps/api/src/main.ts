import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { DomainErrorFilter } from "./modules/shared/presentation/http/domain-error.filter";
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  const allowedOrigins = (
    process.env.FINORA_WEB_ORIGIN ?? "http://localhost:3000"
  )
    .split(",")
    .map((origin) => origin.trim());
  app.enableCors({ origin: allowedOrigins });
  app.useGlobalFilters(new DomainErrorFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const config = new DocumentBuilder()
    .setTitle("Finora API")
    .setDescription("Personal finance state and projection API")
    .setVersion("1.0")
    .build();
  SwaggerModule.setup(
    "api/docs",
    app,
    SwaggerModule.createDocument(app, config),
  );
  await app.listen(process.env.PORT ?? 3001, "0.0.0.0");
}
void bootstrap();
