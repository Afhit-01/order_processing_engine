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
  orderId: number;
  productId: number;
  reason: string;
  requestedAt: string; // ISO date string
  approvedAt?: string; // ISO date string
  status: ReturnStatus;
}

