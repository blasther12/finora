import { Module } from "@nestjs/common";
import { CardBillingCycleService } from "./domain/services/card-billing-cycle.service";

@Module({
  providers: [CardBillingCycleService],
  exports: [CardBillingCycleService],
})
export class CreditCardsModule {}
