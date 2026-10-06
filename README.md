# Sweet Mandy Orders

Build a full-stack web app called "Sweet Mandy" (also known as "Sweet Mandy Bakery's") for a bakery and restaurant in Ijegun, Lagos, Nigeria. Customers can order meals, snacks, and baked goods for pickup or delivery. Use a warm, appetizing theme (cream, caramel/brown and soft pink or red accents), mobile-first, with a clean modern look. Currency is Nigerian Naira (₦).

Product categories:

Meals: fried rice, jollof rice, soups and semovita, etc.
Small chops
Breads and pastries
Ice cream
Soft drinks
Take Away packs

Each product has a name, photo, description, price, category, and an availability toggle (Available / Sold Out).

Customer features:

Public home page and menu where anyone can browse products by category, search, and view details.
Sign up and login (email and phone number). Sign-in is required to place an order.
Cart and checkout with two options:
Pickup / Book: the customer reserves items online, then comes to the shop to pay and collect. No online payment is needed.
Delivery: the customer enters their address and phone number and pays for the food online via Paystack at checkout. The delivery fee is not charged online. It is paid in cash to the rider on arrival, and the app shows a note saying so.
Delivery is Lagos Mainland only (not the Island). Provide a dropdown of supported mainland areas (e.g. Ijegun, Ikotun, Egbe, Igando, Ikeja, Yaba, Surulere, Ojota, etc.) and block or warn on unsupported addresses. Make this list editable by the admin so the zone can expand later.
User dashboard: view cart, order history and live order status (Pending, Confirmed, Preparing, Ready, Out for Delivery, Delivered, Cancelled), in-app notifications and messages from the bakery, and profile and saved addresses.

Rider dashboard (separate role):

Real-time notifications when a delivery order is assigned or available.
See the order items, the customer's name, phone number and delivery address, and payment status.
Buttons to accept the order, mark it Out for Delivery, and mark it Delivered.
A reminder of the delivery fee to collect in cash from the customer.
Delivery history.

Admin dashboard (full control, owner only):

Manage products and categories (add, edit, delete, upload images, mark sold out, set prices).
View and manage all orders (pickup bookings and deliveries), update statuses, and assign riders.
Manage users, riders (add, remove, activate), and delivery areas and delivery fees.
Send messages and notifications to individual users or all users.
Sales overview: daily and weekly revenue, top-selling items, and order counts.
Store settings: business name, phone, address, opening hours (open until 9:30 pm), and open/closed toggle.

Technical requirements:

Role-based access: customer, rider, admin, with protected routes.
Use Supabase (Lovable Cloud) for auth, database, storage, and real-time notifications.
Integrate Paystack for online payment of food on delivery orders only, with payment verification and an order marked "Paid" on success.
Responsive design that works well on phones, as most customers will order from mobile.
Include a footer with the shop address (Ijegun Last Bus Stop, Ijegun, Lagos), phone number (0803 541 8887), and opening hours.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/cac4cc1f-567b-41c8-8fe3-bd899bd7d7bd).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
