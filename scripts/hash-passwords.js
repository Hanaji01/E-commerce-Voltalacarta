// One-off migration: replaces any plain-text password in `users` with a bcrypt hash.
// Rows that already hold a bcrypt hash ($2a$/$2b$...) are left untouched.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

(async () => {
    const db = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'volta_la_carta_db',
    });
    const [users] = await db.execute('SELECT id, password FROM users');
    let updated = 0;
    for (const u of users) {
        if (/^\$2[aby]\$\d{2}\$/.test(u.password)) continue;
        await db.execute('UPDATE users SET password = ? WHERE id = ?', [await bcrypt.hash(u.password, 10), u.id]);
        updated++;
    }
    console.log(`Hashed ${updated} password(s).`);
    await db.end();
})().catch((err) => { console.error(err.message); process.exit(1); });
