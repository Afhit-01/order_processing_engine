export type OrderStatus =
  | "pending"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled";

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
