const express = require('express');
const router  = express.Router();
const connectDB = require('../db');

// POST /meals/add  — log a meal for a user
// user_meal stores recipe_id as a foreign key to recipe
router.post('/add', async (req, res) => {
    const user_id = parseInt(req.body.user_id);
    const recipeId = parseInt(req.body.recipe_id ?? req.body.food_id);
    const quantity = parseFloat(req.body.quantity);

    if (isNaN(user_id) || isNaN(recipeId) || isNaN(quantity) || user_id <= 0 || recipeId <= 0 || quantity <= 0) {
        return res.status(400).json({ error: "user_id, recipe_id, and quantity must be valid positive numbers" });
    }

    let conn;
    try {
        conn = await connectDB();

        const userResult = await conn.execute(
            `SELECT 1 FROM users WHERE user_id = :user_id`,
            { user_id }
        );
        if (userResult.rows.length === 0) {
            return res.status(400).json({ error: "Invalid user_id" });
        }

        const recipeResult = await conn.execute(
            `SELECT 1 FROM recipe WHERE recipe_id = :recipe_id`,
            { recipe_id: recipeId }
        );
        if (recipeResult.rows.length === 0) {
            return res.status(400).json({ error: "Invalid recipe_id" });
        }

        await conn.execute(
            `INSERT INTO user_meal(user_id, recipe_id, quantity, meal_time)
             VALUES (:user_id, :recipeId, :quantity, SYSDATE)`,
            { user_id, recipeId, quantity },
            { autoCommit: true }
        );
        res.status(201).json({ message: "Meal logged" });
    } catch (err) {
        console.error('Meal logging error:', err);
        res.status(500).json({ error: "Failed to log meal" });
    } finally {
        if (conn) await conn.close();
    }
});

// GET /meals/daily/:user_id  — total calories consumed today
// user_meal stores recipe_id referencing food.food_id
router.get('/daily/:user_id', async (req, res) => {
    const user_id = parseInt(req.params.user_id);

    if (isNaN(user_id) || user_id <= 0) {
        return res.status(400).json({ error: "user_id must be a valid positive number" });
    }

    let conn;
    try {
        conn = await connectDB();
        const result = await conn.execute(
            `WITH recipe_cal AS (
                SELECT r.recipe_id,
                    CAST(ROUND(SUM(f.calories * rf.quantity / f.base_quantity), 2) AS NUMBER(10,2)) AS total_calories,
                    CAST(SUM(rf.quantity) AS NUMBER(10,2)) AS total_quantity
                FROM recipe r
                JOIN recipe_food rf ON r.recipe_id = rf.recipe_id
                JOIN food f ON rf.food_id = f.food_id
                GROUP BY r.recipe_id
            )
            SELECT NVL(ROUND(SUM(rc.total_calories / rc.total_quantity * um.quantity), 2), 0) AS total_calories
            FROM user_meal um
            JOIN recipe_cal rc ON rc.recipe_id = um.recipe_id
            WHERE um.user_id = :user_id
            AND TRUNC(um.meal_time) = TRUNC(SYSDATE)`,
            { user_id }
        );

        const calories = result.rows?.[0]?.[0] ?? 0;
        res.json({ user_id, date: new Date().toDateString(), total_calories: calories });
    } catch (err) {
        console.error('Daily calories query failed:', err);
        res.status(500).json({ error: "Failed to fetch daily calories" });
    } finally {
        if (conn) await conn.close();
    }
});

// GET /meals/:user_id  — full meal history for a user (foods logged)
// Returns food info + meal quantity and calories
router.get('/:user_id', async (req, res) => {
    const user_id = parseInt(req.params.user_id);

    if (isNaN(user_id) || user_id <= 0) {
        return res.status(400).json({ error: "user_id must be a valid positive number" });
    }

    let conn;
    try {
        conn = await connectDB();
        const result = await conn.execute(
            `WITH recipe_cal AS (
                SELECT r.recipe_id, r.recipe_name,
                    CAST(ROUND(SUM(f.calories * rf.quantity / f.base_quantity), 2) AS NUMBER(10,2)) AS total_calories,
                    CAST(SUM(rf.quantity) AS NUMBER(10,2)) AS total_quantity
                FROM recipe r
                JOIN recipe_food rf ON r.recipe_id = rf.recipe_id
                JOIN food f ON rf.food_id = f.food_id
                GROUP BY r.recipe_id, r.recipe_name
            )
            SELECT um.meal_id, rc.recipe_name AS food_name, um.quantity, um.meal_time,
                    ROUND(rc.total_calories / rc.total_quantity * um.quantity, 2) AS calories
             FROM user_meal um
             JOIN recipe_cal rc ON rc.recipe_id = um.recipe_id
             WHERE um.user_id = :user_id
             ORDER BY um.meal_time DESC`,
            { user_id }
        );

        const rows = result.rows || [];
        res.json(rows.map(([meal_id, food_name, quantity, meal_time, calories]) =>
            ({ meal_id, food_name, quantity, meal_time, calories })
        ));
    } catch (err) {
        console.error('Meal history query failed:', err);
        res.status(500).json({ error: "Failed to fetch meals" });
    } finally {
        if (conn) await conn.close();
    }
});

// DELETE /meals/:meal_id  — delete a meal
router.delete('/:meal_id', async (req, res) => {
    const meal_id = parseInt(req.params.meal_id);

    if (!meal_id) {
        return res.status(400).json({ error: "meal_id is required" });
    }

    let conn;
    try {
        conn = await connectDB();
        await conn.execute(
            `DELETE FROM user_meal WHERE meal_id = :meal_id`,
            { meal_id },
            { autoCommit: true }
        );
        res.json({ message: "Meal deleted" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to delete meal" });
    } finally {
        if (conn) await conn.close();
    }
});

module.exports = router;
