import type { Order } from "../types.js";

export const Orders: Order[] = [];

let nextId = 1;
export const getNextOrderId = (): number => nextId++;