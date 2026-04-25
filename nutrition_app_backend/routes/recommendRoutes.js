const express = require('express');
const router  = express.Router();
const connectDB = require('../db');
const oracledb = require('oracledb');

// GET /recommend/:user_id
router.get('/:user_id', async (req, res) => {
    const user_id = parseInt(req.params.user_id);

    if (isNaN(user_id) || user_id <= 0) {
        return res.status(400).json({ error: "user_id must be a valid positive number" });
    }

    let conn;
    try {
        conn = await connectDB();

        // Step 1: get user's goal(s)
        const goalResult = await conn.execute(
            `SELECT g.goal_id, g.goal_name
             FROM user_goal ug
             JOIN goal g ON ug.goal_id = g.goal_id
             WHERE ug.user_id = :user_id`,
            { user_id }
        );

        if (goalResult.rows.length === 0) {
            return res.status(404).json({ error: "No goal set for this user. Please set a goal first." });
        }

        const [goal_id, goal_name] = goalResult.rows[0];

        // Step 2: get recommended foods excluding allergens
        let query;
        const binds = { user_id };

        if (goal_name === 'weight loss') {
            query = `SELECT f.food_id, f.food_name, f.calories, f.category, f.type
                     FROM food f
                     WHERE f.calories < 100
                       AND UPPER(f.food_name) NOT IN (
                           SELECT UPPER(allergy_name) FROM user_allergy WHERE user_id = :user_id
                       )
                     ORDER BY f.calories ASC`;
        } else if (goal_name === 'muscle gain') {
            query = `SELECT f.food_id, f.food_name, f.calories, f.category, f.type
                     FROM food f
                     WHERE f.category IN ('Protein', 'Meat')
                       AND UPPER(f.food_name) NOT IN (
                           SELECT UPPER(allergy_name) FROM user_allergy WHERE user_id = :user_id
                       )
                     ORDER BY f.calories DESC`;
        } else {
            query = `SELECT f.food_id, f.food_name, f.calories, f.category, f.type
                     FROM food f
                     WHERE f.calories BETWEEN 100 AND 300
                       AND UPPER(f.food_name) NOT IN (
                           SELECT UPPER(allergy_name) FROM user_allergy WHERE user_id = :user_id
                       )
                     ORDER BY f.calories ASC`;
        }

        const foodResult = await conn.execute(query, binds);

        // Step 3: get important nutrients for this goal
        const nutrientResult = await conn.execute(
            `SELECT n.nutrient_name, gn.importance_level
             FROM goal_nutrient gn
             JOIN nutrient n ON gn.nutrient_id = n.nutrient_id
             WHERE gn.goal_id = :goal_id
             ORDER BY CASE gn.importance_level WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END`,
            { goal_id }
        );

        res.json({
            goal: goal_name,
            focus_nutrients: nutrientResult.rows.map(([nutrient_name, importance_level]) =>
                ({ nutrient_name, importance_level })
            ),
            recommendations: foodResult.rows.map(([food_id, food_name, calories, category, type]) =>
                ({ food_id, food_name, calories, category, type })
            )
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch recommendations" });
    } finally {
        if (conn) await conn.close();
    }
});

// POST /recommend/:user_id/apply
// Logs the recommended foods into user_meal for the user
router.post('/:user_id/apply', async (req, res) => {
    const user_id = parseInt(req.params.user_id);

    let conn;
    try {
        conn = await connectDB();

        // Step 1: get user's goal
        const goalResult = await conn.execute(
            `SELECT g.goal_id, g.goal_name
             FROM user_goal ug
             JOIN goal g ON ug.goal_id = g.goal_id
             WHERE ug.user_id = :user_id`,
            { user_id }
        );

        if (goalResult.rows.length === 0) {
            return res.status(404).json({ error: "No goal set for this user. Please set a goal first." });
        }

        const [goal_id, goal_name] = goalResult.rows[0];

        // Step 2: get recommended foods excluding allergens
        let query;
        const binds = { user_id };

        if (goal_name === 'weight loss') {
            query = `SELECT f.food_id FROM food f
                     WHERE f.calories < 100
                       AND UPPER(f.food_name) NOT IN (
                           SELECT UPPER(allergy_name) FROM user_allergy WHERE user_id = :user_id
                       )
                     ORDER BY f.calories ASC`;
        } else if (goal_name === 'muscle gain') {
            query = `SELECT f.food_id FROM food f
                     WHERE f.category IN ('Protein', 'Meat')
                       AND UPPER(f.food_name) NOT IN (
                           SELECT UPPER(allergy_name) FROM user_allergy WHERE user_id = :user_id
                       )
                     ORDER BY f.calories DESC`;
        } else {
            query = `SELECT f.food_id FROM food f
                     WHERE f.calories BETWEEN 100 AND 300
                       AND UPPER(f.food_name) NOT IN (
                           SELECT UPPER(allergy_name) FROM user_allergy WHERE user_id = :user_id
                       )
                     ORDER BY f.calories ASC`;
        }

        const foodResult = await conn.execute(query, binds);

        if (foodResult.rows.length === 0) {
            return res.status(404).json({ error: "No foods found for this goal" });
        }

        // Step 3: insert each recommended food into user_meal
        // quantity = base_quantity of the food (1 serving)
        for (const [food_id] of foodResult.rows) {
            await conn.execute(
                `INSERT INTO user_meal(user_id, recipe_id, quantity, meal_time)
                 VALUES (:user_id, :recipe_id,
                     (SELECT base_quantity FROM food WHERE food_id = :recipe_id),
                     SYSDATE)`,
                { user_id, recipe_id: food_id },
                { autoCommit: false }
            );
        }

        await conn.commit();

        res.status(201).json({
            message: `${foodResult.rows.length} meal(s) logged successfully based on your ${goal_name} goal`
        });

    } catch (err) {
        if (conn) await conn.rollback();
        console.error(err);
        res.status(500).json({ error: "Failed to apply recommendations" });
    } finally {
        if (conn) await conn.close();
    }
});

// GET /recommend/:user_id/nutrients - Get recommended nutrients based on user's goal
router.get('/:user_id/nutrients', async (req, res) => {
    const user_id = parseInt(req.params.user_id);

    if (isNaN(user_id) || user_id <= 0) {
        return res.status(400).json({ error: "user_id must be a valid positive number" });
    }

    let conn;
    try {
        conn = await connectDB();

        // Get user's goal
        const goalResult = await conn.execute(
            `SELECT g.goal_id, g.goal_name
             FROM user_goal ug
             JOIN goal g ON ug.goal_id = g.goal_id
             WHERE ug.user_id = :user_id`,
            { user_id }
        );

        if (goalResult.rows.length === 0) {
            return res.status(404).json({ error: "No goal set for this user. Please set a goal first." });
        }

        const [goal_id, goal_name] = goalResult.rows[0];

        // Get important nutrients for this goal
        const nutrientResult = await conn.execute(
            `SELECT n.nutrient_id, n.nutrient_name, n.unit, n.description, gn.importance_level
             FROM goal_nutrient gn
             JOIN nutrient n ON gn.nutrient_id = n.nutrient_id
             WHERE gn.goal_id = :goal_id
             ORDER BY CASE gn.importance_level WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END`,
            { goal_id }
        );

        res.json({
            goal: goal_name,
            nutrients: nutrientResult.rows.map(([nutrient_id, nutrient_name, unit, description, importance_level]) =>
                ({ nutrient_id, nutrient_name, unit, description, importance_level })
            )
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch recommended nutrients" });
    } finally {
        if (conn) await conn.close();
    }
});

// GET /recommend/:user_id/foods - Get recommended foods based on user's goal
router.get('/:user_id/foods', async (req, res) => {
    const user_id = parseInt(req.params.user_id);

    if (isNaN(user_id) || user_id <= 0) {
        return res.status(400).json({ error: "user_id must be a valid positive number" });
    }

    let conn;
    try {
        conn = await connectDB();

        // Get user's goal
        const goalResult = await conn.execute(
            `SELECT g.goal_id, g.goal_name
             FROM user_goal ug
             JOIN goal g ON ug.goal_id = g.goal_id
             WHERE ug.user_id = :user_id`,
            { user_id }
        );

        if (goalResult.rows.length === 0) {
            return res.status(404).json({ error: "No goal set for this user. Please set a goal first." });
        }

        const [goal_id, goal_name] = goalResult.rows[0];

        // Get recommended foods based on goal, excluding allergens
        let query;

        // Get user's allergies first
        const allergyResult = await conn.execute(
            `SELECT UPPER(allergy_name) FROM user_allergy WHERE user_id = :user_id`,
            { user_id }
        );
        const userAllergies = allergyResult.rows.map(([a]) => a);

        if (goal_name === 'weight loss') {
            query = `SELECT f.food_id, f.food_name, f.calories, f.category, f.type, f.base_quantity, f.base_unit
                     FROM food f
                     WHERE f.calories < 100
                     ORDER BY f.calories ASC`;
        } else if (goal_name === 'muscle gain') {
            query = `SELECT f.food_id, f.food_name, f.calories, f.category, f.type, f.base_quantity, f.base_unit
                     FROM food f
                     WHERE f.category IN ('Protein', 'Meat')
                     ORDER BY f.calories DESC`;
        } else {
            query = `SELECT f.food_id, f.food_name, f.calories, f.category, f.type, f.base_quantity, f.base_unit
                     FROM food f
                     WHERE f.calories BETWEEN 100 AND 300
                     ORDER BY f.calories ASC`;
        }

        const foodResult = await conn.execute(query);

        // Filter out allergens in JavaScript
        let filteredFoods = foodResult.rows;
        if (userAllergies.length > 0) {
            filteredFoods = foodResult.rows.filter(([food_id, food_name]) => {
                const upperName = food_name.toUpperCase();
                return !userAllergies.some(allergy => upperName.includes(allergy));
            });
        }

        res.json({
            goal: goal_name,
            foods: filteredFoods.map(([food_id, food_name, calories, category, type, base_quantity, base_unit]) =>
                ({ food_id, food_name, calories, category, type, base_quantity, base_unit })
            )
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch recommended foods" });
    } finally {
        if (conn) await conn.close();
    }
});

// GET /recommend/:user_id/recipes - Get recommended recipes based on user's goal
router.get('/:user_id/recipes', async (req, res) => {
    const user_id = parseInt(req.params.user_id);

    if (isNaN(user_id) || user_id <= 0) {
        return res.status(400).json({ error: "user_id must be a valid positive number" });
    }

    let conn;
    try {
        conn = await connectDB();

        // Get user's goal
        const goalResult = await conn.execute(
            `SELECT g.goal_id, g.goal_name
             FROM user_goal ug
             JOIN goal g ON ug.goal_id = g.goal_id
             WHERE ug.user_id = :user_id`,
            { user_id }
        );

        if (goalResult.rows.length === 0) {
            return res.status(404).json({ error: "No goal set for this user. Please set a goal first." });
        }

        const [goal_id, goal_name] = goalResult.rows[0];

        // Get user's allergies first
        const allergyResult = await conn.execute(
            `SELECT UPPER(allergy_name) FROM user_allergy WHERE user_id = :user_id`,
            { user_id }
        );
        const userAllergies = allergyResult.rows.map(([a]) => a);

        // Get recipes with their total calories
        let query;

        if (goal_name === 'weight loss') {
            query = `SELECT r.recipe_id, r.recipe_name, r.cooking_time, r.difficulty_level,
                            CAST(ROUND(SUM(f.calories * rf.quantity / f.base_quantity), 2) AS NUMBER(10,2)) AS total_calories
                     FROM recipe r
                     JOIN recipe_food rf ON r.recipe_id = rf.recipe_id
                     JOIN food f ON rf.food_id = f.food_id
                     GROUP BY r.recipe_id, r.recipe_name, r.cooking_time, r.difficulty_level
                     HAVING CAST(ROUND(SUM(f.calories * rf.quantity / f.base_quantity), 2) AS NUMBER(10,2)) < 400
                     ORDER BY total_calories ASC`;
        } else if (goal_name === 'muscle gain') {
            query = `SELECT r.recipe_id, r.recipe_name, r.cooking_time, r.difficulty_level,
                            CAST(ROUND(SUM(f.calories * rf.quantity / f.base_quantity), 2) AS NUMBER(10,2)) AS total_calories
                     FROM recipe r
                     JOIN recipe_food rf ON r.recipe_id = rf.recipe_id
                     JOIN food f ON rf.food_id = f.food_id
                     GROUP BY r.recipe_id, r.recipe_name, r.cooking_time, r.difficulty_level
                     HAVING CAST(ROUND(SUM(f.calories * rf.quantity / f.base_quantity), 2) AS NUMBER(10,2)) >= 400
                     ORDER BY total_calories DESC`;
        } else {
            query = `SELECT r.recipe_id, r.recipe_name, r.cooking_time, r.difficulty_level,
                            CAST(ROUND(SUM(f.calories * rf.quantity / f.base_quantity), 2) AS NUMBER(10,2)) AS total_calories
                     FROM recipe r
                     JOIN recipe_food rf ON r.recipe_id = rf.recipe_id
                     JOIN food f ON rf.food_id = f.food_id
                     GROUP BY r.recipe_id, r.recipe_name, r.cooking_time, r.difficulty_level
                     ORDER BY total_calories ASC`;
        }

        const recipeResult = await conn.execute(query);

        // Get all recipe ingredients for allergen filtering
        const recipeIds = recipeResult.rows.map(([rid]) => rid);
        let filteredRecipes = recipeResult.rows;

        if (userAllergies.length > 0 && recipeIds.length > 0) {
            // Get all ingredients for these recipes
            const ingredientsResult = await conn.execute(
                `SELECT r.recipe_id, f.food_name
                 FROM recipe r
                 JOIN recipe_food rf ON r.recipe_id = rf.recipe_id
                 JOIN food f ON rf.food_id = f.food_id
                 WHERE r.recipe_id IN (${recipeIds.join(',')})`,
                {},
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            // Build a map of recipe -> ingredients
            const recipeIngredients = {};
            for (const row of ingredientsResult.rows) {
                if (!recipeIngredients[row.RECIPE_ID]) {
                    recipeIngredients[row.RECIPE_ID] = [];
                }
                recipeIngredients[row.RECIPE_ID].push(row.FOOD_NAME.toUpperCase());
            }

            // Filter out recipes containing allergens
            filteredRecipes = recipeResult.rows.filter(([recipe_id]) => {
                const ingredients = recipeIngredients[recipe_id] || [];
                return !ingredients.some(ing => userAllergies.some(allergy => ing.includes(allergy)));
            });
        }

        res.json({
            goal: goal_name,
            recipes: filteredRecipes.map(([recipe_id, recipe_name, cooking_time, difficulty_level, total_calories]) =>
                ({ recipe_id, recipe_name, cooking_time, difficulty_level, total_calories })
            )
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch recommended recipes" });
    } finally {
        if (conn) await conn.close();
    }
});

module.exports = router;