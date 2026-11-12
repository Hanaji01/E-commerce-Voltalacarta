# Volta la Carta

An online shop for handmade paper flowers: single flowers, bouquets and custom pieces for weddings, graduations, christenings and other events. The backend is Node.js with Express and MySQL; the frontend is plain HTML, CSS and JavaScript.

The site is in Italian. It is also one of the three test applications in my internship research on converting web apps to Android, where it was converted as a PWA (see [FocusFlow](https://github.com/Hanaji01/focusflow) for the third one).

## What it does

- **Catalogue.** Product pages for single flowers (with colour choices) and bouquets are filled from the database, with an image gallery for each product.
- **Cart and checkout.** The cart lives in `localStorage`. At checkout the order and its lines are written in a single MySQL transaction, so a failed order leaves nothing half-saved.
- **Custom requests.** A form for event orders (event type, date, number of pieces, ideas) that is stored for the shop owner to review.
- **Accounts.** Registration and login. Passwords are stored as bcrypt hashes, and the session is a JWT in an `httpOnly` cookie that expires after one hour.
- **Admin dashboard.** Visible only to admin users. Lists orders with their items and custom requests, and lets the admin move an order through its states (*In attesa*, *In preparazione*, *Spedito*, *Completato*, *Annullato*).
- **PWA basics.** Web app manifest and service worker, so the site can be installed on a phone.

## Running it locally

You need Node.js 18+ and MySQL 8.

```bash
git clone https://github.com/Hanaji01/E-commerce-Voltalacarta.git
cd E-commerce-Voltalacarta
npm install
```

Create the database and tables:

```bash
mysql -u root -p < database/schema.sql
```

Copy `.env.example` to `.env` and fill in your database user, password and a random `JWT_SECRET`. Then create an admin account and start the server:

```bash
npm run create-admin -- admin@example.com "choose-a-password"
npm start
```

The site runs at http://localhost:3000. Product pages show data only after you add rows to the `bouquets` and `fiori_singoli` tables; the `name` column must match the `?name=` value in the product links (for example `PEONIA` or `BOUQUET CIPRIA`).

If you have a database from an older version of the project with plain-text passwords, `npm run hash-passwords` converts them to bcrypt hashes.

## API

| Method | Route | Access |
| --- | --- | --- |
| `POST` | `/api/register` | public |
| `POST` | `/api/login` | public |
| `GET` | `/api/bouquets/:name` | public |
| `GET` | `/api/prodotto-fiore?name=` | public |
| `POST` | `/api/checkout` | public |
| `POST` | `/api/richieste-personalizzate` | public |
| `GET` | `/api/admin/orders` | admin |
| `PUT` | `/api/admin/orders/:id/status` | admin |
| `GET` | `/api/admin/custom-requests` | admin |

## Structure

```
server/server.js     Express app: routes, auth middleware, MySQL pool
database/schema.sql  Tables for users, products, orders and custom requests
scripts/             create-admin and password migration
public/              HTML pages, CSS, client-side JS, images, service worker
```

## Limits

Payment is simulated: checkout records the chosen method but does not charge anything, and the card fields are never sent to the server. There are no automated tests yet.
