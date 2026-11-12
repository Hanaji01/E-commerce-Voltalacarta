// server.js
require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const path = require('path');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('❌ JWT_SECRET mancante: copia .env.example in .env e impostalo.');
    process.exit(1);
}

// Middleware base 
app.use(express.json()); // Per parsare il corpo delle richieste JSON
app.use(express.urlencoded({ extended: true })); // Per parsare il corpo delle richieste URL-encoded (come i form HTML)
app.use(cookieParser()); // Per gestire i cookie

// Serve i file statici dalla cartella 'public'
app.use(express.static(path.join(__dirname, '..', 'public')));

// Pool MySQL (configurazione del tuo database)
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'volta_la_carta_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

const pool = mysql.createPool(dbConfig);// Crea un pool di connessioni per gestire le richieste al database

async function testDatabaseConnection() { // Funzione per testare la connessione al database
    try {
        const conn = await pool.getConnection();
        console.log('✅ Connessione al database riuscita');
        conn.release();
    } catch (err) {
        console.error('❌ Errore connessione DB:', err);
        process.exit(1); // Termina il processo se la connessione al DB fallisce
    }
}
testDatabaseConnection();

// Middleware di autenticazione JWT
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1];

    if (!token) { // Se il token non è presente nell'header, controlla i cookie
        const cookieToken = req.cookies && req.cookies.jwtToken;
        if (cookieToken) {// Se il token è presente nei cookie, usalo
            token = cookieToken;
        }
    }

    if (!token) {// Se il token non è presente né nell'header né nei cookie, restituisci un errore
        return res.status(401).json({ error: 'Token di autenticazione mancante' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {// Verifica il token
        if (err) {// Se la verifica fallisce, restituisci un errore
            console.error('Errore verifica token:', err);
            res.clearCookie('jwtToken', { path: '/' });
            return res.status(403).json({ error: 'Token non valido o scaduto' });
        }
        req.user = user;
        next();
    });
}

// Middleware per autenticare gli amministratori
function authenticateAdmin(req, res, next) {// Controlla se l'utente è autenticato e se è un amministratore
    authenticateToken(req, res, () => {
        if (req.user && req.user.isAdmin) { // Se l'utente è autenticato e ha privilegi di amministratore, prosegui
            next();
        } else {// Altrimenti, restituisci un errore di accesso negato
            res.status(403).json({ error: 'Accesso negato: Richiede privilegi di amministratore.' });
        }
    });
}

// Rotta per servire la pagina di login
app.get('/login.html', (req, res) => { // Invia il file HTML di login
    res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
});

// Rotta per la gestione del login (autenticazione utente/admin)
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {// Se email o password non sono forniti, restituisci un errore
        return res.status(400).json({ error: 'Email e password sono richiesti.' });
    }

    let connection;// Inizializza la variabile di connessione
    try { // Prova a ottenere una connessione dal pool
        connection = await pool.getConnection();
        const [rows] = await connection.execute('SELECT id, email, password, is_admin FROM users WHERE email = ?', [email]);

        if (rows.length === 0) {// Se non ci sono utenti con l'email fornita, restituisci un errore
            return res.status(401).json({ error: 'Credenziali non valide.' });
        }

        const user = rows[0];

        
        const passwordOk = await bcrypt.compare(password, user.password); // Le password sono salvate come hash bcrypt
        if (!passwordOk) {
            return res.status(401).json({ error: 'Credenziali non valide.' });
        }

        const token = jwt.sign( // Crea un token JWT con l'ID utente, email e privilegi di amministratore
            { id: user.id, email: user.email, isAdmin: user.is_admin },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.cookie('jwtToken', token, { // Imposta il cookie jwtToken con il token JWT
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Lax',
            maxAge: 3600000
        });

        res.json({ // Invia una risposta JSON con successo, messaggio e dati utente
            success: true,
            message: 'Login avvenuto con successo!',
            token: token,
            user: { id: user.id, email: user.email, isAdmin: user.is_admin }
        });

    } catch (err) { // Gestione degli errori durante il login
        console.error('Errore durante il login:', err);
        res.status(500).json({ error: 'Errore interno del server durante il login.' });
    } finally {// Rilascia la connessione al pool
        if (connection) connection.release();
    }
});


// Rotta per la registrazione di un nuovo utente
app.post('/api/register', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email e password sono richiesti.' });
    }
    if (password.length < 8) {
        return res.status(400).json({ error: 'La password deve avere almeno 8 caratteri.' });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        const [existing] = await connection.execute('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(409).json({ error: 'Email già registrata.' });
        }
        const hash = await bcrypt.hash(password, 10);
        await connection.execute('INSERT INTO users (email, password, is_admin) VALUES (?, ?, 0)', [email, hash]);
        res.status(201).json({ success: true, message: 'Registrazione completata.' });
    } catch (err) {
        console.error('Errore durante la registrazione:', err);
        res.status(500).json({ error: 'Errore interno del server durante la registrazione.' });
    } finally {
        if (connection) connection.release();
    }
});

// Rotta protetta per servire admin-dashboard.html
app.get('/admin-dashboard.html', (req, res, next) => { // Questa rotta serve la pagina admin-dashboard.html solo agli amministratori autenticati
    const token = req.cookies && req.cookies.jwtToken;

    if (!token) {// Se il token non è presente nei cookie, reindirizza al login
        console.log('Token mancante nel cookie, reindirizzo al login.');
        return res.redirect('/login.html');
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {// Verifica il token JWT
        if (err) {// Se la verifica fallisce, cancella il cookie e reindirizza al login
            console.error('Errore verifica token per admin dashboard page:', err);
            res.clearCookie('jwtToken', { path: '/' });
            return res.redirect('/login.html');
        }
        if (!user.isAdmin) {// Se l'utente non è un amministratore, reindirizza al login
            console.log('Utente non è admin, accesso negato per dashboard page.');
            return res.redirect('/login.html');
        }
        req.user = user;// Imposta l'utente nella richiesta per uso futuro
        res.sendFile(path.join(__dirname, '..', 'public', 'admin-dashboard.html'));// Invia il file HTML della dashboard amministrativa
    });
});


// Rotte API protette da `authenticateAdmin`
app.get('/api/admin/orders', authenticateAdmin, async (req, res) => {// Rotta per recuperare gli ordini per l'amministratore
    let connection;
    try {// Prova a ottenere una connessione dal pool
        connection = await pool.getConnection();
        const [orders] = await connection.execute('SELECT * FROM ordini ORDER BY data_ordine DESC');

        for (const order of orders) {// Per ogni ordine, recupera i dettagli degli articoli associati
            if (order.ordine_id === null || typeof order.ordine_id === 'undefined') {// Se l'ordine non ha un ID valido, salta il recupero dei dettagli
                // Log di avviso per ordine con ID mancante
                console.warn(`Ordine con ID mancante (${order.ordine_id}) trovato, saltando il recupero dei dettagli dell'ordine #${order.ordine_id}. Ordine completo:`, order);
                order.items = [];
                continue;
            }
            const [items] = await connection.execute('SELECT * FROM dettagli_ordine WHERE ordine_id = ?', [order.ordine_id]);
            order.items = items;
        }

        res.json({ success: true, orders: orders });// Invia la risposta JSON con gli ordini recuperati
    } catch (err) {// Gestione degli errori durante il recupero degli ordini
        console.error('Errore durante il recupero degli ordini per l\'admin:', err);
        res.status(500).json({ success: false, error: 'Errore interno del server durante il recupero degli ordini.' });
    } finally {// Rilascia la connessione al pool
        if (connection) connection.release(); // Assicurati di rilasciare la connessione anche in caso di errore
    }
});

app.put('/api/admin/orders/:orderId/status', authenticateAdmin, async (req, res) => {// Rotta per aggiornare lo stato di un ordine
    const { orderId } = req.params;
    const { newStatus } = req.body;

    if (!newStatus) {// Se il nuovo stato non è fornito, restituisci un errore
        return res.status(400).json({ success: false, error: 'Nuovo stato dell\'ordine mancante.' });
    }

    const allowedStatuses = ['In attesa di elaborazione', 'In preparazione', 'Spedito', 'Completato', 'Annullato'];
    if (!allowedStatuses.includes(newStatus)) {// Se il nuovo stato non è valido, restituisci un errore
        return res.status(400).json({ success: false, error: 'Stato non valido fornito.' });
    }

    let connection;
    try {// Prova a ottenere una connessione dal pool
        connection = await pool.getConnection();
        const [result] = await connection.execute(
            'UPDATE ordini SET stato_ordine = ? WHERE ordine_id = ?',
            [newStatus, orderId]
        );

        if (result.affectedRows === 0) {// Se nessuna riga è stata aggiornata, significa che l'ordine non esiste
            return res.status(404).json({ success: false, error: 'Ordine non trovato.' });
        }

        res.json({ success: true, message: `Stato ordine #${orderId} aggiornato a: ${newStatus}` });
    } catch (err) {// Gestione degli errori durante l'aggiornamento dello stato dell'ordine
        console.error('Errore durante l\'aggiornamento dello stato dell\'ordine:', err);
        res.status(500).json({ success: false, error: 'Errore interno del server durante l\'aggiornamento dello stato dell\'ordine.' });
    } finally {// Rilascia la connessione al pool
        if (connection) connection.release();// Assicurati di rilasciare la connessione anche in caso di errore
    }
});


app.get('/api/admin/custom-requests', authenticateAdmin, async (req, res) => {// Rotta per recuperare le richieste personalizzate per l'amministratore
    let connection;
    try {// Prova a ottenere una connessione dal pool
        connection = await pool.getConnection();
        const [requests] = await connection.execute('SELECT * FROM event_requests ORDER BY data_richiesta DESC');
        res.json({ success: true, requests: requests });
    } catch (err) {// Gestione degli errori durante il recupero delle richieste personalizzate
        console.error('Errore durante il recupero delle richieste personalizzate per l\'admin:', err);
        res.status(500).json({ success: false, error: 'Errore interno del server durante il recupero delle richieste personalizzate.' });
    } finally {// Rilascia la connessione al pool
        if (connection) connection.release();//
    }
});


// Rotta per gestire l'invio del form "event_requests"
app.post(['/api/event-request', '/api/richieste-personalizzate'], async (req, res) => {
    const { tipoEvento, dataPrevista, numeroPezzi, ideePreferenze, nome, telefono, email } = req.body;

    if (!tipoEvento || !dataPrevista || !email) {// Controlla se i campi obbligatori sono presenti
        return res.status(400).json({ success: false, error: 'Tipo di evento, data prevista ed email sono obbligatori.' });
    }

    let connection;
    try {// Prova a ottenere una connessione dal pool
        connection = await pool.getConnection();
        const [result] = await connection.execute(
            'INSERT INTO event_requests (tipoEvento, dataPrevista, numeroPezzi, ideePreferenze, nome, telefono, email, data_richiesta) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
            [tipoEvento, dataPrevista, numeroPezzi, ideePreferenze, nome, telefono, email]
        );
        res.status(201).json({ success: true, message: 'Richiesta evento inviata con successo!', requestId: result.insertId });
    } catch (err) {// Gestione degli errori durante l'invio della richiesta evento
        console.error('Errore durante l\'invio della richiesta evento:', err);
        res.status(500).json({ success: false, error: 'Errore interno del server durante l\'invio della richiesta evento.' });
    } finally {// Rilascia la connessione al pool
        if (connection) connection.release();
    }
});

// ROTTA PER I DETTAGLI DEL BOUQUET (come concordato)
app.get('/api/bouquets/:nomeBouquet', async (req, res) => {
    const nomeBouquet = req.params.nomeBouquet;
    console.log(`Richiesta dettagli per bouquet: ${nomeBouquet}`);

    if (!nomeBouquet) {// Se il nome bouquet non è fornito, restituisci un errore
        return res.status(400).json({ success: false, message: 'Nome bouquet mancante nella richiesta.' });
    }

    let connection;
    try {// Prova a ottenere una connessione dal pool
        connection = await pool.getConnection();// Assicurati di rilasciare la connessione al pool dopo l'uso
        const [rows] = await connection.execute('SELECT * FROM bouquets WHERE name = ?', [nomeBouquet]);

        if (rows.length === 0) {// Se non ci sono bouquet con il nome fornito, restituisci un errore
            console.log(`Bouquet non trovato: ${nomeBouquet}`);
            return res.status(404).json({ success: false, message: 'Bouquet non trovato.' });
        }

        const bouquet = rows[0];
        res.json({ success: true, bouquet: bouquet });

    } catch (err) {// Gestione degli errori durante il recupero dei dettagli del bouquet
        console.error(`Errore durante il recupero dei dettagli del bouquet ${nomeBouquet}:`, err);
        res.status(500).json({ success: false, message: 'Errore interno del server durante il recupero dei dettagli del bouquet.', debugError: err.message });
    } finally {
        if (connection) connection.release();
    }
});

// ROTTA PER I DETTAGLI DEL FIORE SINGOLO (allineata con prodotto_fiore.js)
app.get('/api/prodotto-fiore', async (req, res) => {
    const nomeFiore = req.query.name; // Recupera 'name' dalla query string
    console.log(`Richiesta dettagli per fiore singolo: ${nomeFiore}`);

    if (!nomeFiore) {// Se il nome del fiore singolo non è fornito, restituisci un errore
        return res.status(400).json({ success: false, message: 'Nome fiore singolo mancante nella richiesta.' });
    }

    let connection;
    try {// Prova a ottenere una connessione dal pool
        connection = await pool.getConnection();
        // Presumiamo che la colonna sia 'name' per i fiori_singoli
        const [rows] = await connection.execute('SELECT * FROM fiori_singoli WHERE name = ?', [nomeFiore]);

        if (rows.length === 0) {// Se non ci sono fiori singoli con il nome fornito, restituisci un errore
            console.log(`Fiore singolo non trovato: ${nomeFiore}`);
            // Restituisce un array vuoto per matchare le aspettative del frontend
            return res.status(404).json({ success: false, fiori: [], message: 'Fiore singolo non trovato.' });
        }

        const fiore = rows[0];
        // Restituisci l'oggetto fiore all'interno di un array chiamato 'fiori'
        res.json({ success: true, fiori: [fiore] });

    } catch (err) {// Gestione degli errori durante il recupero dei dettagli del fiore singolo
        console.error(`Errore durante il recupero dei dettagli del fiore singolo ${nomeFiore}:`, err);
        res.status(500).json({ success: false, message: 'Errore interno del server durante il recupero dei dettagli del fiore singolo.', debugError: err.message });
    } finally {
        if (connection) connection.release();
    }
});


// Rotta per la gestione del checkout
app.post('/api/checkout', async (req, res) => {// Questa rotta gestisce il processo di checkout
    const { items, shippingInfo, paymentInfo, totalAmount } = req.body;

    if (!items || items.length === 0 || !shippingInfo || !paymentInfo || !totalAmount) {// Controlla se i dati del checkout sono completi
        return res.status(400).json({ success: false, message: 'Dati del checkout incompleti.' });
    }

    let connection;
    try {// Prova a ottenere una connessione dal pool
        connection = await pool.getConnection();
        await connection.beginTransaction();

        
        console.log('Dati per inserimento ordine:', {// Log dei dati dell'ordine per il debug
            status: 'In attesa di elaborazione',
            totalAmount: totalAmount,
            name: shippingInfo.name,
            email: shippingInfo.email,
            address: shippingInfo.address,
            paymentMethod: paymentInfo.method
        });

        const [orderResult] = await connection.execute(// Inserisce un nuovo ordine nella tabella 'ordini'
            'INSERT INTO ordini (data_ordine, stato_ordine, totale, nome_cliente, email_cliente, indirizzo_spedizione, metodo_pagamento) VALUES (NOW(), ?, ?, ?, ?, ?, ?)',
            ['In attesa di elaborazione', totalAmount, shippingInfo.name, shippingInfo.email, shippingInfo.address, paymentInfo.method]
        );
        const orderId = orderResult.insertId;// Ottiene l'ID dell'ordine appena inserito

        for (const item of items) {// Per ogni articolo nell'ordine, inserisce i dettagli dell'ordine nella tabella 'dettagli_ordine'
            await connection.execute(
                'INSERT INTO dettagli_ordine (ordine_id, prodotto_nome, quantita, prezzo_unitario) VALUES (?, ?, ?, ?)',
                [orderId, item.name, item.quantity, item.price]
            );
        }

        await connection.commit();// Conferma la transazione se tutto va bene
        res.status(200).json({ success: true, message: 'Ordine processato con successo!', orderId: orderId });

    } catch (err) {
        if (connection) {// Se c'è un errore, rollback della transazione
            await connection.rollback();//
        }
        console.error('Errore durante il processo di checkout:', err);
        res.status(500).json({ success: false, message: 'Si è verificato un errore durante il checkout. Riprova più tardi.' });
    } finally {// Rilascia la connessione al pool
        if (connection) connection.release();
    }
});


// Gestore 404 - DEVE ESSERE L'ULTIMA ROTTA PRIMA DELL'APP.LISTEN
app.use((req, res) => {// Questa rotta gestisce le richieste non trovate (404)
    res.status(404).sendFile(path.join(__dirname, '..', 'public', '404.html'));
});

// Gestore errori globale
app.use((err, req, res, next) => {
    console.error('❌ Errore globale non gestito:\n', err.stack);
    if (app.get('env') === 'production') {
        res.status(500).send('<h1>500 - Errore Interno del Server</h1><p>Si è verificato un errore inaspettato. Si prega di riprovare più tardi.</p>');
    } else {
        res.status(500).send(`<pre style="color:red; background:#fdd; padding:1em;">${err.stack}</pre>`);
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server in ascolto su http://localhost:${PORT}`);
});