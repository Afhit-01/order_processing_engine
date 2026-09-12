import type { OrderItem, OrderStatus } from "../types.js";

const isOrderItem = (value: unknown): value is OrderItem => {
  if (typeof value !== "object" || value === null) return false;

  const item = value as Record<string, unknown>;
  return (
    typeof item.productId === "string" &&
    typeof item.name === "string" &&
    typeof item.unitPrice === "number" &&
    typeof item.quantity === "number"
  );
};

export const isCreateOrderPayload = (
  body: unknown,
): body is { customerName: string; items: OrderItem[] } => {
  if (typeof body !== "object" || body === null) return false;

  const payload = body as Record<string, unknown>;

  return (
    typeof payload.customerName === "string" &&
    Array.isArray(payload.items) &&
    payload.items.every((item) => isOrderItem(item))
  );
};

const orderStatuses = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
  "return_requested",
  "returned",
] as const;

export const isValidStatus = (status: unknown): status is OrderStatus => {
  if (typeof status !== "string") return false;

  return orderStatuses.includes(status as OrderStatus);
};

export function isValidParam(
  value: string | string[] | undefined,
): value is string {
  return typeof value === "string";
}

// Used for route params that represent actual numeric business fields
// (e.g. quantity), not IDs.
export const isNumericString = (value: unknown): value is string => {
  return (
    typeof value === "string" &&
    value.trim() !== "" &&
    !Number.isNaN(Number(value))
  );
};
