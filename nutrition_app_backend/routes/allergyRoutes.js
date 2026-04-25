const express = require('express');
const router  = express.Router();
const connectDB = require('../db');

// GET /allergies/:user_id  — list allergies for a user
router.get('/:user_id', async (req, res) => {
    const user_id = parseInt(req.params.user_id);

    if (isNaN(user_id) || user_id <= 0) {
        return res.status(400).json({ error: "user_id must be a valid positive number" });
    }

    let conn;
    try {
        conn = await connectDB();
        const result = await conn.execute(
            `SELECT allergy_name FROM user_allergy WHERE user_id = :user_id`,
            { user_id }
        );
        res.json(result.rows.map(([allergy_name]) => ({ allergy_name })));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch allergies" });
    } finally {
        if (conn) await conn.close();
    }
});

// POST /allergies/:user_id  — add an allergy for a user
// Body: { allergy_name }
router.post('/:user_id', async (req, res) => {
    const user_id = parseInt(req.params.user_id);
    const { allergy_name } = req.body;

    if (isNaN(user_id) || user_id <= 0) {
        return res.status(400).json({ error: "user_id must be a valid positive number" });
    }

    if (!allergy_name || allergy_name.trim() === '') {
        return res.status(400).json({ error: "allergy_name is required" });
    }

    let conn;
    try {
        conn = await connectDB();
        await conn.execute(
            `INSERT INTO user_allergy(user_id, allergy_name) VALUES (:user_id, :allergy_name)`,
            { user_id, allergy_name },
            { autoCommit: true }
        );
        res.status(201).json({ message: "Allergy added" });
    } catch (err) {
        if (err.errorNum === 1) {
            return res.status(400).json({ error: "This allergy is already recorded" });
        }
        console.error(err);
        res.status(500).json({ error: "Failed to add allergy" });
    } finally {
        if (conn) await conn.close();
    }
});

// DELETE /allergies/:user_id/:allergy_name  — remove an allergy
router.delete('/:user_id/:allergy_name', async (req, res) => {
    const user_id = parseInt(req.params.user_id);
    const { allergy_name } = req.params;

    if (isNaN(user_id) || user_id <= 0) {
        return res.status(400).json({ error: "user_id must be a valid positive number" });
    }

    if (!allergy_name || allergy_name.trim() === '') {
        return res.status(400).json({ error: "allergy_name is required" });
    }

    let conn;
    try {
        conn = await connectDB();
        const result = await conn.execute(
            `DELETE FROM user_allergy WHERE user_id = :user_id AND allergy_name = :allergy_name`,
            { user_id, allergy_name },
            { autoCommit: true }
        );

        if (result.rowsAffected === 0) {
            return res.status(404).json({ error: "Allergy not found" });
        }

        res.json({ message: "Allergy removed" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to remove allergy" });
    } finally {
        if (conn) await conn.close();
    }
});

module.exports = router;
