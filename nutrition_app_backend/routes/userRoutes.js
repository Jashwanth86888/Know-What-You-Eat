const express = require('express');
const router  = express.Router();
const connectDB = require('../db');

// GET /users/:user_id  — fetch profile
// FIX: removed diet_type (column does not exist in users table)
router.get('/:user_id', async (req, res) => {
    const user_id = parseInt(req.params.user_id);

    if (isNaN(user_id) || user_id <= 0) {
        return res.status(400).json({ error: "user_id must be a valid positive number" });
    }

    let conn;
    try {
        conn = await connectDB();
        const result = await conn.execute(
            `SELECT user_id, name, age, gender, height, weight, email, role
             FROM users WHERE user_id = :user_id`,
            { user_id }
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        const [uid, name, age, gender, height, weight, email, role] = result.rows[0];
        res.json({ user_id: uid, name, age, gender, height, weight, email, role });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch user" });
    } finally {
        if (conn) await conn.close();
    }
});

// PUT /users/:user_id  — update profile
// FIX: removed diet_type (column does not exist in users table)
router.put('/:user_id', async (req, res) => {
    const user_id = parseInt(req.params.user_id);
    const { name, age, gender, height, weight } = req.body;

    if (isNaN(user_id) || user_id <= 0) {
        return res.status(400).json({ error: "user_id must be a valid positive number" });
    }

    // Validate numeric fields if provided
    if (age !== undefined && (isNaN(parseInt(age)) || parseInt(age) <= 0)) {
        return res.status(400).json({ error: "age must be a valid positive number" });
    }
    if (height !== undefined && (isNaN(parseFloat(height)) || parseFloat(height) <= 0)) {
        return res.status(400).json({ error: "height must be a valid positive number" });
    }
    if (weight !== undefined && (isNaN(parseFloat(weight)) || parseFloat(weight) <= 0)) {
        return res.status(400).json({ error: "weight must be a valid positive number" });
    }

    let conn;
    try {
        conn = await connectDB();
        const result = await conn.execute(
            `UPDATE users
             SET name=:name, age=:age, gender=:gender, height=:height, weight=:weight
             WHERE user_id=:user_id`,
            { name, age, gender, height, weight, user_id },
            { autoCommit: true }
        );

        if (result.rowsAffected === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({ message: "Profile updated" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update user" });
    } finally {
        if (conn) await conn.close();
    }
});

module.exports = router;
