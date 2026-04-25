const express = require('express');
const router  = express.Router();
const connectDB = require('../db');

// GET /recipes/calories  — all recipes with dynamically calculated total calories and total quantity
router.get('/calories', async (req, res) => {
    let conn;
    try {
        conn = await connectDB();
        // Get calories, total quantity, and the most common unit for each recipe
        const result = await conn.execute(
            `SELECT r.recipe_id, r.recipe_name, r.cooking_time, r.difficulty_level,
                    CAST(ROUND(SUM(f.calories * rf.quantity / f.base_quantity), 2) AS NUMBER(10,2)) AS total_calories,
                    CAST(SUM(rf.quantity) AS NUMBER(10,2)) AS total_quantity,
                    (
                        SELECT rf2.unit
                        FROM recipe_food rf2
                        WHERE rf2.recipe_id = r.recipe_id
                        AND rf2.quantity = (
                            SELECT MAX(rf3.quantity)
                            FROM recipe_food rf3
                            WHERE rf3.recipe_id = r.recipe_id
                        )
                        FETCH FIRST 1 ROWS ONLY
                    ) AS main_unit
             FROM recipe r
             JOIN recipe_food rf ON r.recipe_id = rf.recipe_id
             JOIN food f ON rf.food_id = f.food_id
             GROUP BY r.recipe_id, r.recipe_name, r.cooking_time, r.difficulty_level
             ORDER BY r.recipe_name`
       );
        res.json(result.rows.map(([recipe_id, recipe_name, cooking_time, difficulty, total_calories, total_quantity, main_unit]) =>
            ({ recipe_id, recipe_name, cooking_time, difficulty, total_calories, total_quantity, main_unit })
        ));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch recipes" });
    } finally {
        if (conn) await conn.close();
    }
});

// GET /recipes  — all recipes with their ingredient list
router.get('/', async (req, res) => {
    let conn;
    try {
        conn = await connectDB();
        const result = await conn.execute(
            `SELECT r.recipe_id, r.recipe_name, r.cooking_time, r.difficulty_level,
             r.total_calories,
             DBMS_LOB.SUBSTR(r.instructions, 4000, 1) AS instructions, f.food_name, rf.quantity, rf.unit
             FROM recipe r
             JOIN recipe_food rf ON r.recipe_id = rf.recipe_id
             JOIN food f ON rf.food_id = f.food_id
             ORDER BY r.recipe_id`
        );

        // Group ingredients by recipe
        const recipesMap = {};
        for (const [recipe_id, recipe_name, cooking_time, difficulty_level, total_calories, instructions, food_name, quantity, unit] of result.rows) {
            if (!recipesMap[recipe_id]) {
                recipesMap[recipe_id] = { recipe_id, recipe_name, cooking_time, difficulty_level, total_calories, instructions, ingredients: [] };
            }
            recipesMap[recipe_id].ingredients.push({ food_name, quantity, unit });
        }

        res.json(Object.values(recipesMap));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch recipes" });
    } finally {
        if (conn) await conn.close();
    }
});

// GET /recipes/food/:food_id  — recipes that contain a specific food
// FIX: column is difficulty not difficulty_level
router.get('/food/:food_id', async (req, res) => {
    const food_id = parseInt(req.params.food_id);

    if (isNaN(food_id) || food_id <= 0) {
        return res.status(400).json({ error: "food_id must be a valid positive number" });
    }

    let conn;
    try {
        conn = await connectDB();
        const result = await conn.execute(
            `SELECT r.recipe_id, r.recipe_name, r.cooking_time, r.difficulty_level
             FROM recipe r
             JOIN recipe_food rf ON r.recipe_id = rf.recipe_id
             WHERE rf.food_id = :food_id`,
            { food_id }
        );
        res.json(result.rows.map(([recipe_id, recipe_name, cooking_time, difficulty_level]) =>
            ({ recipe_id, recipe_name, cooking_time, difficulty_level })
        ));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch recipes for food" });
    } finally {
        if (conn) await conn.close();
    }
});

module.exports = router;
