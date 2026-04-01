# Finance Dashboard API - Backend Assignment

A robust, logically structured, and scalable backend application providing RESTful APIs for a finance dashboard system. Built to evaluate API design, data modeling, role-based access control (RBAC), and overall backend engineering skills.

## 🌟 Core Features Implemented (100% Assignment Fulfillment)

### 1. User Management & Authentication

- **Secure Authentication**: Uses `jsonwebtoken` (JWT) for secure authentication flows.
- **Password Security**: Uses `bcrypt` for strong password hashing before saving to the DB.
- **Roles & Permissions Policies**: Strict guards isolating routes by `VIEWER`, `ANALYST`, and `ADMIN`.
- **User Actions**: Endpoints to create, update (promote/demote roles, activate/deactivate status), fetch, and gracefully delete users.

### 2. Financial Records Management

- **Full CRUD Flows**: Admins can safely manage (Create, Read, Update, Delete) financial transactions.
- **Advanced Filtering**: Endpoints handle flexible query parameters allowing filtering by Date Ranges (`startDate`/`endDate`), `category`, and `type` (`INCOME`/`EXPENSE`).

### 3. Aggregated Dashboard Summaries

- Computes comprehensive high-level analytics efficiently on the database level:
  - **Overall Summary**: Total Income, Total Expenses, Net Balance, and top 5 recent activities.
  - **Category Breakdown**: Aggregates records categorized by their sources.
  - **Monthly Trends**: Aggregates grouped by `YYYY-MM` to allow plotting historical trend charts.

### 4. Validation, Resiliency & Clean Code

- **Runtime Validation**: Integrates `zod` object schemas to rigorously check the payloads (preventing negative amounts, missing fields, or invalid types).
- **Global Error Handling**: Custom catch-all error handling to prevent the server from crashing or exposing stack traces.

---

## 🛠️ Architecture & Tech Stack

This project was intentionally kept lightweight yet maintainable.

- **Language**: TypeScript (`node.js` + `tsx`)
- **Framework**: `Express.js`
- **Database**: SQLite3 (Simplifies assessment by requiring zero external DBMS configuration/Docker). Includes auto-configuration and table initialization.
- **Security Check**: Role-based routing middlewares.

---

## 🚀 Getting Started

### 1. Prerequisites

Make sure you have Node.js installed on your machine.

### 2. Setup Environment Variables

Since the `.env` file contains sensitive information, it is not committed to GitHub. You need to create this file manually before running the app.

1. Create a file named `.env` in the root directory.
2. Add the following variables to it:

```env
PORT=3000
JWT_SECRET=your_super_secret_jwt_key_here
```

### 3. Install Dependencies

```bash
npm install zod sqlite3 bcrypt express jsonwebtoken uuid cors express-async-errors dotenv
npm install -D tsx typescript @types/node @types/express @types/bcrypt @types/jsonwebtoken @types/uuid @types/cors
```

### 4. Run the Application

Start the backend server:

```bash
npx tsx src/server.ts
```

> **Note**: A default Admin user is automatically seeded upon starting the app for the very first time.
>
> - **Email**: `admin@finance.com`
> - **Password**: `admin123`

---

## 🧪 Testing the APIs (The Easy Way)

To make grading and checking the API as frictionless as possible, an **`api-test.http`** file is included natively in the repository. You don't need Postman!

1. Open VS Code extensions (Ctrl+Shift+X) and install **REST Client** (by Huachao Mao).
2. Start the Node.js server.
3. Open `api-test.http`.
4. Click **"Send Request"** immediately above the `POST {{baseUrl}}/users/login` endpoint.
5. In the response window, highlight and copy the generated `token` property.
6. Replace `YOUR_TOKEN_HERE` (at the top of `api-test.http`) with your copied token.
7. You can now execute and test **any** other request by clicking the "Send Request" buttons. The RBAC rules and validations will automatically trigger!

---

## 🗄️ Database Schema Modeling

- **`users` Table**: Structurally separated with unique UUIDs, storing `email` (UNIQUE), `password` (hashed), `role`, `status`, and `createdAt` timestamps.
- **`records` Table**: Holds financial logic. Included columns: `id`, `amount` (REAL for decimals), `type`, `category`, `date`, `notes`, and a foreign key `userId` mapping directly to the `users` table for referential integrity.

---

## 📖 API Documentation & Testing Guide

This section details how to manually test each endpoint using tools like Postman, cURL, or the provided `api-test.http` file.

**Base URL:** `http://localhost:3000`  
**Authentication:** Almost all endpoints require a JWT token. First, hit the Login endpoint, copy the token, and include it in the `Authorization: Bearer <TOKEN>` header for subsequent requests.

### 1. Users & Authentication

#### Login (Get Token)

- **Route:** `POST /users/login`
- **Access:** Public
- **Body (JSON):**
  ```json
  {
    "email": "admin@finance.com",
    "password": "admin123"
  }
  ```

#### Create User

- **Route:** `POST /users`
- **Access:** Admin Only
- **Authorization:** `Bearer <TOKEN>`
- **Body (JSON):**
  ```json
  {
    "email": "analyst2@finance.com",
    "password": "password123",
    "role": "ANALYST"
  }
  ```

#### Get All Users

- **Route:** `GET /users`
- **Access:** Admin Only
- **Authorization:** `Bearer <TOKEN>`

#### Update User Role/Status

- **Route:** `PATCH /users/:id` (Replace `:id` with actual user ID)
- **Access:** Admin Only
- **Authorization:** `Bearer <TOKEN>`
- **Body (JSON) [Optional Fields]:**
  ```json
  {
    "role": "VIEWER",
    "status": "INACTIVE"
  }
  ```

#### Delete User

- **Route:** `DELETE /users/:id`
- **Access:** Admin Only
- **Authorization:** `Bearer <TOKEN>`

---

### 2. Financial Records

#### Create Record

- **Route:** `POST /records`
- **Access:** Admin Only
- **Authorization:** `Bearer <TOKEN>`
- **Body (JSON):**
  ```json
  {
    "amount": 5000,
    "type": "INCOME",
    "category": "Salary",
    "date": "2026-04-01T10:00:00Z",
    "notes": "April Salary"
  }
  ```

#### Get Records (with Filters)

- **Route:** `GET /records`
- **Example Route with Filters:** `/records?type=INCOME&category=Salary&startDate=2026-04-01T00:00:00Z&endDate=2026-04-30T00:00:00Z`
- **Access:** Admin, Analyst
- **Authorization:** `Bearer <TOKEN>`

#### Update Record

- **Route:** `PUT /records/:id`
- **Access:** Admin Only
- **Authorization:** `Bearer <TOKEN>`
- **Body (JSON):**
  ```json
  {
    "amount": 5500,
    "type": "INCOME",
    "category": "Salary",
    "date": "2026-04-01T10:00:00Z",
    "notes": "Updated Salary"
  }
  ```

#### Delete Record

- **Route:** `DELETE /records/:id`
- **Access:** Admin Only
- **Authorization:** `Bearer <TOKEN>`

---

### 3. Dashboard Summaries

#### Get Overall Summary

- **Route:** `GET /dashboard/summary`
- **Access:** Admin, Analyst, Viewer
- **Authorization:** `Bearer <TOKEN>`
- **Expected:** Returns total income, total expense, net balance, and recent activities.

#### Get Category Totals

- **Route:** `GET /dashboard/category-totals`
- **Access:** Admin, Analyst, Viewer
- **Authorization:** `Bearer <TOKEN>`
- **Expected:** Returns sum of amounts grouped by category.

#### Get Monthly Trends

- **Route:** `GET /dashboard/monthly-trends`
- **Access:** Admin, Analyst, Viewer
- **Authorization:** `Bearer <TOKEN>`
- **Expected:** Returns metrics grouped by YYYY-MM format.

---
