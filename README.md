# Order Processing Engine

A backend API for managing the full lifecycle of an order, from creation through confirmation, shipping, delivery, and return requests. Built with validated state transitions, business rule enforcement, return-request handling, refund processing, and revenue reporting.

## Tech Stack

- Node.js
- TypeScript
- Express

## Project Structure

```
src/
  server.ts                    Express app setup and router mounting
  types.ts                    Shared type definitions
  returnLogic.ts               Return-request factory function
  store/
    orderStore.ts              In-memory order array and id generator
    returnStore.ts              In-memory return-request array and id generator
    refundStore.ts              In-memory refund array and id generator
  services/
    orderService.ts             Order lifecycle logic, state transitions, validation
    returnService.ts             Return-request business rules (eligibility, window, transitions)
    refundService.ts             Refund processing and completion logic
  routes/
    ordersRouter.ts              /orders route handlers
    returnsRouter.ts             /return route handlers
  middleware/
    validateBody.ts              Generic request body validation middleware
  validation/
    orderValidation.ts           Runtime type guards for request bodies and route params
```

The app is layered store → service → route:

- **store**: holds the data (in-memory arrays for now) and id generation, nothing else
- **service**: holds business rules and validation, imports from store
- **route**: holds Express handlers, imports from service, mounted onto `app` in `server.ts`
- **middleware**: reusable Express middleware, such as generic request body validation

## Runtime Request Validation

TypeScript types don't exist at runtime, so `req.body` and `req.params` are checked with type guards before they reach any service function:

| Guard | Checks |
|---|---|
| `isCreateOrderPayload` | `customerName` is a string and `items` is an array of valid `OrderItem` objects |
| `isValidStatus` | the value is one of the seven `OrderStatus` strings |
| `isNumericString` | the value is a non-empty string that converts to a valid number |

`isNumericString` guards every route parameter that gets passed into `Number(...)`, so a non-numeric `orderId` or `productId` now returns a `400` instead of silently becoming `NaN` and behaving like a not-found order.

The `validateBody` middleware wraps type guards to reject invalid request bodies with a `400` before the route handler runs.

## Domain Model

| Type | Description |
|---|---|
| `OrderStatus` | Union type: `pending`, `confirmed`, `shipped`, `delivered`, `cancelled`, `return_requested`, `returned` |
| `ReturnStatus` | Union type: `pending`, `approved`, `rejected`, `in_transit`, `received`, `refunded` |
| `RefundStatus` | Union type: `pending`, `completed`, `failed` |
| `OrderItem` | `productId`, `name`, `unitPrice`, `quantity` |
| `Order` | `id`, `customerName`, `items`, `status`, `createdAt` |
| `ReturnRequest` | `id`, `orderId`, `productId`, `quantity`, `reason`, `requestedAt`, `approvedAt?`, `status` |
| `Refund` | `id`, `returnRequestId`, `orderId`, `productId`, `amount`, `status`, `requestedAt`, `completedAt` |

## Order State Machine

An order can only move through its lifecycle in specific, validated ways:

```
pending          -> confirmed, cancelled
confirmed        -> shipped, cancelled
shipped          -> delivered
delivered        -> return_requested
return_requested -> returned, delivered
returned         -> (terminal, no further transitions)
cancelled        -> (terminal, no further transitions)
```

Any transition not listed above is rejected with a clear reason rather than silently applied or crashing the server.

## Return Request State Machine

A return request moves through its own lifecycle independently of the order:

```
pending  -> approved, rejected
approved -> in_transit
rejected -> (terminal)
in_transit -> received
received -> refunded
refunded -> (terminal)
```

## Validation Rules

- The request body for creating an order must be a valid `customerName` and `items` array, or the request is rejected before reaching business logic.
- Any `orderId`, `productId`, or `quantity` route parameter must be numeric, or the request is rejected before reaching business logic.
- An order with an empty cart is rejected.
- An item with a non-positive quantity or unit price is rejected.
- A status change must be one of the seven valid `OrderStatus` values, and must be in the transition table, or it is rejected.
- A return request is only accepted for orders already in the `delivered` or `return_requested` state.
- A return request is rejected after 30 days from the order creation date.
- A return request must include a `reason`, and it must be a string.
- A request against an order id that does not exist is rejected.
- A return request against a product id not present in the order is rejected.
- A refund amount must be greater than 0.
- A refund can only be processed for a return request in the `received` status.
- A refund can only be completed when it is in the `pending` status.

Validation functions return a typed result (`{ success: true, ... }` or `{ success: false, reason }`) instead of throwing, so the API layer always has a clean result to work with.

## API Endpoints

| Method | Route | Behavior |
|---|---|---|
| POST | `/orders` | Create a new order (validated) |
| GET | `/orders` | Filter orders by status (`?status=<status>`) |
| GET | `/orders/:orderId` | Get a single order by id |
| GET | `/orders/report` | Revenue and status breakdown |
| GET | `/orders/:orderId/total` | Compute an order's total |
| PATCH | `/orders/:orderId/status` | Transition an order's status (validated) |
| DELETE | `/orders/:orderId` | Cancel an order (not a hard delete) |
| PATCH | `/return/:orderId/:productId/:quantity` | Submit a return request for a delivered order (body: `{ "reason": string }`) |

## Getting Started

```
git clone https://github.com/Afhit-01/order_processing_engine.git
cd order_processing_engine
npm install
npx ts-node src/server.ts
```

The server runs on `http://localhost:3000`.

## Example Requests

Create an order:

```
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "Ada Lovelace",
    "items": [{ "productId": 1, "name": "Notebook", "unitPrice": 5, "quantity": 2 }]
  }'
```

Get an order by id:

```
curl http://localhost:3000/orders/1
```

Filter orders by status:

```
curl "http://localhost:3000/orders?status=pending"
```

Confirm the order:

```
curl -X PATCH http://localhost:3000/orders/1/status \
  -H "Content-Type: application/json" \
  -d '{ "status": "confirmed" }'
```

Request a return after delivery:

```
curl -X PATCH http://localhost:3000/return/1/1/2 \
  -H "Content-Type: application/json" \
  -d '{ "reason": "Wrong size" }'
```

Get the revenue report:

```
curl http://localhost:3000/orders/report
```

## Author

Fatihu Ayomide Abdulganiyu (Afhit)
Computer Science student, University of Ilorin

- GitHub: [github.com/Afhit-01](https://github.com/Afhit-01)
- LinkedIn: [fatihu-a-abdulganiyu](https://linkedin.com/in/fatihu-a-abdulganiyu-18115838a)
- Email: abdulganiyufatihu5.0@gmail.com
