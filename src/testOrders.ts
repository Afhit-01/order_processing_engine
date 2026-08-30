import type { OrderItem } from "./types.js";

type testModel = {
  customerName: string;
  items: OrderItem[];
}

const testOrders: testModel[] = [

  // Customer 1
  {
    customerName: "Fatihu",
    items: [
      {
        productId: 86,
        name: "Mechanical Keyboard",
        unitPrice: 45000,
        quantity: 1,
      },
      {
        productId: 87,
        name: "Wireless Mouse",
        unitPrice: 18000,
        quantity: 2,
      },
    ],
  },

  {
    customerName: "Fatihu",
    items: [
      {
        productId: 103,
        name: "USB-C Cable",
        unitPrice: 5000,
        quantity: 3,
      },
    ],
  },

  // Customer 2
  {
    customerName: "Qubit",
    items: [
      {
        productId: 93,
        name: "Laptop Stand",
        unitPrice: 25000,
        quantity: 1,
      },
    ],
  },

  {
    customerName: "Qubit",
    items: [
      {
        productId: 90,
        name: "Textbooks",
        unitPrice: 35000,
        quantity: 1,
      },
      {
        productId: 106,
        name: "Phone Case",
        unitPrice: 8000,
        quantity: 2,
      },
    ],
  },

  // Customer 3
  {
    customerName: "Ibrahim",
    items: [
      {
        productId: 80,
        name: "Football Boots",
        unitPrice: 30000,
        quantity: 1,
      },
      {
        productId: 108,
        name: "Headphones",
        unitPrice: 12000,
        quantity: 1,
      },
    ],
  },

  // Customer 4
  {
    customerName: "Romdah",
    items: [
      {
        productId: 93,
        name: "Chicken",
        unitPrice: 120000,
        quantity: 1,
      },
    ],
  },
];

export default testOrders;