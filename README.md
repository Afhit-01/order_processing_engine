# Order Processing Engine

A backend API for managing the full lifecycle of an order, from creation through confirmation, shipping, delivery, and return requests. Built with validated state transitions, business rule enforcement, return-request handling, and revenue reporting.

## Tech Stack

- Node.js
- TypeScript
- Express

## Project Structure

```
src/
  index.ts                    Express app setup and router mounting
  types.ts                    Shared type definitions
  returnLogic.ts               Return-request factory function
  store/
    orderStore.ts              In-memory order array and id generator
    returnStore.ts              In-memory return-request array and id generator
  services/
    orderService.ts             Order lifecycle logic, state transitions, validation
    returnService.ts             Return-request business rules (eligibility, window)
  routes/
    ordersRouter.ts              /orders route handlers
    returnsRouter.ts             /return route handlers
```

The app is layered store → service → route:

- **store** — holds the data (in-memory arrays for now) and id generation, nothing else
- **service** — holds business rules and validation, imports from store
- **route** — holds Express handlers, imports from service, mounted onto `app` in `index.ts`

## Domain Model

| Type | Description |
|---|---|
| `OrderStatus` | Union type: `pending`, `confirmed`, `shipped`, `delivered`, `cancelled`, `return_requested`, `returned` |
| `OrderItem` | `productId`, `name`, `unitPrice`, `quantity` |
| `Order` | `id`, `customerName`, `items`, `status`, `createdAt` |
| `ReturnRequest` | Represents a return request for a delivered order, including `orderId`, `productId`, `reason`, `status`, and `requestedAt` |

## Order State Machine

An order can only move through its lifecycle in specific, validated ways:

```
pending          -> confirmed, cancelled
confirmed        -> shipped, cancelled
shipped          -> delivered
delivered        -> return_requested
return_requested -> returned
returned         -> (terminal, no further transitions)
cancelled        -> (terminal, no further transitions)
```

Any transition not listed above is rejected with a clear reason rather than silently applied or crashing the server.

## Validation Rules

- An order with an empty cart is rejected.
- An item with a non positive quantity or unit price is rejected.
- A status change that is not in the transition table is rejected.
- A return request is only accepted for orders already in the `delivered` state.
- A return request is rejected after 30 days from the order creation date.
- A return request must include a `reason`, and it must be a string.
- A request against an order id that does not exist is rejected.
- A return request against a product id not present in the order is rejected.

Validation functions return a typed result (`{ success: true, ... }` or `{ success: false, reason }`) instead of throwing, so the API layer always has a clean result to work with.

## API Endpoints

| Method | Route | Behavior |
|---|---|---|
| POST | `/orders` | Create a new order (validated) |
| GET | `/orders?status=<status>` | Filter orders by status |
| GET | `/orders/report` | Revenue and status breakdown |
| GET | `/orders/:id/total` | Compute an order's total |
| PATCH | `/orders/:id/status` | Transition an order's status (validated) |
| PATCH | `/return/:orderId/:productId` | Submit a return request for a delivered order (body: `{ "reason": string }`) |
| DELETE | `/orders/:id` | Cancel an order (not a hard delete) |

## Getting Started

```
git clone https://github.com/Afhit-01/order_processing_engine.git
cd order_processing_engine
npm install
npx ts-node src/index.ts
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

Confirm the order:

```
curl -X PATCH http://localhost:3000/orders/1/status \
  -H "Content-Type: application/json" \
  -d '{ "status": "confirmed" }'
```

Request a return after delivery:

```
curl -X PATCH http://localhost:3000/return/1/1 \
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