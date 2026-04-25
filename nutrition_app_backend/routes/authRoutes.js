const express = require('express');
const router  = express.Router();
const jwt = require('jsonwebtoken');
const connectDB = require('../db');

const JWT_SECRET = 'your-secret-key-change-this-in-production';

// POST /auth/signup
router.post('/signup', async (req, res) => {
    const { name, age, gender, height, weight, email, password, role } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: "name, email and password are required" });
    }

    let conn;
    try {
        conn = await connectDB();
        await conn.execute(
            `INSERT INTO users(name, age, gender, height, weight, email, password, role)
             VALUES (:name, :age, :gender, :height, :weight, :email, TRIM(:password), :role)`,
            { name, age, gender, height, weight, email, password, role: role || 'user' },
            { autoCommit: true }
        );
        res.status(201).json({ message: "User registered successfully" });
    } catch (err) {
        if (err.errorNum === 1) {
            return res.status(400).json({ error: "Email already exists" });
        }
        console.error(err);
        res.status(500).json({ error: "Signup failed" });
    } finally {
        if (conn) await conn.close();
    }
});

// POST /auth/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "email and password are required" });
    }

    let conn;
    try {
        conn = await connectDB();
        const result = await conn.execute(
            `SELECT user_id, name, email, age, gender, height, weight, role FROM users
             WHERE TRIM(email) = TRIM(:email) AND TRIM(password) = TRIM(:password)`,
            { email, password }
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const [user_id, name, user_email, age, gender, height, weight, role] = result.rows[0];
        const user = { user_id, name, email: user_email, age, gender, height, weight, role };
        
        // Generate JWT token
        const token = jwt.sign(
            { user_id, email: user_email, role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({ user, token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Login failed" });
    } finally {
        if (conn) await conn.close();
    }
});

module.exports = router;
