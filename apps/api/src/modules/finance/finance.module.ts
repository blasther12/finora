import { Module } from "@nestjs/common";
import { CreditCardsModule } from "../credit-cards/credit-cards.module";
import { FinanceService } from "./application/services/finance.service";

@Module({
  imports: [CreditCardsModule],
  providers: [FinanceService],
  exports: [FinanceService],
})
export class FinanceModule {}
