// Creates (or promotes) an admin user with a bcrypt-hashed password.
// Usage: npm run create-admin -- admin@example.com "a-strong-password"
require('dotenv').config();
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

(async () => {
    const [email, password] = process.argv.slice(2);
    if (!email || !password) {
        console.error('Usage: npm run create-admin -- <email> <password>');
        process.exit(1);
    }
    const db = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'volta_la_carta_db',
    });
    const hash = await bcrypt.hash(password, 10);
    await db.execute(
        'INSERT INTO users (email, password, is_admin) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE password = VALUES(password), is_admin = 1',
        [email, hash]
    );
    console.log(`Admin ready: ${email}`);
    await db.end();
})().catch((err) => { console.error(err.message); process.exit(1); });
