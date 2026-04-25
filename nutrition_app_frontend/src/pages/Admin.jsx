import React, { useState, useEffect } from 'react';
import { nutrientAPI, adminAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

// Admin Control Panel - Manage Nutrients, Foods, Goals, and view Users

function Admin() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('nutrients');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Data lists
  const [nutrients, setNutrients] = useState([]);
  const [foods, setFoods] = useState([]);
  const [goals, setGoals] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [users, setUsers] = useState([]);

  // Editing states
  const [editingNutrient, setEditingNutrient] = useState(null);
  const [editingFood, setEditingFood] = useState(null);
  const [editingGoal, setEditingGoal] = useState(null);
  const [editingRecipe, setEditingRecipe] = useState(null);

  // Form states
  const [nutrientForm, setNutrientForm] = useState({
    nutrient_name: '',
    unit: '',
    description: '',
  });

  const [foodForm, setFoodForm] = useState({
    food_name: '',
    type: '',
    calories: '',
    category: '',
    base_quantity: '',
    base_unit: '',
  });

  const [goalForm, setGoalForm] = useState({
    goal_name: '',
    description: '',
  });

  const [recipeForm, setRecipeForm] = useState({
    recipe_name: '',
    cooking_time: '',
    difficulty_level: '',
    instructions: '',
    ingredientsJson: '',
  });

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    fetchAllData();
  }, [isAdmin, navigate, activeTab]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [nutrientsRes, foodsRes, goalsRes, recipesRes, usersRes] = await Promise.all([
        nutrientAPI.getAllNutrients(),
        adminAPI.getAllFoods(),
        adminAPI.getAllGoals(),
        adminAPI.getAllRecipes(),
        adminAPI.getAllUsers(),
      ]);

      if (Array.isArray(nutrientsRes.data)) setNutrients(nutrientsRes.data);
      if (Array.isArray(foodsRes.data)) setFoods(foodsRes.data);
      if (Array.isArray(goalsRes.data)) setGoals(goalsRes.data);
      if (Array.isArray(recipesRes.data)) setRecipes(recipesRes.data);
      if (Array.isArray(usersRes.data)) setUsers(usersRes.data);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  // ============ NUTRIENT HANDLERS ============
  const handleNutrientChange = (e) => {
    const { name, value } = e.target;
    setNutrientForm({ ...nutrientForm, [name]: value });
  };

  const handleAddNutrient = async (e) => {
    e.preventDefault();
    if (!nutrientForm.nutrient_name || !nutrientForm.unit) {
      setError('Nutrient name and unit are required');
      return;
    }

    try {
      setLoading(true);
      await adminAPI.addNutrient(nutrientForm);
      setSuccess('Nutrient added successfully!');
      setNutrientForm({ nutrient_name: '', unit: '', description: '' });
      await fetchAllData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add nutrient');
    } finally {
      setLoading(false);
    }
  };

  const handleEditNutrient = (nutrient) => {
    setEditingNutrient(nutrient.nutrient_id);
    setNutrientForm({
      nutrient_name: nutrient.nutrient_name,
      unit: nutrient.unit,
      description: nutrient.description,
    });
  };

  const handleUpdateNutrient = async (e) => {
    e.preventDefault();
    if (!nutrientForm.nutrient_name || !nutrientForm.unit) {
      setError('Nutrient name and unit are required');
      return;
    }

    try {
      setLoading(true);
      await adminAPI.updateNutrient(editingNutrient, nutrientForm);
      setSuccess('Nutrient updated successfully!');
      setNutrientForm({ nutrient_name: '', unit: '', description: '' });
      setEditingNutrient(null);
      await fetchAllData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update nutrient');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNutrient = async (nutrientId) => {
    if (!window.confirm('Are you sure you want to delete this nutrient?')) return;

    try {
      setLoading(true);
      await adminAPI.deleteNutrient(nutrientId);
      setSuccess('Nutrient deleted successfully!');
      await fetchAllData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete nutrient');
    } finally {
      setLoading(false);
    }
  };

  // ============ FOOD HANDLERS ============
  const handleFoodChange = (e) => {
    const { name, value } = e.target;
    setFoodForm({ ...foodForm, [name]: value });
  };

  const handleAddFood = async (e) => {
    e.preventDefault();
    if (!foodForm.food_name || !foodForm.calories || !foodForm.base_quantity || !foodForm.base_unit) {
      setError('Food name, calories, quantity, and unit are required');
      return;
    }

    try {
      setLoading(true);
      await adminAPI.addFood({
        ...foodForm,
        calories: parseFloat(foodForm.calories),
        base_quantity: parseFloat(foodForm.base_quantity),
      });
      setSuccess('Food added successfully!');
      setFoodForm({
        food_name: '',
        type: '',
        calories: '',
        category: '',
        base_quantity: '',
        base_unit: '',
      });
      await fetchAllData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add food');
    } finally {
      setLoading(false);
    }
  };

  const handleEditFood = (food) => {
    setEditingFood(food.food_id);
    setFoodForm({
      food_name: food.food_name,
      type: food.type || '',
      calories: food.calories,
      category: food.category || '',
      base_quantity: food.base_quantity,
      base_unit: food.base_unit,
    });
  };

  const handleUpdateFood = async (e) => {
    e.preventDefault();
    if (!foodForm.food_name || !foodForm.calories || !foodForm.base_quantity || !foodForm.base_unit) {
      setError('Food name, calories, quantity, and unit are required');
      return;
    }

    try {
      setLoading(true);
      await adminAPI.updateFood(editingFood, {
        ...foodForm,
        calories: parseFloat(foodForm.calories),
        base_quantity: parseFloat(foodForm.base_quantity),
      });
      setSuccess('Food updated successfully!');
      setFoodForm({
        food_name: '',
        type: '',
        calories: '',
        category: '',
        base_quantity: '',
        base_unit: '',
      });
      setEditingFood(null);
      await fetchAllData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update food');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFood = async (foodId) => {
    if (!window.confirm('Are you sure you want to delete this food?')) return;

    try {
      setLoading(true);
      await adminAPI.deleteFood(foodId);
      setSuccess('Food deleted successfully!');
      await fetchAllData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete food');
    } finally {
      setLoading(false);
    }
  };

  // ============ GOAL HANDLERS ============
  const handleGoalChange = (e) => {
    const { name, value } = e.target;
    setGoalForm({ ...goalForm, [name]: value });
  };

  const handleAddGoal = async (e) => {
    e.preventDefault();
    if (!goalForm.goal_name) {
      setError('Goal name is required');
      return;
    }

    try {
      setLoading(true);
      await adminAPI.addGoal(goalForm);
      setSuccess('Goal added successfully!');
      setGoalForm({ goal_name: '', description: '' });
      await fetchAllData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add goal');
    } finally {
      setLoading(false);
    }
  };

  const handleEditGoal = (goal) => {
    setEditingGoal(goal.goal_id);
    setGoalForm({
      goal_name: goal.goal_name,
      description: goal.description || '',
    });
  };

  const handleUpdateGoal = async (e) => {
    e.preventDefault();
    if (!goalForm.goal_name) {
      setError('Goal name is required');
      return;
    }

    try {
      setLoading(true);
      await adminAPI.updateGoal(editingGoal, goalForm);
      setSuccess('Goal updated successfully!');
      setGoalForm({ goal_name: '', description: '' });
      setEditingGoal(null);
      await fetchAllData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update goal');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGoal = async (goalId) => {
    if (!window.confirm('Are you sure you want to delete this goal?')) return;

    try {
      setLoading(true);
      await adminAPI.deleteGoal(goalId);
      setSuccess('Goal deleted successfully!');
      await fetchAllData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete goal');
    } finally {
      setLoading(false);
    }
  };

  // ============ RECIPE HANDLERS ============
  const handleRecipeChange = (e) => {
    const { name, value } = e.target;
    setRecipeForm({ ...recipeForm, [name]: value });
  };

  const handleAddRecipe = async (e) => {
    e.preventDefault();
    if (!recipeForm.recipe_name || !recipeForm.ingredientsJson.trim()) {
      setError('Recipe name and ingredients (JSON format) are required');
      return;
    }

    try {
      let ingredients = [];
      try {
        ingredients = JSON.parse(recipeForm.ingredientsJson);
      } catch {
        setError('Ingredients must be valid JSON. Example: [{"food_id": 1, "quantity": 100, "unit": "g"}]');
        return;
      }

      if (!Array.isArray(ingredients) || ingredients.length === 0) {
        setError('Ingredients must be a non-empty array');
        return;
      }

      setLoading(true);
      await adminAPI.addRecipe({
        recipe_name: recipeForm.recipe_name,
        cooking_time: recipeForm.cooking_time || null,
        difficulty_level: recipeForm.difficulty_level || null,
        instructions: recipeForm.instructions || null,
        ingredients,
      });
      setSuccess('Recipe added successfully!');
      setRecipeForm({
        recipe_name: '',
        cooking_time: '',
        difficulty_level: '',
        instructions: '',
        ingredientsJson: '',
      });
      await fetchAllData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add recipe');
    } finally {
      setLoading(false);
    }
  };

  const handleEditRecipe = (recipe) => {
    setEditingRecipe(recipe.recipe_id);
    const ingredientsJson = recipe.ingredients ? JSON.stringify(recipe.ingredients.map(ing => ({
      food_id: ing.food_id || 0,
      quantity: ing.quantity,
      unit: ing.unit
    }))) : '[]';
    
    setRecipeForm({
      recipe_name: recipe.recipe_name,
      cooking_time: recipe.cooking_time || '',
      difficulty_level: recipe.difficulty_level || '',
      instructions: recipe.instructions || '',
      ingredientsJson,
    });
  };

  const handleUpdateRecipe = async (e) => {
    e.preventDefault();
    if (!recipeForm.recipe_name || !recipeForm.ingredientsJson.trim()) {
      setError('Recipe name and ingredients (JSON format) are required');
      return;
    }

    try {
      let ingredients = [];
      try {
        ingredients = JSON.parse(recipeForm.ingredientsJson);
      } catch {
        setError('Ingredients must be valid JSON');
        return;
      }

      if (!Array.isArray(ingredients) || ingredients.length === 0) {
        setError('Ingredients must be a non-empty array');
        return;
      }

      setLoading(true);
      await adminAPI.updateRecipe(editingRecipe, {
        recipe_name: recipeForm.recipe_name,
        cooking_time: recipeForm.cooking_time || null,
        difficulty_level: recipeForm.difficulty_level || null,
        instructions: recipeForm.instructions || null,
        ingredients,
      });
      setSuccess('Recipe updated successfully!');
      setRecipeForm({
        recipe_name: '',
        cooking_time: '',
        difficulty_level: '',
        instructions: '',
        ingredientsJson: '',
      });
      setEditingRecipe(null);
      await fetchAllData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update recipe');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecipe = async (recipeId) => {
    if (!window.confirm('Are you sure you want to delete this recipe?')) return;

    try {
      setLoading(true);
      await adminAPI.deleteRecipe(recipeId);
      setSuccess('Recipe deleted successfully!');
      await fetchAllData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete recipe');
    } finally {
      setLoading(false);
    }
  };

  // ============ CANCEL EDIT HANDLERS ============
  const handleCancelEdit = () => {
    setEditingNutrient(null);
    setEditingFood(null);
    setEditingGoal(null);
    setEditingRecipe(null);
    setNutrientForm({ nutrient_name: '', unit: '', description: '' });
    setFoodForm({
      food_name: '',
      type: '',
      calories: '',
      category: '',
      base_quantity: '',
      base_unit: '',
    });
    setGoalForm({ goal_name: '', description: '' });
    setRecipeForm({
      recipe_name: '',
      cooking_time: '',
      difficulty_level: '',
      instructions: '',
      ingredientsJson: '',
    });
  };

  return (
    <div className="container-fluid mt-5 mb-5">
      <div className="row">
        <div className="col-md-12">
          <h1 className="mb-4">
            <span className="badge bg-danger me-2">ADMIN</span> Control Panel
          </h1>

          {error && (
            <div className="alert alert-danger alert-dismissible fade show" role="alert">
              {error}
              <button type="button" className="btn-close" onClick={() => setError('')}></button>
            </div>
          )}

          {success && (
            <div className="alert alert-success alert-dismissible fade show" role="alert">
              {success}
              <button type="button" className="btn-close" onClick={() => setSuccess('')}></button>
            </div>
          )}

          <ul className="nav nav-tabs mb-4" style={{ flexWrap: 'wrap' }}>
            {['nutrients', 'foods', 'goals', 'recipes', 'users'].map((tab) => (
              <li key={tab} className="nav-item">
                <button
                  className={`nav-link ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              </li>
            ))}
          </ul>

          {/* ============ NUTRIENTS TAB ============ */}
          {activeTab === 'nutrients' && (
            <div className="row">
              <div className="col-lg-5">
                <div className="card">
                  <div className="card-header bg-primary text-white">
                    <h5 className="mb-0">
                      {editingNutrient ? '✏️ Edit Nutrient' : '➕ Add Nutrient'}
                    </h5>
                  </div>
                  <div className="card-body">
                    <form onSubmit={editingNutrient ? handleUpdateNutrient : handleAddNutrient}>
                      <div className="mb-3">
                        <label className="form-label">Nutrient Name *</label>
                        <input
                          type="text"
                          className="form-control"
                          name="nutrient_name"
                          value={nutrientForm.nutrient_name}
                          onChange={handleNutrientChange}
                          placeholder="e.g., Protein"
                          required
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Unit *</label>
                        <input
                          type="text"
                          className="form-control"
                          name="unit"
                          value={nutrientForm.unit}
                          onChange={handleNutrientChange}
                          placeholder="e.g., g, mg"
                          required
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Description</label>
                        <textarea
                          className="form-control"
                          name="description"
                          value={nutrientForm.description}
                          onChange={handleNutrientChange}
                          rows="3"
                        ></textarea>
                      </div>
                      <div className="d-grid gap-2">
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                          {loading ? 'Processing...' : editingNutrient ? 'Update' : 'Add'}
                        </button>
                        {editingNutrient && (
                          <button type="button" className="btn btn-secondary" onClick={handleCancelEdit} disabled={loading}>
                            Cancel
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                </div>
              </div>

              <div className="col-lg-7">
                <div className="card">
                  <div className="card-header bg-info text-white">
                    <h5 className="mb-0">📋 Nutrients ({nutrients.length})</h5>
                  </div>
                  <div className="card-body" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                    {nutrients.length === 0 ? (
                      <p className="text-muted">No nutrients found</p>
                    ) : (
                      <div className="list-group">
                        {nutrients.map((nutrient) => (
                          <div key={nutrient.nutrient_id} className="list-group-item d-flex justify-content-between align-items-start">
                            <div className="flex-grow-1">
                              <h6 className="mb-1">{nutrient.nutrient_name}</h6>
                              <small className="text-muted">{nutrient.unit}</small>
                            </div>
                            <div>
                              <button className="btn btn-sm btn-warning me-2" onClick={() => handleEditNutrient(nutrient)} disabled={loading}>
                                ✏️
                              </button>
                              <button className="btn btn-sm btn-danger" onClick={() => handleDeleteNutrient(nutrient.nutrient_id)} disabled={loading}>
                                🗑️
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============ FOODS TAB ============ */}
          {activeTab === 'foods' && (
            <div className="row">
              <div className="col-lg-5">
                <div className="card">
                  <div className="card-header bg-primary text-white">
                    <h5 className="mb-0">
                      {editingFood ? '✏️ Edit Food' : '➕ Add Food'}
                    </h5>
                  </div>
                  <div className="card-body" style={{ maxHeight: '650px', overflowY: 'auto' }}>
                    <form onSubmit={editingFood ? handleUpdateFood : handleAddFood}>
                      <div className="mb-3">
                        <label className="form-label">Food Name *</label>
                        <input
                          type="text"
                          className="form-control"
                          name="food_name"
                          value={foodForm.food_name}
                          onChange={handleFoodChange}
                          placeholder="e.g., Chicken Breast"
                          required
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Type</label>
                        <input
                          type="text"
                          className="form-control"
                          name="type"
                          value={foodForm.type}
                          onChange={handleFoodChange}
                          placeholder="e.g., Protein, Vegetable"
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Calories *</label>
                        <input
                          type="number"
                          className="form-control"
                          name="calories"
                          value={foodForm.calories}
                          onChange={handleFoodChange}
                          placeholder="e.g., 165"
                          step="0.01"
                          required
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Category</label>
                        <input
                          type="text"
                          className="form-control"
                          name="category"
                          value={foodForm.category}
                          onChange={handleFoodChange}
                          placeholder="e.g., Meat, Dairy"
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Base Quantity *</label>
                        <input
                          type="number"
                          className="form-control"
                          name="base_quantity"
                          value={foodForm.base_quantity}
                          onChange={handleFoodChange}
                          placeholder="e.g., 100"
                          step="0.01"
                          required
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Base Unit *</label>
                        <input
                          type="text"
                          className="form-control"
                          name="base_unit"
                          value={foodForm.base_unit}
                          onChange={handleFoodChange}
                          placeholder="e.g., g, ml"
                          required
                        />
                      </div>
                      <div className="d-grid gap-2">
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                          {loading ? 'Processing...' : editingFood ? 'Update' : 'Add'}
                        </button>
                        {editingFood && (
                          <button type="button" className="btn btn-secondary" onClick={handleCancelEdit} disabled={loading}>
                            Cancel
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                </div>
              </div>

              <div className="col-lg-7">
                <div className="card">
                  <div className="card-header bg-info text-white">
                    <h5 className="mb-0">🍗 Foods ({foods.length})</h5>
                  </div>
                  <div className="card-body" style={{ maxHeight: '650px', overflowY: 'auto' }}>
                    {foods.length === 0 ? (
                      <p className="text-muted">No foods found</p>
                    ) : (
                      <div className="list-group">
                        {foods.map((food) => (
                          <div key={food.food_id} className="list-group-item">
                            <div className="d-flex justify-content-between align-items-start">
                              <div className="flex-grow-1">
                                <h6 className="mb-1">{food.food_name}</h6>
                                <small className="text-muted">
                                  {food.calories} cal | {food.base_quantity} {food.base_unit}
                                  {food.category && ` | ${food.category}`}
                                </small>
                              </div>
                              <div>
                                <button className="btn btn-sm btn-warning me-2" onClick={() => handleEditFood(food)} disabled={loading}>
                                  ✏️
                                </button>
                                <button className="btn btn-sm btn-danger" onClick={() => handleDeleteFood(food.food_id)} disabled={loading}>
                                  🗑️
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============ GOALS TAB ============ */}
          {activeTab === 'goals' && (
            <div className="row">
              <div className="col-lg-5">
                <div className="card">
                  <div className="card-header bg-primary text-white">
                    <h5 className="mb-0">
                      {editingGoal ? '✏️ Edit Goal' : '➕ Add Goal'}
                    </h5>
                  </div>
                  <div className="card-body">
                    <form onSubmit={editingGoal ? handleUpdateGoal : handleAddGoal}>
                      <div className="mb-3">
                        <label className="form-label">Goal Name *</label>
                        <input
                          type="text"
                          className="form-control"
                          name="goal_name"
                          value={goalForm.goal_name}
                          onChange={handleGoalChange}
                          placeholder="e.g., Weight Loss"
                          required
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Description</label>
                        <textarea
                          className="form-control"
                          name="description"
                          value={goalForm.description}
                          onChange={handleGoalChange}
                          placeholder="Describe this goal..."
                          rows="5"
                        ></textarea>
                      </div>
                      <div className="d-grid gap-2">
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                          {loading ? 'Processing...' : editingGoal ? 'Update' : 'Add'}
                        </button>
                        {editingGoal && (
                          <button type="button" className="btn btn-secondary" onClick={handleCancelEdit} disabled={loading}>
                            Cancel
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                </div>
              </div>

              <div className="col-lg-7">
                <div className="card">
                  <div className="card-header bg-info text-white">
                    <h5 className="mb-0">🎯 Goals ({goals.length})</h5>
                  </div>
                  <div className="card-body" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                    {goals.length === 0 ? (
                      <p className="text-muted">No goals found</p>
                    ) : (
                      <div className="list-group">
                        {goals.map((goal) => (
                          <div key={goal.goal_id} className="list-group-item">
                            <div className="d-flex justify-content-between align-items-start">
                              <div className="flex-grow-1">
                                <h6 className="mb-1">{goal.goal_name}</h6>
                                {goal.description && (
                                  <small className="text-muted d-block">{goal.description}</small>
                                )}
                              </div>
                              <div>
                                <button className="btn btn-sm btn-warning me-2" onClick={() => handleEditGoal(goal)} disabled={loading}>
                                  ✏️
                                </button>
                                <button className="btn btn-sm btn-danger" onClick={() => handleDeleteGoal(goal.goal_id)} disabled={loading}>
                                  🗑️
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============ RECIPES TAB ============ */}
          {activeTab === 'recipes' && (
            <div className="row">
              <div className="col-lg-5">
                <div className="card">
                  <div className="card-header bg-primary text-white">
                    <h5 className="mb-0">
                      {editingRecipe ? '✏️ Edit Recipe' : '➕ Add Recipe'}
                    </h5>
                  </div>
                  <div className="card-body" style={{ maxHeight: '750px', overflowY: 'auto' }}>
                    <form onSubmit={editingRecipe ? handleUpdateRecipe : handleAddRecipe}>
                      <div className="mb-3">
                        <label className="form-label">Recipe Name *</label>
                        <input
                          type="text"
                          className="form-control"
                          name="recipe_name"
                          value={recipeForm.recipe_name}
                          onChange={handleRecipeChange}
                          placeholder="e.g., Grilled Chicken Salad"
                          required
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Cooking Time (minutes)</label>
                        <input
                          type="number"
                          className="form-control"
                          name="cooking_time"
                          value={recipeForm.cooking_time}
                          onChange={handleRecipeChange}
                          placeholder="e.g., 30"
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Difficulty Level</label>
                        <select
                          className="form-control"
                          name="difficulty_level"
                          value={recipeForm.difficulty_level}
                          onChange={handleRecipeChange}
                        >
                          <option value="">Select difficulty</option>
                          <option value="Easy">Easy</option>
                          <option value="Medium">Medium</option>
                          <option value="Hard">Hard</option>
                        </select>
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Instructions</label>
                        <textarea
                          className="form-control"
                          name="instructions"
                          value={recipeForm.instructions}
                          onChange={handleRecipeChange}
                          placeholder="Step-by-step instructions..."
                          rows="4"
                        ></textarea>
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Ingredients (JSON) *</label>
                        <textarea
                          className="form-control"
                          name="ingredientsJson"
                          value={recipeForm.ingredientsJson}
                          onChange={handleRecipeChange}
                          placeholder='[{"food_id": 1, "quantity": 100, "unit": "g"}]'
                          rows="4"
                          required
                        ></textarea>
                        <small className="text-muted d-block mt-2">
                          Format: [&#123;"food_id": number, "quantity": number, "unit": "string"&#125;]
                        </small>
                      </div>
                      <div className="d-grid gap-2">
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                          {loading ? 'Processing...' : editingRecipe ? 'Update' : 'Add'}
                        </button>
                        {editingRecipe && (
                          <button type="button" className="btn btn-secondary" onClick={handleCancelEdit} disabled={loading}>
                            Cancel
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                </div>
              </div>

              <div className="col-lg-7">
                <div className="card">
                  <div className="card-header bg-info text-white">
                    <h5 className="mb-0">👨‍🍳 Recipes ({recipes.length})</h5>
                  </div>
                  <div className="card-body" style={{ maxHeight: '750px', overflowY: 'auto' }}>
                    {recipes.length === 0 ? (
                      <p className="text-muted">No recipes found</p>
                    ) : (
                      <div className="list-group">
                        {recipes.map((recipe) => (
                          <div key={recipe.recipe_id} className="list-group-item">
                            <div className="d-flex justify-content-between align-items-start">
                              <div className="flex-grow-1">
                                <h6 className="mb-1">{recipe.recipe_name}</h6>
                                <small className="text-muted d-block">
                                  {recipe.cooking_time && `⏱️ ${recipe.cooking_time} min`}
                                  {recipe.difficulty && ` | 📊 ${recipe.difficulty}`}
                                  {recipe.difficulty_level && ` | 📊 ${recipe.difficulty_level}`}
                                </small>
                                {recipe.ingredients && recipe.ingredients.length > 0 && (
                                  <small className="text-muted d-block">
                                    🛒 {recipe.ingredients.length} ingredient{recipe.ingredients.length !== 1 ? 's' : ''}
                                  </small>
                                )}
                                {recipe.instructions && (
                                  <small className="text-muted d-block mt-1">{recipe.instructions.substring(0, 50)}...</small>
                                )}
                              </div>
                              <div>
                                <button className="btn btn-sm btn-warning me-2" onClick={() => handleEditRecipe(recipe)} disabled={loading}>
                                  ✏️
                                </button>
                                <button className="btn btn-sm btn-danger" onClick={() => handleDeleteRecipe(recipe.recipe_id)} disabled={loading}>
                                  🗑️
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============ USERS TAB ============ */}
          {activeTab === 'users' && (
            <div className="card">
              <div className="card-header bg-success text-white">
                <h5 className="mb-0">👥 Users ({users.length})</h5>
              </div>
              <div className="card-body">
                {users.length === 0 ? (
                  <p className="text-muted">No users found</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-striped table-hover">
                      <thead className="table-light">
                        <tr>
                          <th>ID</th>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Age</th>
                          <th>Gender</th>
                          <th>Role</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user) => (
                          <tr key={user.user_id}>
                            <td>{user.user_id}</td>
                            <td>{user.name}</td>
                            <td>{user.email}</td>
                            <td>{user.age || '-'}</td>
                            <td>{user.gender || '-'}</td>
                            <td>
                              <span className={`badge ${user.role === 'admin' ? 'bg-danger' : 'bg-info'}`}>
                                {user.role}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Admin;
