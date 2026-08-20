import { Module } from "@nestjs/common";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { FinoraController } from "./modules/api/presentation/http/finora.controller";
import { FinanceModule } from "./modules/finance/finance.module";
import { SharedModule } from "./modules/shared/shared.module";

@Module({
  imports: [SharedModule, FinanceModule, AnalyticsModule],
  controllers: [FinoraController],
})
export class AppModule {}
