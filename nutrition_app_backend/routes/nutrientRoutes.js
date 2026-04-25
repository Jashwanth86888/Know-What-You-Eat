const express = require('express');
const router  = express.Router();
const connectDB = require('../db');

// GET /nutrients  — list all nutrients
router.get('/', async (req, res) => {
    let conn;
    try {
        conn = await connectDB();
        const result = await conn.execute(
            `SELECT nutrient_id, nutrient_name, unit, description FROM nutrient`
        );
        res.json(result.rows.map(([nutrient_id, nutrient_name, unit, description]) =>
            ({ nutrient_id, nutrient_name, unit, description })
        ));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch nutrients" });
    } finally {
        if (conn) await conn.close();
    }
});

// GET /nutrients/food/:food_id  — nutrients for a specific food
// FIX: column is amount_of_nutrient, not amount
router.get('/food/:food_id', async (req, res) => {
    const food_id = parseInt(req.params.food_id);

    if (isNaN(food_id) || food_id <= 0) {
        return res.status(400).json({ error: "food_id must be a valid positive number" });
    }

    let conn;
    try {
        conn = await connectDB();
        const result = await conn.execute(
            `SELECT n.nutrient_name, fn.amount_of_nutrient AS amount, n.unit
             FROM food_nutrient fn
             JOIN nutrient n ON fn.nutrient_id = n.nutrient_id
             WHERE fn.food_id = :food_id`,
            { food_id }
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "No nutrient data for this food" });
        }

        res.json(result.rows.map(([nutrient_name, amount, unit]) =>
            ({ nutrient_name, amount, unit })
        ));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch nutrients for food" });
    } finally {
        if (conn) await conn.close();
    }
});

// GET /nutrients/goal/:goal_id  — nutrients important for a goal
// Uses goal_nutrient table (was previously completely unused)
router.get('/goal/:goal_id', async (req, res) => {
    const goal_id = parseInt(req.params.goal_id);

    if (isNaN(goal_id) || goal_id <= 0) {
        return res.status(400).json({ error: "goal_id must be a valid positive number" });
    }

    let conn;
    try {
        conn = await connectDB();
        const result = await conn.execute(
            `SELECT n.nutrient_name, n.unit, n.description, gn.importance_level
             FROM goal_nutrient gn
             JOIN nutrient n ON gn.nutrient_id = n.nutrient_id
             WHERE gn.goal_id = :goal_id
             ORDER BY CASE gn.importance_level WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END`,
            { goal_id }
        );

        res.json(result.rows.map(([nutrient_name, unit, description, importance]) =>
            ({ nutrient_name, unit, description, importance })
        ));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch nutrients for goal" });
    } finally {
        if (conn) await conn.close();
    }
});

module.exports = router;
