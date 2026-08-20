import { Module } from "@nestjs/common";
import { FinanceModule } from "../finance/finance.module";
import { AnalyticsService } from "./application/services/analytics.service";

@Module({
  imports: [FinanceModule],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
