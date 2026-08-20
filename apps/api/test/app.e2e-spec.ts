import type { INestApplication } from "@nestjs/common";
import { ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request = require("supertest");
import { AppModule } from "../src/app.module";

describe("Finora API (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(() => app.close());

  it("reports API and PostgreSQL health", async () => {
    const response = await request(app.getHttpServer())
      .get("/health")
      .expect(200);
    expect(response.body).toEqual({ data: { api: "ok", postgres: "ok" } });
  });

  it("rejects an invalid account before persistence", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/accounts")
      .send({ name: "", type: "INVALID", initialBalance: "not-money" })
      .expect(400);
  });
});
