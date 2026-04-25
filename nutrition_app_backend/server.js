const express = require('express');
const cors    = require('cors');
const app     = express();

app.use(cors());
app.use(express.json());

// ROUTES
app.use('/auth',      require('./routes/authRoutes'));
app.use('/meals',     require('./routes/mealRoutes'));
app.use('/food',      require('./routes/foodRoutes'));
app.use('/recipes',   require('./routes/recipeRoutes'));
app.use('/admin',     require('./routes/adminRoutes'));
app.use('/goals',     require('./routes/goalRoutes'));
app.use('/users',     require('./routes/userRoutes'));
app.use('/nutrients', require('./routes/nutrientRoutes'));
app.use('/recommend', require('./routes/recommendRoutes'));
app.use('/allergies', require('./routes/allergyRoutes'));

app.get('/', (req, res) => {
    res.send("Nutrition App Backend Running 🚀");
});

app.listen(3000, () => {
    console.log("Server running on port 3000");
});
