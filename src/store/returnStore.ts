import type { ReturnRequest } from "../types.js";

export const ReturnRequests: ReturnRequest[] = [];

let nextReturnId = 1;
export const getNextReturnId = (): string => String(nextReturnId++);
