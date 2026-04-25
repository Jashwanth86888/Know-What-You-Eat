const express = require('express');
const router  = express.Router();
const connectDB = require('../db');

// GET /food  — all foods
router.get('/', async (req, res) => {
    let conn;
    try {
        conn = await connectDB();
        const result = await conn.execute(
            `SELECT food_id, food_name, type, calories, category, base_quantity, base_unit
             FROM food`
        );
        res.json(result.rows.map(([food_id, food_name, type, calories, category, base_quantity, base_unit]) =>
            ({ food_id, food_name, type, calories, category, base_quantity, base_unit })
        ));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch food" });
    } finally {
        if (conn) await conn.close();
    }
});

// GET /food/search?name=chicken  — search by name
router.get('/search', async (req, res) => {
    const { name } = req.query;
    if (!name) return res.status(400).json({ error: "Provide a name query param" });

    let conn;
    try {
        conn = await connectDB();
        const result = await conn.execute(
            `SELECT food_id, food_name, type, calories, category, base_quantity, base_unit
             FROM food WHERE UPPER(food_name) LIKE UPPER(:name)`,
            { name: `%${name}%` }
        );
        res.json(result.rows.map(([food_id, food_name, type, calories, category, base_quantity, base_unit]) =>
            ({ food_id, food_name, type, calories, category, base_quantity, base_unit })
        ));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Search failed" });
    } finally {
        if (conn) await conn.close();
    }
});

// NOTE: Adding food is admin-only — use POST /admin/food

module.exports = router;
