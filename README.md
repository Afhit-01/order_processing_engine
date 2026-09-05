# Order Processing Engine

A backend API for managing the full lifecycle of an order, from creation through confirmation, shipping, and delivery. Built with validated state transitions, business rule enforcement, and revenue reporting.

## Tech Stack

- Node.js
- TypeScript
- Express

## Project Structure

```
src/
  index.ts        Express app and route definitions
  orderLogic.ts   Business logic, state transitions, and validation
  types.ts        Shared type definitions
```

## Domain Model

| Type | Description |
|---|---|
| `OrderStatus` | Union type: `pending`, `confirmed`, `shipped`, `delivered`, `cancelled` |
| `OrderItem` | `productId`, `name`, `unitPrice`, `quantity` |
| `Order` | `id`, `customerName`, `items`, `status`, `createdAt` |

## Order State Machine

An order can only move through its lifecycle in specific, validated ways:

```
pending    -> confirmed, cancelled
confirmed  -> shipped, cancelled
shipped    -> delivered
delivered  -> (terminal, no further transitions)
cancelled  -> (terminal, no further transitions)
```

Any transition not listed above is rejected with a clear reason rather than silently applied or crashing the server.

## Validation Rules

- An order with an empty cart is rejected.
- An item with a non positive quantity or unit price is rejected.
- A status change that is not in the transition table is rejected.
- A request against an order id that does not exist is rejected.

Validation functions return a typed result (`{ success: true, ... }` or `{ success: false, reason }`) instead of throwing, so the API layer always has a clean result to work with.

## API Endpoints

| Method | Route | Behavior |
|---|---|---|
| POST | `/orders` | Create a new order (validated) |
| GET | `/orders/:id` | Fetch a single order |
| GET | `/orders?status=` | Filter orders by status |
| GET | `/orders/:id/total` | Compute an order's total |
| GET | `/orders/report` | Revenue and status breakdown |
| PUT | `/orders/:id` | Replace an order's items (pending orders only) |
| PATCH | `/orders/:id/status` | Transition an order's status (validated) |
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
