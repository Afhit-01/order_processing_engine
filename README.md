# Order Processing Engine

A backend API for managing orders and the return/refund lifecycle.

## Overview

The Order Processing Engine is a REST API built with Node.js, TypeScript, Express, and PostgreSQL.

The project started as an in-memory order management system and has been extended to use PostgreSQL for persistent data storage. It also includes authentication, role-based access control, data isolation, order state transitions, return processing, and refunds.

## Tech Stack

- Node.js
- TypeScript
- Express
- PostgreSQL
- JSON Web Tokens (JWT)
- bcrypt
- REST API

## Architecture

The application follows a layered architecture:

```text
Route
  ↓
Service
  ↓
Store
  ↓
PostgreSQL
```

### Routes

Routes handle HTTP requests and responses.

They are responsible for:

- Reading route parameters and request bodies
- Basic request validation
- Authentication middleware
- Returning appropriate HTTP responses

### Services

Services contain the application's business logic.

They handle:

- Business rules
- State transitions
- Authorization checks
- Data-isolation decisions
- Coordinating multiple store operations

### Stores

Stores are responsible for communicating with PostgreSQL.

They handle:

- SQL queries
- Inserts
- Updates
- Reads
- Mapping database rows into application objects

## Authentication and Authorization

The API uses JWT-based authentication.

Authenticated requests contain a decoded JWT payload available through:

```ts
req.user
```

The payload contains information such as:

```ts
{
  id: string;
  role: "customer" | "staff" | "admin";
}
```

### RBAC

The application uses role-based access control (RBAC) to restrict operations according to the authenticated user's role.

Examples:

- Customers can create orders.
- Customers can request returns.
- Staff and admins can review return requests.
- Staff and admins can move returns through operational stages such as `in_transit` and `received`.

Authentication is applied through the `requireAuth` middleware.

## Data Isolation

Authentication answers:

> Who is making this request?

Data isolation answers:

> Which records is this authenticated user allowed to access?

For customer-facing operations, the authenticated user's ID is used to restrict database queries to records belonging to that customer.

For example, when retrieving an order:

```text
GET /orders/:orderId
```

the service passes the authenticated user into the order lookup.

The database query can then restrict the result using:

```sql
WHERE orders.id = $1
AND orders.customer_id = $2
```

This prevents one customer from retrieving another customer's order simply by changing the ID in the URL.

For staff and admin operations, the application can intentionally omit the customer filter when the role is authorized to access records across customers.

## Order Status

Orders use the following statuses:

```text
pending
confirmed
shipped
delivered
cancelled
return_requested
returned
```

### Order State Machine

```text
pending
 ├── confirmed
 │    ├── shipped
 │    │    └── delivered
 │    │         └── return_requested
 │    │              ├── returned
 │    │              └── delivered
 │    └── cancelled
 └── cancelled
```

Terminal states:

- `cancelled`
- `returned`

Status transitions are validated in the service layer.

## Return Status

Returns use the following statuses:

```text
pending
approved
rejected
in_transit
received
refunded
```

### Return State Machine

```text
pending
 ├── approved
 │    └── in_transit
 │         └── received
 │              └── refunded
 └── rejected
```

Terminal states:

- `rejected`
- `refunded`

Invalid state transitions are rejected by the service layer.

## Order Creation

### `POST /orders`

Creates a new order.

Customers are the only role allowed to create orders through this path.

The service validates:

- The cart is not empty.
- Item quantities are greater than zero.
- Item prices are greater than zero.
- The authenticated user has the `customer` role.

The order and its items are inserted inside a PostgreSQL transaction:

```text
BEGIN
  Insert order
  Insert order items
COMMIT
```

If an error occurs:

```text
ROLLBACK
```

This prevents an order from being created without its associated items.

## Order Endpoints

### Create an order

```http
POST /orders
```

Example body:

```json
{
  "customerName": "Customer",
  "items": [
    {
      "productId": "product-1",
      "name": "Keyboard",
      "quantity": 2,
      "unitPrice": 15000
    }
  ]
}
```

### Get orders by status

```http
GET /orders?status=pending
```

Customers receive only their own orders.

Authorized staff/admin users can access orders across customers.

### Get an order

```http
GET /orders/:orderId
```

The order lookup applies data isolation for customers.

### Get order total

```http
GET /orders/:orderId/total
```

Returns the total calculated from the order items.

### Update order status

```http
PATCH /orders/:orderId/status
```

Example body:

```json
{
  "status": "confirmed"
}
```

Only valid state transitions are accepted.

### Cancel an order

```http
DELETE /orders/:orderId
```

Orders can only be cancelled while they are in:

- `pending`
- `confirmed`

### Order report

```http
GET /orders/report
```

Returns aggregate information including:

- Total orders
- Orders grouped by status
- Revenue

## Return Endpoints

### Request a return

```http
PATCH /return/:orderId/:productId/:quantity
```

Example body:

```json
{
  "reason": "Product arrived damaged"
}
```

Only customers can request returns.

The service verifies:

- The customer owns the order.
- The order exists.
- The order has been delivered.
- The product exists in the order.
- The requested quantity is greater than zero.
- The requested quantity does not exceed the ordered quantity.
- The return window has not expired.

The return request starts in:

```text
pending
```

The associated order moves from:

```text
delivered → return_requested
```

### Review a return

```http
PATCH /return/:orderId/:productId/review
```

Example body:

```json
{
  "review": "approved"
}
```

or:

```json
{
  "review": "rejected"
}
```

This is a staff/admin operation.

Valid transitions are:

```text
pending → approved
pending → rejected
```

If the request is rejected, the associated order moves back to:

```text
return_requested → delivered
```

### Mark return as in transit

```http
PATCH /return/:orderId/:productId/ship
```

This is a staff/admin operation.

Valid transition:

```text
approved → in_transit
```

### Receive a return

```http
PATCH /return/:orderId/:productId/receive
```

This is a staff/admin operation.

Valid transition:

```text
in_transit → received
```

### Create a refund request

```http
POST /return/:orderId/:productId/refund
```

Example body:

```json
{
  "refundAmount": 30000
}
```

The refund process is only allowed after the return has reached:

```text
received
```

A refund initially has a `pending` status.

## Refund Lifecycle

Refunds use:

```text
pending
completed
failed
```

The intended lifecycle is:

```text
Return received
      ↓
Refund created
      ↓
pending
   ↙     ↘
completed  failed
```

When a refund is successfully completed, the associated return is moved to:

```text
refunded
```

and the associated order is moved to:

```text
returned
```

## Validation

The application performs validation at multiple levels.

### Request validation

Routes validate incoming parameters and request bodies before passing them to services.

Examples include:

- Required route parameters
- Numeric quantities
- Valid status values
- Valid return decisions
- Required return reasons
- Refund amount type

### Business validation

Services enforce domain rules such as:

- Only customers can create orders.
- Only customers can request returns.
- Only staff/admin can review and process returns.
- Orders must follow the defined state machine.
- Returns must follow the defined state machine.
- Return quantities cannot exceed ordered quantities.

## Database

PostgreSQL stores the application's persistent data.

Main entities include:

```text
customers
orders
order_items
return_requests
refunds
```

Relationships include:

```text
Customer
   │
   └── Orders
          │
          ├── Order Items
          │
          └── Return Requests
                    │
                    └── Refunds
```

## PostgreSQL Queries

Parameterized queries are used instead of interpolating user input directly into SQL.

Example:

```sql
SELECT *
FROM orders
WHERE id = $1;
```

with the value supplied separately:

```ts
await client.query(query, [id]);
```

This keeps user-provided values separate from SQL syntax.

## Transactions

Order creation uses a database transaction because multiple related records must be created together.

Example:

```text
BEGIN
  INSERT INTO orders
  INSERT INTO order_items
  INSERT INTO order_items
  ...
COMMIT
```

If one operation fails:

```text
ROLLBACK
```

This preserves database consistency.

## Project Structure

A simplified project structure:

```text
src/
├── db/
│   └── client.ts
│
├── middleware/
│   ├── requireAuth.ts
│   └── validateBody.ts
│
├── routes/
│   ├── ordersRouter.ts
│   └── returnsRouter.ts
│
├── services/
│   ├── orderService.ts
│   ├── returnService.ts
│   └── refundService.ts
│
├── store/
│   ├── orderStore.ts
│   ├── returnStore.ts
│   └── refundStore.ts
│
├── validation/
│   └── validation.ts
│
├── server.ts
├── types.ts
└── returnLogic.ts
```

## Design Principles Demonstrated

The project demonstrates several backend concepts:

- REST API design
- Layered architecture
- Authentication
- JWT
- Role-based access control
- Data isolation
- Request validation
- Business validation
- State machines
- PostgreSQL
- Parameterized SQL
- Database transactions
- Relational data modeling
- Error handling
- Separation of concerns

## Current Scope

The current implementation focuses on the backend API.

A frontend is planned as a future addition.

## Author

**Fatihu Ayomide Abdulganiyu (Afhit)**

Computer Science student, University of Ilorin.

GitHub: `Afhit-01`