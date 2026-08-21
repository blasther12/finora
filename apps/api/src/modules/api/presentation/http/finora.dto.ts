import { Transform, Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  AccountType,
  GoalStatus,
  GoalType,
  TransactionStatus,
  TransactionType,
} from "@prisma/client";

const MONEY_PATTERN = /^\d+(?:\.\d{1,2})?$/;
const SIGNED_MONEY_PATTERN = /^-?\d+(?:\.\d{1,2})?$/;
const toStringValue = ({ value }: { value: unknown }) =>
  value === null || value === undefined ? value : String(value);

export class CreateAccountDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(120) name!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  institution?: string;
  @ApiProperty({ enum: AccountType }) @IsEnum(AccountType) type!: AccountType;
  @ApiProperty({ example: "100.00" })
  @Transform(toStringValue)
  @Matches(SIGNED_MONEY_PATTERN)
  initialBalance!: string;
}

export class CreateCreditCardDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(120) name!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(120) institution!: string;
  @ApiProperty({ minimum: 1, maximum: 31 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  closingDay!: number;
  @ApiProperty({ minimum: 1, maximum: 31 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  dueDay!: number;
  @ApiProperty({ example: "5000.00" })
  @Transform(toStringValue)
  @Matches(MONEY_PATTERN)
  creditLimit!: string;
}

export class CreateTransactionDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(240) description!: string;
  @ApiProperty({ example: "10.50" })
  @Transform(toStringValue)
  @Matches(MONEY_PATTERN)
  amount!: string;
  @ApiProperty({ example: "2026-08-20" })
  @IsDateString({ strict: true })
  transactionDate!: string;
  @ApiProperty({ enum: TransactionType })
  @IsEnum(TransactionType)
  type!: TransactionType;
  @ApiPropertyOptional({ enum: TransactionStatus })
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;
  @ApiPropertyOptional() @IsOptional() @IsUUID() categoryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() accountId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() creditCardId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() personId?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class CreateTransferDto {
  @ApiProperty() @IsUUID() fromAccountId!: string;
  @ApiProperty() @IsUUID() toAccountId!: string;
  @ApiProperty({ example: "100.00" })
  @Transform(toStringValue)
  @Matches(MONEY_PATTERN)
  amount!: string;
  @ApiProperty({ example: "2026-08-20" })
  @IsDateString({ strict: true })
  transactionDate!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  description?: string;
}

export class PayBillDto {
  @ApiProperty() @IsUUID() accountId!: string;
  @ApiProperty({ example: "2026-08-20" })
  @IsDateString({ strict: true })
  paymentDate!: string;
}

export class TransactionQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
  @ApiPropertyOptional({ enum: TransactionType })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;
  @ApiPropertyOptional({ enum: TransactionStatus })
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
  @ApiPropertyOptional({ enum: ["asc", "desc"] })
  @IsOptional()
  @IsEnum({ asc: "asc", desc: "desc" })
  sort: "asc" | "desc" = "desc";
}

export class ReferencePeriodQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2200)
  year?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;
}

export class CreateBudgetDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2200)
  year!: number;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) @Max(12) month!: number;
  @ApiProperty() @IsUUID() categoryId!: string;
  @ApiProperty({ example: "1200.00" })
  @Transform(toStringValue)
  @Matches(MONEY_PATTERN)
  limitAmount!: string;
}

export enum SimulationChangeType {
  ADD_EXPENSE = "ADD_EXPENSE",
  ADD_INCOME = "ADD_INCOME",
}

export class SimulationChangeDto {
  @ApiProperty({ enum: SimulationChangeType })
  @IsEnum(SimulationChangeType)
  type!: SimulationChangeType;
  @ApiProperty({ example: "100.00" })
  @Transform(toStringValue)
  @Matches(MONEY_PATTERN)
  amount!: string;
}

export class SimulateProjectionDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2200)
  year!: number;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) @Max(12) month!: number;
  @ApiProperty({ type: [SimulationChangeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SimulationChangeDto)
  changes!: SimulationChangeDto[];
}

export class CreateInstallmentPlanDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(240) description!: string;
  @ApiPropertyOptional({ example: "1200.00" })
  @IsOptional()
  @Transform(toStringValue)
  @Matches(MONEY_PATTERN)
  totalAmount?: string;
  @ApiProperty({ example: "100.00" })
  @Transform(toStringValue)
  @Matches(MONEY_PATTERN)
  installmentAmount!: string;
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(600)
  totalInstallments!: number;
  @ApiProperty({ example: "2026-08-20" })
  @IsDateString({ strict: true })
  startDate!: string;
  @ApiProperty() @IsUUID() categoryId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() creditCardId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() accountId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() personId?: string;
}

export class CreatePersonDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(120) name!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class CreateGoalDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(120) name!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
  @ApiProperty({ example: "10000.00" })
  @Transform(toStringValue)
  @Matches(MONEY_PATTERN)
  targetAmount!: string;
  @ApiPropertyOptional({ example: "0.00" })
  @IsOptional()
  @Transform(toStringValue)
  @Matches(MONEY_PATTERN)
  currentAmount?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString({ strict: true })
  targetDate?: string;
  @ApiProperty({ enum: GoalType }) @IsEnum(GoalType) type!: GoalType;
  @ApiPropertyOptional({ enum: GoalStatus })
  @IsOptional()
  @IsEnum(GoalStatus)
  status?: GoalStatus;
}

export class ToggleRecurringDto {
  @ApiProperty() @IsBoolean() autoGenerate!: boolean;
}
