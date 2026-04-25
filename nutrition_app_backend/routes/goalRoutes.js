const express = require('express');
const router  = express.Router();
const connectDB = require('../db');

// GET /goals  — list all master goals (weight loss, muscle gain, maintenance …)
router.get('/', async (req, res) => {
    let conn;
    try {
        conn = await connectDB();
        const result = await conn.execute(
            `SELECT goal_id, goal_name, description FROM goal`
        );
        res.json(result.rows.map(([goal_id, goal_name, description]) =>
            ({ goal_id, goal_name, description })
        ));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch goals" });
    } finally {
        if (conn) await conn.close();
    }
});

// GET /goals/user/:user_id  — get the goal currently set for a user
router.get('/user/:user_id', async (req, res) => {
    const user_id = parseInt(req.params.user_id);

    if (isNaN(user_id) || user_id <= 0) {
        return res.status(400).json({ error: "user_id must be a valid positive number" });
    }

    let conn;
    try {
        conn = await connectDB();
        const result = await conn.execute(
            `SELECT g.goal_id, g.goal_name, g.description
             FROM user_goal ug
             JOIN goal g ON ug.goal_id = g.goal_id
             WHERE ug.user_id = :user_id`,
            { user_id }
        );

        res.json(result.rows.map(([goal_id, goal_name, description]) =>
            ({ goal_id, goal_name, description })
        ));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch user goal" });
    } finally {
        if (conn) await conn.close();
    }
});

// POST /goals  — assign a goal to a user
// FIX: inserts into user_goal (junction table), NOT into goal (master table)
// Body: { user_id, goal_id }
router.post('/', async (req, res) => {
    const user_id = parseInt(req.body.user_id);
    const goal_id = parseInt(req.body.goal_id);

    if (isNaN(user_id) || isNaN(goal_id) || user_id <= 0 || goal_id <= 0) {
        return res.status(400).json({ error: "user_id and goal_id must be valid positive numbers" });
    }

    let conn;
    try {
        conn = await connectDB();

        await conn.execute(
            `INSERT INTO user_goal(user_id, goal_id) VALUES (:user_id, :goal_id)`,
            { user_id, goal_id },
            { autoCommit: true }
        );

        res.status(201).json({ message: "Goal assigned successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to assign goal" });
    } finally {
        if (conn) await conn.close();
    }
});

// DELETE /goals/user/:user_id  — remove all goals assigned to a user
router.delete('/user/:user_id', async (req, res) => {
    const user_id = parseInt(req.params.user_id);

    if (isNaN(user_id) || user_id <= 0) {
        return res.status(400).json({ error: "user_id must be a valid positive number" });
    }

    let conn;
    try {
        conn = await connectDB();
        await conn.execute(
            `DELETE FROM user_goal WHERE user_id = :user_id`,
            { user_id },
            { autoCommit: true }
        );
        res.json({ message: "User goals cleared" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to clear user goals" });
    } finally {
        if (conn) await conn.close();
    }
});

// DELETE /goals/user/:user_id/:goal_id  — remove a specific goal assignment for a user
router.delete('/user/:user_id/:goal_id', async (req, res) => {
    const user_id = parseInt(req.params.user_id);
    const goal_id = parseInt(req.params.goal_id);

    if (isNaN(user_id) || user_id <= 0 || isNaN(goal_id) || goal_id <= 0) {
        return res.status(400).json({ error: "user_id and goal_id must be valid positive numbers" });
    }

    let conn;
    try {
        conn = await connectDB();
        const result = await conn.execute(
            `DELETE FROM user_goal WHERE user_id = :user_id AND goal_id = :goal_id`,
            { user_id, goal_id },
            { autoCommit: true }
        );

        if (result.rowsAffected === 0) {
            return res.status(404).json({ error: "Goal assignment not found" });
        }

        res.json({ message: "Goal assignment removed" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to remove goal assignment" });
    } finally {
        if (conn) await conn.close();
    }
});

module.exports = router;
