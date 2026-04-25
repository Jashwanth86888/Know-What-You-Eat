import React, { useState, useEffect } from 'react';
import { recipeAPI } from '../services/api';

function Recipes() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  useEffect(() => {
    fetchRecipes();
  }, []);

  const fetchRecipes = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await recipeAPI.getAllRecipes();
      setRecipes(response.data);
    } catch (err) {
      setError('Failed to load recipes');
      console.error('Failed to load recipes:', err);
    } finally {
      setLoading(false);
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
      <h1 className="mb-4">Healthy Recipes</h1>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {selectedRecipe && (
        <div className="card card-custom mb-4">
          <div className="card-header bg-success text-white d-flex justify-content-between align-items-center">
            <h5 className="mb-0">{selectedRecipe.recipe_name}</h5>
            <button
              className="btn btn-sm btn-outline-light"
              onClick={() => setSelectedRecipe(null)}
            >
              Close
            </button>
          </div>
          <div className="card-body">
            <h6>Ingredients:</h6>
            {Array.isArray(selectedRecipe.ingredients) ? (
              <ul className="text-muted">
                {selectedRecipe.ingredients.map((ing, idx) => (
                  <li key={idx}>
                    {ing.food_name} - {ing.quantity} {ing.unit}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">{selectedRecipe.ingredients}</p>
            )}
            <h6>Instructions:</h6>
            <p className="text-muted">{selectedRecipe.instructions}</p>
            <p>
              <strong>Cooking Time:</strong> {selectedRecipe.cooking_time || selectedRecipe.prep_time} minutes
            </p>
            <p>
              <strong>Difficulty:</strong> {selectedRecipe.difficulty_level || 'N/A'}
            </p>
            <p>
              <strong>Total Calories:</strong> {selectedRecipe.total_calories} cal
            </p>
          </div>
        </div>
      )}

      <div className="row">
        {recipes.length === 0 ? (
          <div className="col-12">
            <div className="alert alert-info">
              No recipes available yet.
            </div>
          </div>
        ) : (
          recipes.map(recipe => (
            <div key={recipe.recipe_id} className="col-md-4 mb-4">
              <div
                className="card card-custom h-100 cursor-pointer"
                onClick={() => setSelectedRecipe(recipe)}
                style={{ cursor: 'pointer' }}
              >
                <div className="card-body">
                  <h5 className="card-title">{recipe.recipe_name}</h5>
                  <p className="card-text text-muted">
                    {recipe.instructions?.substring(0, 60)}...
                  </p>
                  <p className="text-sm">
                    <span className="badge bg-info me-2">
                      {recipe.cooking_time || recipe.prep_time || 'N/A'} min
                    </span>
                    <span className="badge bg-secondary">
                      {recipe.total_calories ?? 'N/A'} cal
                    </span>
                  </p>
                  <button className="btn btn-sm btn-success">
                    View Details
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

export default Recipes;
