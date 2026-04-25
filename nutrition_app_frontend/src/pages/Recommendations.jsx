import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { recommendAPI } from '../services/api';

function Recommendations() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('nutrients');
  const [nutrients, setNutrients] = useState([]);
  const [foods, setFoods] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && user?.user_id) {
      fetchAllData();
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [user?.user_id, authLoading]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError('');

      const [nutrientsResult, foodsResult, recipesResult] = await Promise.allSettled([
        recommendAPI.getRecommendedNutrients(user.user_id),
        recommendAPI.getRecommendedFoods(user.user_id),
        recommendAPI.getRecommendedRecipes(user.user_id),
      ]);

      if (nutrientsResult.status === 'fulfilled') {
        setNutrients(nutrientsResult.value.data?.nutrients || []);
        setGoal(nutrientsResult.value.data?.goal || '');
      }

      if (foodsResult.status === 'fulfilled') {
        setFoods(foodsResult.value.data?.foods || []);
      }

      if (recipesResult.status === 'fulfilled') {
        setRecipes(recipesResult.value.data?.recipes || []);
      }

      if (nutrientsResult.status === 'rejected' && 
          foodsResult.status === 'rejected' && 
          recipesResult.status === 'rejected') {
        const errorMsg = nutrientsResult.reason?.response?.data?.error || 
                        foodsResult.reason?.response?.data?.error || 
                        recipesResult.reason?.response?.data?.error || 
                        'Failed to load recommendations';
        setError(errorMsg);
      }
    } catch (err) {
      setError('Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  const getImportanceBadge = (importance) => {
    const colors = {
      high: 'bg-danger',
      medium: 'bg-warning',
      low: 'bg-secondary'
    };
    return (
      <span className={`badge ${colors[importance] || 'bg-secondary'}`}>
        {importance?.toUpperCase() || 'N/A'}
      </span>
    );
  };

  const getDifficultyBadge = (difficulty) => {
    const colors = {
      'Easy': 'bg-success',
      'Medium': 'bg-warning',
      'Hard': 'bg-danger'
    };
    return (
      <span className={`badge ${colors[difficulty] || 'bg-secondary'}`}>
        {difficulty || 'N/A'}
      </span>
    );
  };

  if (authLoading || loading) {
    return (
      <div className="container-main text-center">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container-main">
        <div className="alert alert-warning">
          Please log in to view your recommendations.
        </div>
      </div>
    );
  }

  return (
    <div className="container-main">
      <h1 className="mb-4">Personalized Recommendations</h1>
      
      {goal && (
        <div className="alert alert-info mb-4">
          <strong>Your Goal:</strong> {goal}
        </div>
      )}

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {/* Tabs */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'nutrients' ? 'active' : ''}`}
            onClick={() => setActiveTab('nutrients')}
          >
            💊 Recommend Nutrients
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'foods' ? 'active' : ''}`}
            onClick={() => setActiveTab('foods')}
          >
            🍎 Recommend Foods
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'recipes' ? 'active' : ''}`}
            onClick={() => setActiveTab('recipes')}
          >
            🍳 Recommend Recipes
          </button>
        </li>
      </ul>

      {/* Nutrients Tab */}
      {activeTab === 'nutrients' && (
        <div className="tab-content">
          <h4 className="mb-3">Focus Nutrients for Your Goal</h4>
          {nutrients.length === 0 ? (
            <div className="alert alert-info">
              No nutrient recommendations available. Please set a goal first.
            </div>
          ) : (
            <div className="row">
              {nutrients.map((nutrient, idx) => (
                <div key={idx} className="col-md-6 mb-3">
                  <div className="card card-custom h-100">
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-start">
                        <h5 className="card-title">{nutrient.nutrient_name}</h5>
                        {getImportanceBadge(nutrient.importance_level)}
                      </div>
                      <p className="card-text text-muted mb-1">
                        <strong>Unit:</strong> {nutrient.unit}
                      </p>
                      {nutrient.description && (
                        <p className="card-text small text-muted">
                          {nutrient.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Foods Tab */}
      {activeTab === 'foods' && (
        <div className="tab-content">
          <h4 className="mb-3">Recommended Foods for Your Goal</h4>
          {foods.length === 0 ? (
            <div className="alert alert-info">
              No food recommendations available. Please set a goal first.
            </div>
          ) : (
            <div className="row">
              {foods.map((food, idx) => (
                <div key={idx} className="col-md-6 mb-3">
                  <div className="card card-custom h-100">
                    <div className="card-body">
                      <h5 className="card-title">{food.food_name}</h5>
                      <p className="card-text">
                        <span className="badge bg-primary me-2">{food.category}</span>
                        <span className="badge bg-secondary me-2">{food.type}</span>
                      </p>
                      <p className="card-text">
                        <strong>Calories:</strong> {food.calories} cal
                        <br />
                        <small className="text-muted">
                          Serving: {food.base_quantity} {food.base_unit}
                        </small>
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recipes Tab */}
      {activeTab === 'recipes' && (
        <div className="tab-content">
          <h4 className="mb-3">Recommended Recipes for Your Goal</h4>
          {recipes.length === 0 ? (
            <div className="alert alert-info">
              No recipe recommendations available. Please set a goal first.
            </div>
          ) : (
            <div className="row">
              {recipes.map((recipe, idx) => (
                <div key={idx} className="col-md-6 mb-3">
                  <div className="card card-custom h-100">
                    <div className="card-body">
                      <h5 className="card-title">{recipe.recipe_name}</h5>
                      <p className="card-text">
                        <span className="badge bg-info me-2">
                          {recipe.cooking_time} min
                        </span>
                        {getDifficultyBadge(recipe.difficulty_level)}
                      </p>
                      <p className="card-text">
                        <strong>Total Calories:</strong> {recipe.total_calories} cal
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Recommendations;