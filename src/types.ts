export type OrderStatus =
  | "pending"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "return_requested"
  | "returned";

export type ReturnStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "in_transit"
  | "received"
  | "refunded";

export type RefundStatus = "pending" | "completed" | "failed";

export interface OrderItem {
  productId: number;
  name: string;
  unitPrice: number;
  quantity: number;
}

export interface Order {
  id: number;
  customerName: string;
  items: OrderItem[];
  status: OrderStatus;
  createdAt: string; // ISO date string
}

export interface ReturnRequest {
  id: number;
  orderId: number;
  productId: number;
  reason: string;
  quantity: number;
  requestedAt: string; // ISO date string
  approvedAt?: string; // ISO date string
  status: ReturnStatus;
}

export interface Refund {
  id: number;
  returnRequestId: number;
  orderId: number;
  productId: number;
  amount: number;
  status: RefundStatus;
  requestedAt: string; // ISO date string
  completedAt: string | null; // ISO date string
}
