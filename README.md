# **Order Processing Engine**

A backend API for managing the full lifecycle of an order, from creation through confirmation, shipping, delivery, return requests, and refunds. Built with validated state transitions, business rule enforcement, return-request handling, refund processing, and revenue reporting..

## **Tech Stack**

* Node.js
* TypeScript
* Express

## **Project Structure**

```text
src/
├── server.ts                    Express app setup and router mounting
├── types.ts                     Shared type definitions
├── returnLogic.ts               Return-request factory function
│
├── store/
│   ├── orderStore.ts            In-memory order array and ID generator
│   ├── returnStore.ts           In-memory return-request array and ID generator
│   └── refundStore.ts           In-memory refund array and ID generator
│
├── services/
│   ├── orderService.ts          Order lifecycle logic, state transitions, validation
│   ├── returnService.ts         Return-request business rules and transitions
│   └── refundService.ts         Refund processing and completion logic
│
├── routes/
│   ├── ordersRouter.ts          /orders route handlers
│   ├── returnsRouter.ts         /return route handlers
│   └── refundsRouter.ts         /refunds route handlers
│
├── middleware/
│   └── validateBody.ts           Generic request body validation middleware
│
└── validation/
    └── orderValidation.ts        Runtime type guards for request bodies and route params
```

The app follows a layered **store → service → route** architecture:

* **store**: Holds application data in in-memory arrays and handles ID generation.
* **service**: Contains business rules, validation, and state transitions. Services interact with the stores.
* **route**: Contains Express request handlers and delegates business logic to services.
* **middleware**: Contains reusable Express middleware, such as generic request-body validation.
* **validation**: Contains runtime type guards used to validate incoming request data.

## **Runtime Request Validation**

TypeScript types do not exist at runtime, so `req.body` and `req.params` are validated before values are passed into service functions.

| Guard                  | Checks                                                                          |
| ---------------------- | ------------------------------------------------------------------------------- |
| `isCreateOrderPayload` | `customerName` is a string and `items` is an array of valid `OrderItem` objects |
| `isValidStatus`        | The value is one of the seven valid `OrderStatus` strings                       |
| `isNumericString`      | The value is a non-empty string that converts to a valid number                 |

`isNumericString` guards route parameters that are passed into `Number(...)`, ensuring that invalid `orderId`, `productId`, `quantity`, and `refundId` values are rejected with a `400` response instead of silently becoming `NaN`.

Request-body values are also validated according to their expected runtime types. For example, `refundAmount` must be a JavaScript `number`, while `outcome` must be a string containing either `"completed"` or `"failed"`.

The `validateBody` middleware wraps type guards to reject invalid request bodies with a `400` response before the route handler runs.

## **Domain Model**

| Type            | Description                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------- |
| `OrderStatus`   | Union type: `pending`, `confirmed`, `shipped`, `delivered`, `cancelled`, `return_requested`, `returned` |
| `ReturnStatus`  | Union type: `pending`, `approved`, `rejected`, `in_transit`, `received`, `refunded`                     |
| `RefundStatus`  | Union type: `pending`, `completed`, `failed`                                                            |
| `OrderItem`     | `productId`, `name`, `unitPrice`, `quantity`                                                            |
| `Order`         | `id`, `customerName`, `items`, `status`, `createdAt`                                                    |
| `ReturnRequest` | `id`, `orderId`, `productId`, `quantity`, `reason`, `requestedAt`, `approvedAt?`, `status`              |
| `Refund`        | `id`, `returnRequestId`, `orderId`, `productId`, `amount`, `status`, `requestedAt`, `completedAt`       |

## **Order State Machine**

An order can only move through its lifecycle using specific, validated transitions:

```text
pending          -> confirmed, cancelled
confirmed        -> shipped, cancelled
shipped          -> delivered
delivered        -> return_requested
return_requested -> returned, delivered
returned         -> (terminal, no further transitions)
cancelled        -> (terminal, no further transitions)
```

Any transition not listed above is rejected with a clear reason rather than silently applied or crashing the server.

## **Return Request State Machine**

A return request has its own lifecycle:

```text
pending     -> approved, rejected
approved    -> in_transit
rejected    -> (terminal)
in_transit  -> received
received    -> refunded
refunded    -> (terminal)
```

The return workflow is:

```text
Submit return
      ↓
   pending
      ↓
Review return
   ↙       ↘
approved  rejected
   ↓
in_transit
   ↓
received
   ↓
refund requested
   ↓
  refunded
```

## **Refund State Machine**

A refund begins in the `pending` state after a refund request is created:

```text
pending -> completed, failed
completed -> (terminal)
failed    -> (terminal)
```

A refund can only be requested after the associated return has been received.

When a refund is completed successfully:

```text
Return: received -> refunded
Order:  return_requested -> returned
Refund: pending -> completed
```

The refund completion logic updates these related resources in sequence and only marks the refund as completed after the return and order updates succeed.

## **Validation Rules**

* The request body for creating an order must contain a valid `customerName` and `items` array.
* An order with an empty cart is rejected.
* An item with a non-positive quantity or unit price is rejected.
* Any route parameter expected to be numeric is validated before being converted with `Number(...)`.
* A status change must use one of the seven valid `OrderStatus` values.
* An order status transition must exist in the order state machine.
* A return request is only accepted for orders in the `delivered` or `return_requested` state.
* A return request is rejected after 30 days from the order creation date.
* A return request must include a `reason`, and the reason must be a string.
* A request against an order ID that does not exist is rejected.
* A return request against a product ID that is not present in the order is rejected.
* A refund amount must be provided as a number.
* A refund amount must be greater than `0`.
* A refund can only be requested for a return request in the `received` state.
* A refund can only be completed while it is in the `pending` state.
* A refund completion outcome must be either `completed` or `failed`.

Validation functions return typed results such as `{ success: true, ... }` or `{ success: false, reason }` instead of throwing, allowing the API layer to handle service results consistently.

## **API Endpoints**

### **Orders**

| Method   | Route                     | Behavior                                     |
| -------- | ------------------------- | -------------------------------------------- |
| `POST`   | `/orders`                 | Create a new order                           |
| `GET`    | `/orders`                 | Filter orders by status (`?status=<status>`) |
| `GET`    | `/orders/:orderId`        | Get a single order by ID                     |
| `GET`    | `/orders/report`          | Get revenue and status breakdown             |
| `GET`    | `/orders/:orderId/total`  | Compute an order's total                     |
| `PATCH`  | `/orders/:orderId/status` | Transition an order's status                 |
| `DELETE` | `/orders/:orderId`        | Cancel an order without hard deletion        |

### **Returns**

| Method  | Route                                   | Behavior                                      |
| ------- | --------------------------------------- | --------------------------------------------- |
| `PATCH` | `/return/:orderId/:productId/:quantity` | Submit a return request                       |
| `PATCH` | `/return/:orderId/:productId/review`    | Approve or reject a return request            |
| `PATCH` | `/return/:orderId/:productId/ship`      | Mark an approved return as in transit         |
| `PATCH` | `/return/:orderId/:productId/receive`   | Mark an in-transit return as received         |
| `POST`  | `/return/:orderId/:productId/refund`    | Create a refund request for a received return |

### **Refunds**

| Method  | Route                         | Behavior                                     |
| ------- | ----------------------------- | -------------------------------------------- |
| `PATCH` | `/refunds/:refundId/complete` | Mark a pending refund as completed or failed |

## **Getting Started**

```bash
git clone https://github.com/Afhit-01/order_processing_engine.git
cd order_processing_engine
npm install
npx ts-node src/server.ts
```

The server runs on:

```text
http://localhost:3000
```

## **Example Requests**

### Create an order

```bash
curl -X POST http://localhost:3000/orders \
-H "Content-Type: application/json" \
-d '{
  "customerName": "Ada Lovelace",
  "items": [
    {
      "productId": 1,
      "name": "Notebook",
      "unitPrice": 5,
      "quantity": 2
    }
  ]
}'
```

### Get an order by ID

```bash
curl http://localhost:3000/orders/1
```

### Filter orders by status

```bash
curl "http://localhost:3000/orders?status=pending"
```

### Confirm an order

```bash
curl -X PATCH http://localhost:3000/orders/1/status \
-H "Content-Type: application/json" \
-d '{ "status": "confirmed" }'
```

### Request a return

A return request requires the order to be eligible for return and the requested product to exist in the order.

```bash
curl -X PATCH http://localhost:3000/return/1/1/2 \
-H "Content-Type: application/json" \
-d '{ "reason": "Wrong size" }'
```

### Review a return

Approve the return:

```bash
curl -X PATCH http://localhost:3000/return/1/1/review \
-H "Content-Type: application/json" \
-d '{ "review": "approved" }'
```

Reject the return:

```bash
curl -X PATCH http://localhost:3000/return/1/1/review \
-H "Content-Type: application/json" \
-d '{ "review": "rejected" }'
```

### Mark a return as in transit

```bash
curl -X PATCH http://localhost:3000/return/1/1/ship
```

### Receive a return

```bash
curl -X PATCH http://localhost:3000/return/1/1/receive
```

### Create a refund request

The `refundAmount` must be a number.

```bash
curl -X POST http://localhost:3000/return/1/1/refund \
-H "Content-Type: application/json" \
-d '{ "refundAmount": 10 }'
```

A successful request creates the refund with a `pending` status.

### Complete a refund

Complete the refund:

```bash
curl -X PATCH http://localhost:3000/refunds/1/complete \
-H "Content-Type: application/json" \
-d '{ "outcome": "completed" }'
```

Mark the refund as failed:

```bash
curl -X PATCH http://localhost:3000/refunds/1/complete \
-H "Content-Type: application/json" \
-d '{ "outcome": "failed" }'
```

### Get the revenue report

```bash
curl http://localhost:3000/orders/report
```

## **Architecture**

The project separates HTTP handling from business logic and data storage:

```text
                    ┌─────────────────┐
                    │     Routes      │
                    │ Express handlers│
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │    Services     │
                    │ Business logic  │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │      Stores     │
                    │ In-memory data  │
                    └─────────────────┘
```

This separation keeps the route layer focused on HTTP concerns while business rules remain inside the service layer.

The current stores are in-memory and are intentionally structured so they can be replaced with a persistent database such as PostgreSQL.

## **Author**

**Fatihu Ayomide Abdulganiyu (Afhit)**

Computer Science student, University of Ilorin

* GitHub: [github.com/Afhit-01](https://github.com/Afhit-01)
* LinkedIn: [fatihu-a-abdulganiyu](https://linkedin.com/in/fatihu-a-abdulganiyu-18115838a)
* Email: [abdulganiyufatihu5.0@gmail.com](mailto:abdulganiyufatihu5.0@gmail.com)
