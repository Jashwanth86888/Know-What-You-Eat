import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { mealAPI, recipeAPI } from '../services/api';

function Meals() {
  const { user } = useAuth();
  const [meals, setMeals] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    recipe_id: '',
    quantity: '',
  });

  useEffect(() => {
    if (user?.user_id) {
      fetchData();
    }
  }, [user?.user_id]);

  const fetchData = async () => {
    if (!user?.user_id) {
      setMeals([]);
      setRecipes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const recipesRes = await recipeAPI.getRecipesWithCalories();
      setRecipes(recipesRes.data || []);
    } catch (err) {
      console.error('Failed to load recipes:', err);
      setError('Failed to load recipes');
    }

    try {
      const mealsRes = await mealAPI.getMeals(user.user_id);
      setMeals(mealsRes.data || []);
    } catch (err) {
      console.error('Failed to load meals:', err);
      setError(prevError => prevError ? `${prevError}; Failed to load meals` : 'Failed to load meals');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user?.user_id) {
      setError('User authentication missing. Please log in again.');
      return;
    }

    try {
      setError('');
      await mealAPI.addMeal({
        user_id: user.user_id,
        recipe_id: parseInt(formData.recipe_id),
        quantity: parseFloat(formData.quantity),
      });
      setFormData({ recipe_id: '', quantity: '' });
      setShowForm(false);
      fetchData();
    } catch (err) {
      setError('Failed to add meal');
      console.error('Failed to add meal:', err);
    }
  };

  const handleDeleteMeal = async (mealId) => {
    if (window.confirm('Are you sure you want to delete this meal?')) {
      try {
        setError('');
        await mealAPI.deleteMeal(mealId);
        fetchData();
      } catch (err) {
        setError('Failed to delete meal');
        console.error('Failed to delete meal:', err);
      }
    }
  };

  if (loading) {
    return (
      <div className="container-main text-center">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-main">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>My Meals</h1>
        <button
          className="btn btn-success"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : '+ Log Meal'}
        </button>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {showForm && (
        <div className="card card-custom mb-4 p-4">
          <h5 className="mb-3">Log a New Meal</h5>
          <form onSubmit={handleSubmit}>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label htmlFor="recipe_id" className="form-label">Recipe</label>
                <select
                  className="form-select"
                  id="recipe_id"
                  name="recipe_id"
                  value={formData.recipe_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select a recipe</option>
                  {recipes.map(recipe => (
                    <option key={recipe.recipe_id} value={recipe.recipe_id}>
                      {recipe.recipe_name} ({recipe.total_calories} cal / {recipe.total_quantity} {recipe.main_unit})
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-6 mb-3">
                <label htmlFor="quantity" className="form-label">Quantity</label>
                <input
                  type="number"
                  className="form-control"
                  id="quantity"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  step="0.1"
                  required
                />
                {formData.recipe_id && formData.quantity && (() => {
                  const recipe = recipes.find(r => r.recipe_id === parseInt(formData.recipe_id));
                  if (recipe) {
                    const calories = (recipe.total_calories * parseFloat(formData.quantity) / recipe.total_quantity).toFixed(2);
                    return (
                      <div className="form-text mt-1">
                        Calories for {formData.quantity} {recipe.main_unit}: <strong>{calories} cal</strong>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
            <button type="submit" className="btn btn-success">
              Log Meal
            </button>
          </form>
        </div>
      )}

      <div className="row mb-3">
        <div className="col-12">
          <div className="alert alert-info">
            Total calories logged: <strong>{meals.reduce((sum, meal) => sum + (meal.calories || 0), 0)} cal</strong>
          </div>
        </div>
      </div>
      <div className="row">
        {meals.length === 0 ? (
          <div className="col-12">
            <div className="alert alert-info">
              No meals logged yet. Click "Log Meal" to get started!
            </div>
          </div>
        ) : (
          meals.map(meal => (
            <div key={meal.meal_id} className="col-md-6 mb-3">
              <div className="card card-custom">
                <div className="card-body">
                  <h5 className="card-title">{meal.food_name}</h5>
                  <p className="text-muted mb-2">
                    <strong>Quantity:</strong> {meal.quantity}
                  </p>
                  <p className="text-muted mb-2">
                    <strong>Calories:</strong> {meal.calories} cal
                  </p>
                  <p className="text-muted mb-3">
                    <strong>Time:</strong> {new Date(meal.meal_time).toLocaleString()}
                  </p>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDeleteMeal(meal.meal_id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Meals;
