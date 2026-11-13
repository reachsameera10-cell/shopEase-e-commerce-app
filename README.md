# ShopEase

ShopEase is a full-stack MERN e-commerce application with a responsive React storefront and an Express API backed by MongoDB. The frontend is at the repository root and the backend is in `backend/`; this established layout is used by the local development and deployment configurations.

## Project structure

```text
e-commerce-app/
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── uploads/
│   ├── utils/
│   ├── .env.example
│   └── package.json
├── public/
└── src/
    ├── assets/
    ├── components/
    ├── context/
    ├── hooks/
    ├── layouts/
    ├── pages/
    ├── services/
    └── utils/
```

## Technology stack

- **Frontend:** React, Vite, React Router, Tailwind CSS, Axios, and React Icons.
- **Backend:** Node.js, Express, Mongoose, MongoDB, JWT sessions, bcrypt, and Zod validation.
- **Image storage:** local uploads for development or Cloudinary for hosted storage.
- **Payments:** Razorpay test/live configuration with server-side signature verification; cash on delivery is also supported.

## Features

- Responsive storefront, product search, category/price filters, sorting, and pagination.
- Registration, login, persistent HttpOnly sessions, customer profile, cart, and wishlist.
- Stock-checked checkout, coupons, COD or optional Razorpay, order history, tracking, and eligible cancellation.
- Verified-purchase product reviews with administrator moderation.
- Role-protected admin dashboard for products, images, categories, inventory, customers, orders, and reviews.
- MongoDB-backed API with request validation, authorization, error handling, rate limits, and a health endpoint.

## Requirements

- Node.js 20.19+ or 22.12+
- npm
- MongoDB connection string (MongoDB Atlas is recommended; the API uses MongoDB transactions)

## Setup

Install frontend dependencies from the repository root:

```powershell
npm install
```

Install backend dependencies:

```powershell
npm install --prefix backend
```

Create a local backend environment file and (optionally) a frontend override:

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item .env.example .env.local
```

Set `MONGODB_URI` to your MongoDB connection string and replace `JWT_SECRET` with a unique random value of at least 32 characters in `backend\.env`. Set `RESEND_API_KEY` and `EMAIL_FROM` to enable password reset emails; the sender address must be verified with Resend. Keep the Resend key private and configure it in the backend host's secret settings for deployment. Set the Cloudinary credentials to enable hosted image uploads. Razorpay test credentials are optional; configure both `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to enable online test payments. Cash on delivery works without them. The API validates required settings and paired optional credentials. Keep `.env` and `.env.local` private; only commit the `.env.example` templates.

## Run and verify the frontend

From the repository root:

```powershell
npm run dev
```

Open the local URL printed by Vite. The homepage loads categories and product sections from the API; if MongoDB or the API is unavailable, the page displays retryable error states rather than substituting demo products.

The frontend reads its API base URL from `VITE_API_URL`. For local development, `.env.example` provides `http://localhost:5000/api`; alternatively, leave `VITE_API_URL` unset and Vite proxies `/api` requests to the local backend. For deployment, set `VITE_API_URL` to the deployed API's `/api` URL before building.

The homepage includes responsive navigation and search, category browsing, featured/trending/latest catalog sections, product quick view, loading skeletons, empty and error states, and a footer. Search and category selection call the catalog API; shopping and account actions are connected to the API.

## Catalog and product details

- `/products` displays the live catalog from `GET /api/products`.
- Search, category, minimum/maximum price, and sort filters are reflected in the URL and sent to the API. Supported sorts are newest, popular, rating, and ascending/descending price.
- Results use the API pagination metadata and show previous/next controls when there is more than one page.
- `/products/:idOrSlug` loads a product from `GET /api/products/:idOrSlug`, showing its gallery, description, pricing, ratings, and stock status.
- Invalid price ranges are rejected before the request. Loading, API error, not-found, and no-results states are shown explicitly.
- Product cart actions add items to the authenticated cart.

Run the frontend lint and production build checks:

```powershell
npm run lint
npm run build
```

## Run and verify the backend

After adding a valid MongoDB URI to `backend\.env`, start the API from the repository root:

```powershell
npm run dev --prefix backend
```

Run the backend's database-independent authorization and request-validation tests from the repository root:

```powershell
npm test --prefix backend
```

The API connects to MongoDB before it starts accepting requests. Verify the connection and API health at `http://localhost:5000/api/health`; a healthy response includes `{"status":"ok","database":"connected"}`. Startup fails explicitly if the database cannot be reached.

The server also provides JSON 404/error responses, Helmet security headers, a frontend-origin CORS policy, request-size limits, and API rate limiting.

## Data models and catalog API

The backend now defines timestamped Mongoose models for users, products, categories, carts, orders, reviews, wishlists, and coupons. User passwords are excluded from normal queries, and the models define reference relationships, validation, uniqueness constraints, and query indexes.

Public catalog endpoints:

- `GET /api/categories` — active categories.
- `GET /api/products` — active products with pagination and optional `search`, `category` (slug or ID), `minPrice`, `maxPrice`, and `sort` (`newest`, `price-asc`, `price-desc`, `popular`, or `rating`) query parameters. `page` defaults to 1 and `limit` to 12 (maximum 50).
- `GET /api/products/:idOrSlug` — one active product by MongoDB ID or slug.

For example, after starting the API with a working MongoDB connection, open `http://localhost:5000/api/products?sort=popular&page=1&limit=12`.

## Authentication API

Authentication uses an HttpOnly, SameSite=Lax cookie containing a seven-day HS256 JWT. The API also accepts a Bearer token for non-browser clients. JWTs contain only the user ID; protected requests reload the active account and role from MongoDB, so role changes and deactivation take effect immediately. Passwords are bcrypt-hashed, registration cannot set a role, and auth endpoints have a dedicated rate limit.

- `POST /api/auth/register` — create a customer account and start a session (`name`, `email`, `password`).
- `POST /api/auth/login` — authenticate and start a session (`email`, `password`).
- `POST /api/auth/forgot-password` — request a generic password-reset response (`email`); if the account exists, sends a 15-minute, single-use reset link via Resend.
- `POST /api/auth/reset-password` — reset using `{ "token": "...", "newPassword": "..." }`; passwords require at least 8 characters with uppercase, lowercase, number, and symbol.
- `POST /api/auth/logout` — clear the session cookie.
- `GET /api/auth/me` — return the authenticated profile.
- `PATCH /api/auth/me` — update `name` and/or `phone`; other fields are rejected.

For browser requests, send credentials so the cookie is retained, for example with `fetch(url, { credentials: 'include' })`. Registration/login reject unknown fields, including `role`; login uses a generic invalid-credentials response.

Reset tokens are generated with a cryptographically secure random source; MongoDB stores only their SHA-256 hashes and expires them after 15 minutes. Reset links carry the token in the URL fragment so it is not sent to the frontend host in HTTP requests or referrer headers. A successful reset atomically removes the stored token fields, preventing reuse. Reset requests are rate limited, and the same response is returned whether or not an account exists.

## Cart and wishlist API

Cart and wishlist endpoints require a signed-in user and operate on that user's MongoDB documents:

- `GET /api/cart` — return cart items, current server-derived unit prices, line totals, item count, and subtotal.
- `POST /api/cart` — add `{ "productId": "...", "quantity": 1 }`; quantity defaults to 1 and cannot exceed available stock.
- `PUT /api/cart/:productId` — set an item's quantity, rechecking active product stock.
- `DELETE /api/cart/:productId` — remove one item; `DELETE /api/cart` clears the cart.
- `GET /api/wishlist` — return saved products.
- `POST /api/wishlist` — save `{ "productId": "..." }`; duplicate saves are idempotent.
- `DELETE /api/wishlist/:productId` — remove a saved product.

The frontend provides account sign-in/registration, protected bag and wishlist pages, quantity controls, remove/clear actions, move-to-bag, and header item counts. Product prices are read from MongoDB, not accepted from the browser.

## Checkout and payments

The authenticated `/checkout` page collects a shipping address, validates coupon codes against the database, and displays a server-calculated INR quote. Delivery is ₹99 below ₹999 and free from ₹999. The API re-reads the cart, current product prices, stock, and coupon before accepting an order.

All `/api/orders/checkout` endpoints, including the checkout configuration endpoint, require an authenticated session.

- `GET /api/orders/checkout/config` — reports whether Razorpay is configured and whether cash on delivery is available.
- `POST /api/orders/checkout/quote` — accepts an optional `{ "couponCode": "..." }` and returns the server-calculated subtotal, delivery, discount, total, and items.
- `POST /api/orders/checkout` — accepts `{ "shippingAddress": {...}, "paymentMethod": "cod" | "razorpay", "couponCode": "..." }`. COD orders are created in a MongoDB transaction. Razorpay checkout creates a gateway order and reserves the inventory and coupon for 15 minutes.
- `POST /api/orders/checkout/verify-payment` — verifies the Razorpay HMAC signature on the backend, confirms the provider order/amount/currency, captures authorized payments, and only then confirms the order and clears the cart.
- `POST /api/orders/checkout/payment-failed` — releases a reservation only after the backend confirms the payment is failed with Razorpay.

Inventory reservations for abandoned Razorpay checkouts are released by a backend cleanup task after 15 minutes. Checkout uses MongoDB transactions, so use MongoDB Atlas or a local replica set (a standalone local MongoDB server does not support these transactions).

To enable Razorpay, add your test key ID and secret to the backend `.env` as `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`, then restart the backend. The secret stays on the server; only the public key ID is returned to the browser. Do not use live credentials during development. Razorpay checkout script loading also requires an internet connection.

For manual testing, create an active category and product with available stock, register or sign in, add the product to the bag, and complete checkout. Test COD without payment credentials. For Razorpay test mode, configure test keys and use the test payment methods provided in your Razorpay dashboard. Verify that invalid coupons and insufficient stock are rejected, successful payment clears the cart, and a failed/cancelled or abandoned payment leaves the cart intact and releases reserved stock.

## Order history and tracking

Signed-in customers can open `/orders` to view paginated order history and `/orders/:orderId` to view item and shipping snapshots, payment/refund state, and the order-status timeline. Orders can be cancelled while their status is `confirmed` or `processing`; delivered, shipped, pending-payment, and already-cancelled orders cannot be cancelled from the customer page. COD cancellation restores the sold inventory and coupon usage in a MongoDB transaction. A paid Razorpay order is cancelled only after the backend requests a full refund from Razorpay; refunds still processing are shown separately in the order detail.

- `GET /api/orders/my-orders?page=1&limit=10` — the signed-in user's paginated order list.
- `GET /api/orders/:orderId` — the user's order detail; another customer's order ID returns not found.
- `POST /api/orders/:orderId/cancel` — cancel an eligible owned order and request a full Razorpay refund when the order was paid online.

To manually test order history, place a COD order with a real catalog item, open **Your orders** from the account page, inspect its detail and timeline, then cancel it while it is still confirmed or processing. Check that the product stock and coupon usage are restored. With Razorpay test credentials, also verify cancellation of a paid eligible order and confirm the provider's full refund status.

## Product reviews

The product detail page lists approved reviews and lets customers submit a rating and review after a delivered purchase. New reviews are marked as verified purchases and remain hidden until an administrator approves them. Customers can update a rejected review; only one review per customer and product is allowed.

- `GET /api/reviews/:productId?page=1&limit=10` — public, paginated approved reviews.
- `GET /api/reviews/:productId/eligibility` — signed-in customer's purchase/review eligibility.
- `POST /api/reviews` — signed-in customer review submission with `{ "productId": "...", "rating": 5, "title": "...", "comment": "..." }`. A delivered COD order or delivered paid online order is required.
- `GET /api/admin/reviews` and `PUT /api/admin/reviews/:reviewId/status` — administrator moderation and rating recalculation.

## Admin dashboard

The protected `/admin` page provides an overview of paid revenue and monthly analytics, product/category CRUD, inventory editing, customer listing, order-status updates, and review moderation. Product deletion archives the product so existing order snapshots and references remain intact. Category deletion deactivates the category. Admin uploads accept JPEG, PNG, or WebP images up to 5 MB. Local development stores them under `backend/uploads/` and serves them from `API_PUBLIC_URL/uploads/`; Cloudinary is selected when `IMAGE_STORAGE_PROVIDER=cloudinary` is set, or automatically when all three Cloudinary credentials are configured and the provider is omitted. Uploaded Cloudinary URLs and public IDs are saved with the product. Removing an image URL while editing a product deletes its Cloudinary asset after the product update; a product must retain at least one image.

Admin APIs are under `/api/admin` and require both a valid session and the database-backed `admin` role. New registrations always receive the customer role; there is deliberately no public admin-registration or role-edit endpoint. To provision an administrator, first register that account, then use MongoDB Atlas Data Explorer or an authorized `mongosh` session to update exactly that account, for example:

```javascript
db.users.updateOne(
  { email: "admin@example.com" },
  { $set: { role: "admin" } }
)
```

Sign out and sign back in to load the updated role. Keep database administration credentials private and only promote a trusted account.

- `GET /api/admin/dashboard` — revenue/order/customer/product metrics, six months of paid-revenue totals, recent orders, and low-stock products.
- `GET|POST /api/admin/products`, `PUT|DELETE /api/admin/products/:productId` — product CRUD; DELETE archives.
- `GET|POST /api/admin/categories`, `PUT|DELETE /api/admin/categories/:categoryId` — category CRUD; DELETE deactivates.
- `POST /api/admin/uploads` — protected multipart `image` upload.
- `GET /api/admin/orders`, `PUT /api/admin/orders/:orderId/status` — list orders and advance valid statuses. COD can be marked paid only when cash is explicitly recorded at delivery.
- `GET /api/admin/customers` — paginated customer details without password or address fields.
- `GET /api/admin/reviews`, `PUT /api/admin/reviews/:reviewId/status` — moderate reviews and recalculate public product ratings.

## Deployment

The frontend and API can be deployed separately, but the API must run as a persistent Node.js service. Build the frontend with `npm run build` and serve `dist/` from a static host configured to fall back to `index.html` for client-side routes. Set `VITE_API_URL` to the public API's `/api` URL before building. Start the API with `npm start --prefix backend`.

The root `vercel.json` configures the Vite production build and SPA fallback. The root `render.yaml` configures the persistent Express API service, production start command, and `/api/health` check. Connect the GitHub repository to Vercel and Render, use the repository root as the Vercel project root and Render's blueprint, then configure the following values in provider dashboards rather than committing secrets:

- `NODE_ENV=production`
- `MONGODB_URI` — an Atlas connection string; allow network access only from the backend host.
- `JWT_SECRET` — a unique random value of at least 32 characters.
- `CLIENT_URL` — the exact HTTPS origin serving the frontend.
- `API_PUBLIC_URL` — the HTTPS origin serving the API, used to form uploaded-image URLs.
- `IMAGE_STORAGE_PROVIDER=cloudinary` (optional when all three Cloudinary credentials are present) plus `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` — Cloudinary credentials are required for persistent product uploads on Render.
- `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` — optional; configure them together to enable Razorpay.

Set Vercel's `VITE_API_URL` to `https://api.example.com/api` before building. Set Render's `CLIENT_URL` to the exact HTTPS frontend origin and `API_PUBLIC_URL` to the HTTPS API origin. The Render blueprint leaves these values and credentials for you to provide; no cloud resources are created by this repository change.

The session cookie is `Secure`, `HttpOnly`, and `SameSite=Lax` in production. Serve the frontend and API from the same site (for example, `shop.example.com` and `api.example.com`) so browser authentication cookies work reliably; the default `vercel.app` and `onrender.com` domains are cross-site and are not suitable for this cookie setup. Configure CORS with the exact frontend origin and use HTTPS for both. MongoDB must support transactions (Atlas does). Cloudinary keeps uploaded images durable across Render deploys; local image storage is for development only. Verify deployment with `/api/health`, then exercise authentication, COD checkout, order tracking, and admin access using dedicated test accounts and catalog data.
