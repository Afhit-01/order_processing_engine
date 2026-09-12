import type { Refund } from "../types.js";

export const Refunds: Refund[] = [];

let nextRefundId = 1;
export const getNextRefundId = (): string => String(nextRefundId++);
