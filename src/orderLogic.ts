import type { Order, OrderItem, OrderStatus } from "./types.js";

const Orders: Order[] = [];
let nextId = 1;

const validTransitions: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

const createOrder = (
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
    id: nextId++,
    customerName: customerName,
    items: items,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  Orders.push(order);
  return {
    success: true,
    order: order,
  };
};

const updateOrderStatus = (
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

const getOrderTotal = (id: number): number | null => {
  const orderedStuff = Orders.find((order) => order.id === id);

  if (!orderedStuff) return null;

  const prices = orderedStuff.items.map(
    (entity) => entity.quantity * entity.unitPrice,
  );

  let orderTotal = 0;
  for (const price of prices) {
    orderTotal += price;
  }

  return orderTotal;
};

const getOrdersByStatus = (status: OrderStatus): Order[] => {
  return Orders.filter((order) => order.status === status);
};

const cancelOrder = (
  id: number,
): { success: true } | { success: false; reason: string } => {
  const order = Orders.find((order) => order.id === id);

  if (!order) {
    return { success: false, reason: "Item not found" };
  }

  if (order.status === "pending" || order.status === "confirmed") {
    order.status = "cancelled";
    return { success: true };
  } else {
    return {
      success: false,
      reason: "Can't cancel at this stage",
    };
  }
};

const getOrderReport = (): {
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

  let totalRevenue = 0;
  for (const completedOrder of completedOrders) {
    let subTotals = completedOrder.items.map(
      (entity) => entity.quantity * entity.unitPrice,
    );
    for (const subTotal of subTotals) {
      totalRevenue += subTotal;
    }
  }

  const orderCounts = {
    pending: Orders.filter((order) => order.status === "pending").length,
    confirmed: Orders.filter((order) => order.status === "confirmed").length,
    shipped: Orders.filter((order) => order.status === "shipped").length,
    delivered: Orders.filter((order) => order.status === "delivered").length,
    cancelled: Orders.filter((order) => order.status === "cancelled").length,
  };

  return {
    totalOrders: Orders.length,
    byStatus: orderCounts,
    revenue: totalRevenue,
  };
};

export {
  createOrder,
  cancelOrder,
  getOrderReport,
  getOrdersByStatus,
  getOrderTotal,
  updateOrderStatus,
};
