const express   = require('express');
const router    = express.Router();
const connectDB = require('../db');
const { checkAdmin } = require('../middleware/auth');

// ─────────────────────────────────────────────
// HELPER FUNCTION: Calculate total calories for a recipe
// ─────────────────────────────────────────────
async function calculateTotalCalories(conn, ingredients) {
    if (!ingredients || ingredients.length === 0) return 0;

    let totalCalories = 0;
    
    for (const { food_id, quantity } of ingredients) {
        try {
            // Fetch food details to get calories and base_quantity
            const foodResult = await conn.execute(
                `SELECT calories, base_quantity FROM food WHERE food_id = :food_id`,
                { food_id: parseInt(food_id) }
            );
            
            if (foodResult.rows && foodResult.rows.length > 0) {
                const [calories, base_quantity] = foodResult.rows[0];
                // Calculate: (calories per base_quantity) * (actual_quantity / base_quantity)
                const ingredientCalories = (calories * quantity) / base_quantity;
                totalCalories += ingredientCalories;
            }
        } catch (err) {
            console.error(`Error fetching food ${food_id}:`, err);
        }
    }
    
    // Round to 2 decimal places
    return Math.round(totalCalories * 100) / 100;
}

// ─────────────────────────────────────────────
//  HELPER FUNCTIONS
// ─────────────────────────────────────────────
async function getNextId(conn, table, column) {
    const result = await conn.execute(
        `SELECT NVL(MAX(${column}), 0) + 1 FROM ${table}`
    );
    return result.rows[0][0];
}

// ─────────────────────────────────────────────
//  USERS
// ─────────────────────────────────────────────

// GET /admin/users
router.get('/users', checkAdmin, async (req, res) => {
    let conn;
    try {
        conn = await connectDB();
        const result = await conn.execute(
            `SELECT user_id, name, email, age, gender, role FROM users ORDER BY user_id`
        );
        res.json(result.rows.map(([user_id, name, email, age, gender, role]) =>
            ({ user_id, name, email, age, gender, role })
        ));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch users" });
    } finally {
        if (conn) await conn.close();
    }
});

// ─────────────────────────────────────────────
//  FOOD
// ─────────────────────────────────────────────

// POST /admin/food  — add food + optionally link nutrients in one request
// Body: { food_name, type, calories, category, base_quantity, base_unit,
//         nutrients: [ { nutrient_id, amount_of_nutrient }, ... ] }
// nutrients array is optional — food is created even without it
router.post('/food', checkAdmin, async (req, res) => {
    const { food_name, type, calories, category, base_quantity, base_unit, nutrients } = req.body;

    if (!food_name || calories === undefined || !base_quantity || !base_unit) {
        return res.status(400).json({
            error: "food_name, calories, base_quantity and base_unit are required"
        });
    }

    let conn;
    try {
        conn = await connectDB();

        // Insert food using sequence
        const food_id_value = await getNextId(conn, 'food', 'food_id');
        await conn.execute(
            `INSERT INTO food(food_id, food_name, type, calories, category, base_quantity, base_unit)
             VALUES (:food_id, :food_name, :type, :calories, :category, :base_quantity, :base_unit)`,
            {
                food_id: food_id_value,
                food_name, type, calories, category, base_quantity, base_unit,
            },
            { autoCommit: false }
        );

        const new_food_id = food_id_value;

        // If nutrients provided, insert into food_nutrient
        if (nutrients && Array.isArray(nutrients) && nutrients.length > 0) {
            for (const { nutrient_id, amount_of_nutrient } of nutrients) {
                if (!nutrient_id || amount_of_nutrient === undefined) continue;
                await conn.execute(
                    `INSERT INTO food_nutrient(food_id, nutrient_id, amount_of_nutrient)
                     VALUES (:food_id, :nutrient_id, :amount_of_nutrient)`,
                    { food_id: new_food_id, nutrient_id: parseInt(nutrient_id), amount_of_nutrient },
                    { autoCommit: false }
                );
            }
        }

        await conn.commit();
        res.status(201).json({
            message: "Food added successfully",
            food_id: new_food_id,
            nutrients_linked: nutrients ? nutrients.length : 0
        });
    } catch (err) {
        if (conn) await conn.rollback();
        console.error(err);
        res.status(500).json({ error: "Failed to add food" });
    } finally {
        if (conn) await conn.close();
    }
});

// PUT /admin/food/:food_id  — update food details
// Body: { food_name, type, calories, category, base_quantity, base_unit }
router.put('/food/:food_id', checkAdmin, async (req, res) => {
    const food_id = parseInt(req.params.food_id);
    const { food_name, type, calories, category, base_quantity, base_unit } = req.body;

    if (isNaN(food_id) || food_id <= 0) {
        return res.status(400).json({ error: "food_id must be a valid positive number" });
    }

    if (!food_name || isNaN(calories) || calories <= 0 || !base_quantity || !base_unit) {
        return res.status(400).json({
            error: "food_name, calories (positive number), base_quantity and base_unit are required"
        });
    }

    let conn;
    try {
        conn = await connectDB();
        const result = await conn.execute(
            `UPDATE food
             SET food_name=:food_name, type=:type, calories=:calories,
                 category=:category, base_quantity=:base_quantity, base_unit=:base_unit
             WHERE food_id=:food_id`,
            { food_name, type, calories, category, base_quantity, base_unit, food_id },
            { autoCommit: true }
        );

        if (result.rowsAffected === 0) {
            return res.status(404).json({ error: "Food not found" });
        }

        res.json({ message: "Food updated successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update food" });
    } finally {
        if (conn) await conn.close();
    }
});

// DELETE /admin/food/:food_id
// Also cleans up food_nutrient and recipe_food rows automatically
router.delete('/food/:food_id', checkAdmin, async (req, res) => {
    const food_id = parseInt(req.params.food_id);

    let conn;
    try {
        conn = await connectDB();

        // Delete from relational tables first (FK constraints)
        await conn.execute(
            `DELETE FROM food_nutrient WHERE food_id = :food_id`,
            { food_id }, { autoCommit: false }
        );
        await conn.execute(
            `DELETE FROM recipe_food WHERE food_id = :food_id`,
            { food_id }, { autoCommit: false }
        );

        const result = await conn.execute(
            `DELETE FROM food WHERE food_id = :food_id`,
            { food_id }, { autoCommit: false }
        );

        if (result.rowsAffected === 0) {
            await conn.rollback();
            return res.status(404).json({ error: "Food not found" });
        }

        await conn.commit();
        res.json({ message: "Food and all related records deleted" });
    } catch (err) {
        if (conn) await conn.rollback();
        console.error(err);
        res.status(500).json({ error: "Failed to delete food" });
    } finally {
        if (conn) await conn.close();
    }
});

// POST /admin/food/:food_id/nutrients  — link nutrients to an existing food
// Body: { nutrients: [ { nutrient_id, amount_of_nutrient }, ... ] }
// Replaces all existing nutrient links for this food
router.post('/food/:food_id/nutrients', checkAdmin, async (req, res) => {
    const food_id = parseInt(req.params.food_id);
    const { nutrients } = req.body;

    if (!nutrients || !Array.isArray(nutrients) || nutrients.length === 0) {
        return res.status(400).json({ error: "nutrients array is required" });
    }

    let conn;
    try {
        conn = await connectDB();

        // Remove existing nutrient links for this food
        await conn.execute(
            `DELETE FROM food_nutrient WHERE food_id = :food_id`,
            { food_id }, { autoCommit: false }
        );

        // Insert new links
        for (const { nutrient_id, amount_of_nutrient } of nutrients) {
            if (!nutrient_id || amount_of_nutrient === undefined) continue;
            await conn.execute(
                `INSERT INTO food_nutrient(food_id, nutrient_id, amount_of_nutrient)
                 VALUES (:food_id, :nutrient_id, :amount_of_nutrient)`,
                { food_id, nutrient_id: parseInt(nutrient_id), amount_of_nutrient },
                { autoCommit: false }
            );
        }

        await conn.commit();
        res.status(201).json({
            message: `${nutrients.length} nutrient(s) linked to food successfully`
        });
    } catch (err) {
        if (conn) await conn.rollback();
        console.error(err);
        res.status(500).json({ error: "Failed to link nutrients to food" });
    } finally {
        if (conn) await conn.close();
    }
});

// ─────────────────────────────────────────────
//  NUTRIENT
// ─────────────────────────────────────────────

// POST /admin/nutrient  — add a new nutrient
// Body: { nutrient_name, unit, description }
router.post('/nutrient', checkAdmin, async (req, res) => {
    const { nutrient_name, unit, description } = req.body;

    if (!nutrient_name || !unit) {
        return res.status(400).json({ error: "nutrient_name and unit are required" });
    }

    let conn;
    try {
        conn = await connectDB();

        const nutrient_id_value = await getNextId(conn, 'nutrient', 'nutrient_id');
        await conn.execute(
            `INSERT INTO nutrient(nutrient_id, nutrient_name, unit, description)
             VALUES (:nutrient_id, :nutrient_name, :unit, :description)`,
            {
                nutrient_id: nutrient_id_value,
                nutrient_name, unit, description,
            },
            { autoCommit: true }
        );

        res.status(201).json({
            message: "Nutrient added successfully",
            nutrient_id: nutrient_id_value
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to add nutrient" });
    } finally {
        if (conn) await conn.close();
    }
});

// PUT /admin/nutrient/:nutrient_id  — update a nutrient
// Body: { nutrient_name, unit, description }
router.put('/nutrient/:nutrient_id', checkAdmin, async (req, res) => {
    const nutrient_id = parseInt(req.params.nutrient_id);
    const { nutrient_name, unit, description } = req.body;

    if (!nutrient_name || !unit) {
        return res.status(400).json({ error: "nutrient_name and unit are required" });
    }

    let conn;
    try {
        conn = await connectDB();
        const result = await conn.execute(
            `UPDATE nutrient
             SET nutrient_name=:nutrient_name, unit=:unit, description=:description
             WHERE nutrient_id=:nutrient_id`,
            { nutrient_name, unit, description, nutrient_id },
            { autoCommit: true }
        );

        if (result.rowsAffected === 0) {
            return res.status(404).json({ error: "Nutrient not found" });
        }

        res.json({ message: "Nutrient updated successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update nutrient" });
    } finally {
        if (conn) await conn.close();
    }
});

// DELETE /admin/nutrient/:nutrient_id
// Also cleans up food_nutrient and goal_nutrient rows automatically
router.delete('/nutrient/:nutrient_id', checkAdmin, async (req, res) => {
    const nutrient_id = parseInt(req.params.nutrient_id);

    let conn;
    try {
        conn = await connectDB();

        // Delete from relational tables first
        await conn.execute(
            `DELETE FROM food_nutrient WHERE nutrient_id = :nutrient_id`,
            { nutrient_id }, { autoCommit: false }
        );
        await conn.execute(
            `DELETE FROM goal_nutrient WHERE nutrient_id = :nutrient_id`,
            { nutrient_id }, { autoCommit: false }
        );

        const result = await conn.execute(
            `DELETE FROM nutrient WHERE nutrient_id = :nutrient_id`,
            { nutrient_id }, { autoCommit: false }
        );

        if (result.rowsAffected === 0) {
            await conn.rollback();
            return res.status(404).json({ error: "Nutrient not found" });
        }

        await conn.commit();
        res.json({ message: "Nutrient and all related records deleted" });
    } catch (err) {
        if (conn) await conn.rollback();
        console.error(err);
        res.status(500).json({ error: "Failed to delete nutrient" });
    } finally {
        if (conn) await conn.close();
    }
});

// ─────────────────────────────────────────────
//  GOAL
// ─────────────────────────────────────────────

// POST /admin/goal  — add a new master goal
// Body: { goal_name, description }
router.post('/goal', checkAdmin, async (req, res) => {
    const { goal_name, description } = req.body;

    if (!goal_name) {
        return res.status(400).json({ error: "goal_name is required" });
    }

    let conn;
    try {
        conn = await connectDB();

        const goal_id_value = await getNextId(conn, 'goal', 'goal_id');
        await conn.execute(
            `INSERT INTO goal(goal_id, goal_name, description)
             VALUES (:goal_id, :goal_name, :description)`,
            {
                goal_id: goal_id_value,
                goal_name, description,
            },
            { autoCommit: true }
        );

        res.status(201).json({
            message: "Goal added successfully",
            goal_id: goal_id_value
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to add goal" });
    } finally {
        if (conn) await conn.close();
    }
});

// PUT /admin/goal/:goal_id  — update a goal
// Body: { goal_name, description }
router.put('/goal/:goal_id', checkAdmin, async (req, res) => {
    const goal_id = parseInt(req.params.goal_id);
    const { goal_name, description } = req.body;

    if (!goal_name) {
        return res.status(400).json({ error: "goal_name is required" });
    }

    let conn;
    try {
        conn = await connectDB();
        const result = await conn.execute(
            `UPDATE goal
             SET goal_name=:goal_name, description=:description
             WHERE goal_id=:goal_id`,
            { goal_name, description, goal_id },
            { autoCommit: true }
        );

        if (result.rowsAffected === 0) {
            return res.status(404).json({ error: "Goal not found" });
        }

        res.json({ message: "Goal updated successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update goal" });
    } finally {
        if (conn) await conn.close();
    }
});

// DELETE /admin/goal/:goal_id
// Also cleans up user_goal and goal_nutrient rows automatically
router.delete('/goal/:goal_id', checkAdmin, async (req, res) => {
    const goal_id = parseInt(req.params.goal_id);

    let conn;
    try {
        conn = await connectDB();

        // Delete from relational tables first
        await conn.execute(
            `DELETE FROM user_goal WHERE goal_id = :goal_id`,
            { goal_id }, { autoCommit: false }
        );
        await conn.execute(
            `DELETE FROM goal_nutrient WHERE goal_id = :goal_id`,
            { goal_id }, { autoCommit: false }
        );

        const result = await conn.execute(
            `DELETE FROM goal WHERE goal_id = :goal_id`,
            { goal_id }, { autoCommit: false }
        );

        if (result.rowsAffected === 0) {
            await conn.rollback();
            return res.status(404).json({ error: "Goal not found" });
        }

        await conn.commit();
        res.json({ message: "Goal and all related records deleted" });
    } catch (err) {
        if (conn) await conn.rollback();
        console.error(err);
        res.status(500).json({ error: "Failed to delete goal" });
    } finally {
        if (conn) await conn.close();
    }
});

// ─────────────────────────────────────────────
//  RECIPE
// ─────────────────────────────────────────────

// POST /admin/recipe  — add recipe + auto-populate recipe_food in one request
// Body: { recipe_name, cooking_time, difficulty_level, instructions,
//         ingredients: [ { food_id, quantity, unit }, ... ] }
router.post('/recipe', checkAdmin, async (req, res) => {
    const { recipe_name, cooking_time, difficulty_level, instructions, ingredients } = req.body;

    if (!recipe_name || !ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
        return res.status(400).json({
            error: "recipe_name and ingredients array are required"
        });
    }

    let conn;
    try {
        conn = await connectDB();

        // Calculate total calories for the recipe
        const total_calories = await calculateTotalCalories(conn, ingredients);

        // Insert recipe using sequence, get back the new recipe_id
        const recipe_id_value = await getNextId(conn, 'recipe', 'recipe_id');
        await conn.execute(
            `INSERT INTO recipe(recipe_id, recipe_name, cooking_time, difficulty_level, instructions, total_calories)
             VALUES (:recipe_id, :recipe_name, :cooking_time, :difficulty_level, :instructions, :total_calories)`,
            {
                recipe_id: recipe_id_value,
                recipe_name,
                cooking_time: cooking_time || null,
                difficulty_level: difficulty_level || null,
                instructions: instructions || null,
                total_calories,
            },
            { autoCommit: false }
        );

        const new_recipe_id = recipe_id_value;

        // Auto-populate recipe_food for each ingredient
        for (const { food_id, quantity, unit } of ingredients) {
            if (!food_id || quantity === undefined || !unit) continue;
            await conn.execute(
                `INSERT INTO recipe_food(recipe_id, food_id, quantity, unit)
                 VALUES (:recipe_id, :food_id, :quantity, :unit)`,
                {
                    recipe_id: new_recipe_id,
                    food_id: parseInt(food_id),
                    quantity,
                    unit
                },
                { autoCommit: false }
            );
        }

        await conn.commit();
        res.status(201).json({
            message: "Recipe added successfully",
            recipe_id: new_recipe_id,
            total_calories,
            ingredients_linked: ingredients.length
        });
    } catch (err) {
        if (conn) await conn.rollback();
        console.error(err);
        res.status(500).json({ error: "Failed to add recipe" });
    } finally {
        if (conn) await conn.close();
    }
});

// PUT /admin/recipe/:recipe_id  — update recipe details + replace ingredients
// Body: { recipe_name, cooking_time, difficulty_level, instructions,
//         ingredients: [ { food_id, quantity, unit }, ... ] }
// ingredients is optional — if not provided, existing ingredients are kept
router.put('/recipe/:recipe_id', checkAdmin, async (req, res) => {
    const recipe_id = parseInt(req.params.recipe_id);
    const { recipe_name, cooking_time, difficulty_level, instructions, ingredients } = req.body;

    if (!recipe_name) {
        return res.status(400).json({ error: "recipe_name is required" });
    }

    let conn;
    try {
        conn = await connectDB();

        // Calculate total calories if ingredients are provided
        let total_calories = null;
        if (ingredients && Array.isArray(ingredients) && ingredients.length > 0) {
            total_calories = await calculateTotalCalories(conn, ingredients);
        }

        // Update recipe details (including total_calories if calculated)
        let updateQuery = `UPDATE recipe
                          SET recipe_name=:recipe_name, cooking_time=:cooking_time,
                              difficulty_level=:difficulty_level, instructions=:instructions`;
        const updateParams = { recipe_name, cooking_time, difficulty_level, instructions, recipe_id };

        if (total_calories !== null) {
            updateQuery += `, total_calories=:total_calories`;
            updateParams.total_calories = total_calories;
        }

        updateQuery += ` WHERE recipe_id=:recipe_id`;

        const result = await conn.execute(updateQuery, updateParams, { autoCommit: false });

        if (result.rowsAffected === 0) {
            await conn.rollback();
            return res.status(404).json({ error: "Recipe not found" });
        }

        // If ingredients provided, replace all existing ones
        if (ingredients && Array.isArray(ingredients) && ingredients.length > 0) {
            await conn.execute(
                `DELETE FROM recipe_food WHERE recipe_id = :recipe_id`,
                { recipe_id }, { autoCommit: false }
            );

            for (const { food_id, quantity, unit } of ingredients) {
                if (!food_id || quantity === undefined || !unit) continue;
                await conn.execute(
                    `INSERT INTO recipe_food(recipe_id, food_id, quantity, unit)
                     VALUES (:recipe_id, :food_id, :quantity, :unit)`,
                    { recipe_id, food_id: parseInt(food_id), quantity, unit },
                    { autoCommit: false }
                );
            }
        }

        await conn.commit();
        res.json({ 
            message: "Recipe updated successfully",
            total_calories
        });
    } catch (err) {
        if (conn) await conn.rollback();
        console.error(err);
        res.status(500).json({ error: "Failed to update recipe" });
    } finally {
        if (conn) await conn.close();
    }
});

// DELETE /admin/recipe/:recipe_id
// Also cleans up recipe_food rows automatically
router.delete('/recipe/:recipe_id', checkAdmin, async (req, res) => {
    const recipe_id = parseInt(req.params.recipe_id);

    let conn;
    try {
        conn = await connectDB();

        // Delete ingredients first (FK constraint)
        await conn.execute(
            `DELETE FROM recipe_food WHERE recipe_id = :recipe_id`,
            { recipe_id }, { autoCommit: false }
        );

        const result = await conn.execute(
            `DELETE FROM recipe WHERE recipe_id = :recipe_id`,
            { recipe_id }, { autoCommit: false }
        );

        if (result.rowsAffected === 0) {
            await conn.rollback();
            return res.status(404).json({ error: "Recipe not found" });
        }

        await conn.commit();
        res.json({ message: "Recipe and all ingredients deleted" });
    } catch (err) {
        if (conn) await conn.rollback();
        console.error(err);
        res.status(500).json({ error: "Failed to delete recipe" });
    } finally {
        if (conn) await conn.close();
    }
});

module.exports = router;
