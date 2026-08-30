import {
  createOrder,
  cancelOrder,
  getOrderReport,
  getOrdersByStatus,
  getOrderTotal,
  updateOrderStatus,
} from "./orderLogic.js";

import testOrders from "./testOrders.js";

console.log("\n.......CREATING ORDERS.......");

for (const testOrder of testOrders) {
  const result = createOrder(testOrder.customerName, testOrder.items);

  console.dir(result, { depth: null });
}

console.log("\n.......UPDATING STATUSES.......");

console.log(updateOrderStatus(1, "confirmed"));
console.log(updateOrderStatus(1, "shipped"));
console.log(updateOrderStatus(1, "delivered"));

console.log(updateOrderStatus(2, "confirmed"));

console.log(cancelOrder(3));

console.log(updateOrderStatus(4, "confirmed"));
console.log(updateOrderStatus(4, "shipped"));

console.log(updateOrderStatus(6, "confirmed"));
console.log(cancelOrder(6));

console.log("\n......INVALID TRANSITIONS......");

console.log(updateOrderStatus(1, "cancelled"));

console.log(updateOrderStatus(4, "pending"));

console.log(updateOrderStatus(3, "confirmed"));

console.log(updateOrderStatus(5, "shipped"));

console.log(updateOrderStatus(999, "confirmed"));

console.log("\n......ORDER TOTALS.....");

console.log("Order 1 total:", getOrderTotal(1));
console.log("Order 2 total:", getOrderTotal(2));
console.log("Order 4 total:", getOrderTotal(4));

console.log("Order 999 total:", getOrderTotal(999));

console.log("\n......ORDERS BY STATUS......");

console.log("Pending:", getOrdersByStatus("pending"));
console.log("Confirmed:", getOrdersByStatus("confirmed"));
console.log("Shipped:", getOrdersByStatus("shipped"));
console.log("Delivered:", getOrdersByStatus("delivered"));
console.log("Cancelled:", getOrdersByStatus("cancelled"));

console.log("\n........CANCELLATION TESTS.......");

console.log(cancelOrder(1));

console.log(cancelOrder(4));

console.log(cancelOrder(3));

console.log(cancelOrder(999));

console.log("\n......FINAL ORDER REPORT......");

console.log(getOrderReport());
