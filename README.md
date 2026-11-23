# GearLoop – Server

GearLoop is an equipment rental platform that allows customers to rent equipment, owners to manage their listings and rental requests, and administrators to manage the platform.

This repository contains the backend application of GearLoop, built with Node.js, Express.js, TypeScript, and MongoDB.

## 🚀 Key Features

- **Authentication & Authorization:** Secure JWT-based authentication with role-based access control.
- **Role Management:** Supports Customer, Owner, and Admin roles.
- **Equipment Management:** Create, update, delete, and manage equipment listings.
- **Equipment Moderation:** Admins can approve or reject equipment listings.
- **Booking Management:** Customers can create bookings, while owners can manage rental requests.
- **Payment Integration:** Secure Stripe Checkout integration.
- **Payment Webhooks:** Handles successful payment events and updates booking and payment records.
- **Favorites:** Customers can manage their favorite equipment.
- **Dashboard Analytics:** Provides platform statistics and owner-specific rental analytics.
- **Automated Booking Management:** Node-cron automatically marks eligible expired bookings as completed.

## 🛠️ Technologies Used

| Technology | Purpose |
|---|---|
| Node.js | JavaScript Runtime |
| Express.js | Backend Framework |
| TypeScript | Type Safety |
| MongoDB | Database |
| Better Auth | Authentication |
| JOSE | JWT Verification |
| Stripe | Payment Processing |
| Node-cron | Scheduled Tasks |
| dotenv | Environment Configuration |
| CORS | Cross-Origin Resource Sharing |

## 📁 Project Structure

```text
gearloop-server/
├── src/
│   ├── jobs/
│   │   └── booking-jobs.ts
│   ├── middleware/
│   │   └── auth.ts
│   ├── routes/
│   │   ├── bookings.ts
│   │   ├── dashboard.ts
│   │   ├── equipment.ts
│   │   ├── favorites.ts
│   │   ├── payments.ts
│   │   └── users.ts
│   ├── config.ts
│   ├── db.ts
│   └── server.ts
├── .env
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## ⚙️ Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/mahadihasanph14-tech/GearLoop-server
```

### 2. Navigate to the Project Directory

```bash
cd gearloop-server
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

Create a `.env` file in the root directory.

Add the required environment variables:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
BETTER_AUTH_URL=http://localhost:3000
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

Configure any additional authentication, JWT, CORS, or Stripe variables required by your application.

**Important:** Never commit your `.env` file or expose secret keys publicly.

### 5. Run the Development Server

```bash
npm run dev
```

The backend will run at:

```text
http://localhost:5000
```

### 6. Build the Project

```bash
npm run build
```

## 🔌 API Endpoints

The backend provides RESTful API endpoints for the following modules:

| Module | Main Endpoints | Description |
|---|---|---|
| Authentication | `/api/auth/*` | Authentication integration |
| Users | `/api/users` | User management |
| Equipment | `/api/equipment` | Equipment management |
| Bookings | `/api/bookings` | Booking management |
| Payments | `/api/payments` | Payment and webhook handling |
| Favorites | `/api/favorites` | Favorite equipment management |
| Dashboard | `/api/dashboard` | Dashboard statistics |

### Role-Based Access

- **Customer:** Browse equipment, manage favorites, create bookings, and view rentals.
- **Owner:** Manage equipment listings and rental requests.
- **Admin:** Manage users, moderate equipment, and monitor bookings and analytics.

## 💳 Payment Integration

GearLoop uses Stripe Checkout to process equipment rental payments.

Payment workflow:

1. Customer selects equipment and booking dates.
2. Backend validates equipment availability.
3. A Stripe Checkout session is created.
4. Customer completes the payment.
5. Stripe sends a webhook event.
6. Backend updates the booking and payment records.

## ⏰ Automated Booking Jobs

GearLoop uses Node-cron to check for expired bookings every 15 minutes.

Eligible paid and approved bookings are automatically marked as completed after their rental end date.

## 🔒 Security

- JWT-based request authentication.
- Role-based route protection.
- Environment variables for sensitive configuration.
- Stripe webhook integration for payment verification.
- Server-side validation for booking operations.

## 👨‍💻 Development

Start the backend in development mode:

```bash
npm run dev
```

Compile TypeScript:

```bash
npm run build
```

---

**GearLoop – Making Equipment Rental Simple and Convenient.**