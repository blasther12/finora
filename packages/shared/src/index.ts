import { z } from "zod";
export const moneySchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, "Use decimal with at most two digits");
export type ApiResponse<T> = { data: T; meta?: Record<string, unknown> };
export const DEFAULT_USER_ID = "00000000-0000-4000-8000-000000000001";
