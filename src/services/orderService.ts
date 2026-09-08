import type { Order, OrderItem, OrderStatus } from "../types.js";
import { Orders, getNextOrderId } from "../store/orderStore.js";

export const validTransitions: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: ["return_requested"],
  cancelled: [],
  return_requested: ["returned"],
  returned: [],
};

export const createOrder = (
  customerName: string,
  items: OrderItem[],
): { success: true; order: Order } | { success: false; reason: string } => {
  if (items.length === 0) {
    return { success: false, reason: "Order cart cannot be empty" };
  }

  const hasNegatives = items.some(
    (entity) => entity.quantity <= 0 || entity.unitPrice <= 0,
  );

  if (hasNegatives) {
    return {
      success: false,
      reason: "Quantity or UnitPrice cart must be greater than 0",
    };
  }

  const order: Order = {
    id: getNextOrderId(),
    customerName,
    items,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  Orders.push(order);
  return { success: true, order };
};

export const updateOrderStatus = (
  id: number,
  newStatus: OrderStatus,
): { success: true } | { success: false; reason: string } => {
  const order = Orders.find((order) => order.id === id);

  if (!order) {
    return { success: false, reason: `Order with id ${id} does not exist` };
  }

  const isValid = validTransitions[order.status].includes(newStatus);

  if (!isValid) {
    return {
      success: false,
      reason: `Cannot change status from ${order.status} to ${newStatus}. Wanna retry..?`,
    };
  }

  order.status = newStatus;
  return { success: true };
};

export const getOrderById = (id: number): Order | null => {
  const order = Orders.find((order) => order.id === id);
  return order || null;
};

export const getOrderTotal = (id: number): number | null => {
  const order = Orders.find((order) => order.id === id);
  if (!order) return null;

  return order.items.reduce(
    (total, entity) => total + entity.quantity * entity.unitPrice,
    0,
  );
};

export const getOrdersByStatus = (status: OrderStatus): Order[] => {
  return Orders.filter((order) => order.status === status);
};

export const cancelOrder = (
  id: number,
): { success: true } | { success: false; reason: string } => {
  const order = Orders.find((order) => order.id === id);

  if (!order) {
    return { success: false, reason: "Item not found" };
  }

  if (order.status === "pending" || order.status === "confirmed") {
    order.status = "cancelled";
    return { success: true };
  }

  return { success: false, reason: "Can't cancel at this stage" };
};

export const getOrderReport = (): {
  totalOrders: number;
  byStatus: Record<OrderStatus, number>;
  revenue: number;
} => {
  const completedOrders = Orders.filter(
    (order) =>
      order.status === "confirmed" ||
      order.status === "shipped" ||
      order.status === "delivered",
  );

  const revenue = completedOrders.reduce(
    (total, order) =>
      total +
      order.items.reduce(
        (sub, entity) => sub + entity.quantity * entity.unitPrice,
        0,
      ),
    0,
  );

  const byStatus = {
    pending: Orders.filter((o) => o.status === "pending").length,
    confirmed: Orders.filter((o) => o.status === "confirmed").length,
    shipped: Orders.filter((o) => o.status === "shipped").length,
    delivered: Orders.filter((o) => o.status === "delivered").length,
    cancelled: Orders.filter((o) => o.status === "cancelled").length,
    return_requested: Orders.filter((o) => o.status === "return_requested").length,
    returned: Orders.filter((o) => o.status === "returned").length,
  };

  return { totalOrders: Orders.length, byStatus, revenue };
};