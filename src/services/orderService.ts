import type { Order, OrderItem, OrderStatus, JwtPayload } from "../types.js";
import {
  getOrderByIdFromDb,
  getOrderReportFromId,
  getOrdersByStatusFromDb,
  insertOrder,
  updateOrderStatusInDb,
} from "../store/orderStore.js";

export const validTransitions: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: ["return_requested"],
  cancelled: [],
  return_requested: ["returned", "delivered"],
  returned: [],
};

export const createOrder = async (
  user: JwtPayload,
  items: OrderItem[],
): Promise<
  { success: true; order: Order } | { success: false; reason: string }
> => {
  if (items.length === 0) {
    return { success: false, reason: "Order cart cannot be empty" };
  }

  const hasNegatives = items.some(
    (entity) => entity.quantity <= 0 || entity.unitPrice <= 0,
  );

  if (hasNegatives) {
    return {
      success: false,
      reason: "Quantity or UnitPrice must be greater than 0",
    };
  }

  // Ensure only customers place orders through this path
  if (user.role !== "customer") {
    return { success: false, reason: "Only customers can place orders" };
  }

  const order = await insertOrder(user.id, "Customer", items);
  return { success: true, order };
};

export const getOrderById = async (id: string, user: JwtPayload): Promise<Order | null> => {
  const order = await getOrderByIdFromDb(id);

  if (!order) return null;

  return order;
};

export const getOrdersByStatus = async (
  status: OrderStatus,
  user: JwtPayload,
): Promise<Order[]> => {
  // If customer, pass their ID to filter. If staff/admin, pass undefined to get all.
  const customerIdFilter = user.role === "customer" ? user.id : undefined;
  return await getOrdersByStatusFromDb(status, customerIdFilter);
};

export const updateOrderStatus = async (
  id: string,
  newStatus: OrderStatus,
): Promise<{ success: true } | { success: false; reason: string }> => {
  const order = await getOrderByIdFromDb(id);

  if (!order) {
    return { success: false, reason: `Order with id ${id} does not exist` };
  }

  const isValid = validTransitions[order.status].includes(newStatus);

  if (!isValid) {
    return {
      success: false,
      reason: `Cannot change status from ${order.status} to ${newStatus}`,
    };
  }

  await updateOrderStatusInDb(id, newStatus);
  return { success: true };
};

export const getOrderTotal = async (id: string): Promise<number | null> => {
  const order = await getOrderByIdFromDb(id);
  if (!order) return null;

  return order.items.reduce(
    (total, entity) => total + entity.quantity * entity.unitPrice,
    0,
  );
};

export const cancelOrder = async (
  id: string,
): Promise<{ success: true } | { success: false; reason: string }> => {
  const order = await getOrderByIdFromDb(id);

  if (!order) {
    return { success: false, reason: "Item not found" };
  }

  if (order.status === "pending" || order.status === "confirmed") {
    await updateOrderStatusInDb(id, "cancelled");
    return { success: true };
  }

  return { success: false, reason: "Can't cancel at this stage" };
};

export const getOrderReport = async () => {
  return await getOrderReportFromId();
};