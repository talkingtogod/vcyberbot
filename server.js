
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: ['https://rbxtools.store', 'https://vcyberbot.vercel.app']
}));
app.use(bodyParser.json());

// SQLite setup
const db = new sqlite3.Database('./gems.db');
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        gems INTEGER DEFAULT 0
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT,
        type TEXT,
        amount INTEGER,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

// Ensure user exists
function ensureUser(userId, callback) {
    db.run(`INSERT OR IGNORE INTO users (id, gems) VALUES (?, 0)`, [userId], callback);
}

// GET /api/gems/:userId
app.get('/api/gems/:userId', (req, res) => {
    const userId = req.params.userId;
    ensureUser(userId, () => {
        db.get(`SELECT gems FROM users WHERE id = ?`, [userId], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ balance: row.gems });
        });
    });
});

// POST /api/spend
app.post('/api/spend', (req, res) => {
    const { userId, amount, type } = req.body;
    ensureUser(userId, () => {
        db.get(`SELECT gems FROM users WHERE id = ?`, [userId], (err, row) => {
            if (row && row.gems >= amount) {
                db.run(`UPDATE users SET gems = gems - ? WHERE id = ?`, [amount, userId]);
                db.run(`INSERT INTO transactions (userId, type, amount) VALUES (?, ?, ?)`, [userId, 'spend', amount]);
                res.json({ success: true });
            } else {
                res.status(400).json({ error: "Not enough gems" });
            }
        });
    });
});

// POST /api/purchase
app.post('/api/purchase', async (req, res) => {
    const { userId, amount } = req.body;
    const API_KEY = "REPLACE_WITH_YOUR_NOWPAYMENTS_API_KEY";
    const LTC_WALLET = "LNiKwUeFo2fpgsXCKoHCB5R8YyvYK3UbtZ";
    const priceUSD = amount * 0.005;

    try {
        const invoice = await axios.post("https://api.nowpayments.io/v1/invoice", {
            price_amount: priceUSD,
            price_currency: "usd",
            pay_currency: "ltc",
            order_id: `${userId}-${Date.now()}`,
            pay_address: LTC_WALLET
        }, {
            headers: {
                "x-api-key": API_KEY,
                "Content-Type": "application/json"
            }
        });

        res.json({ invoice_url: invoice.data.invoice_url });
    } catch (err) {
        console.error(err.response?.data || err.message);
        res.status(500).json({ error: "Failed to create invoice" });
    }
});

// GET /api/history/:userId
app.get('/api/history/:userId', (req, res) => {
    const userId = req.params.userId;
    db.all(`SELECT * FROM transactions WHERE userId = ? ORDER BY timestamp DESC`, [userId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ history: rows });
    });
});

app.listen(PORT, () => {
    console.log(`Server running at https://rbxtools.store/api/`);
});
