import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if it exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  if (user && user !== 'undefined') {
    try {
      const userData = JSON.parse(user);
      if (userData && userData.role) {
        config.headers['x-user-role'] = userData.role;
      }
    } catch (err) {
      console.error('Error parsing user data from localStorage:', err);
      // Clear corrupted data
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    }
  }
  
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Token expired or unauthorized - clear storage and redirect
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
};

// Meal endpoints
export const mealAPI = {
  addMeal: (data) => api.post('/meals/add', data),
  getMeals: (userId) => api.get(`/meals/${userId}`),
  getDailyCalories: (userId) => api.get(`/meals/daily/${userId}`),
  deleteMeal: (mealId) => api.delete(`/meals/${mealId}`),
};

// Food endpoints
export const foodAPI = {
  getAllFood: () => api.get('/food'),
  searchFood: (query) => api.get(`/food/search?name=${query}`),
  getFood: (id) => api.get(`/food/${id}`),
};

// Recipe endpoints
export const recipeAPI = {
  getAllRecipes: () => api.get('/recipes'),
  getRecipesWithCalories: () => api.get('/recipes/calories'),
  getRecipe: (id) => api.get(`/recipes/${id}`),
  createRecipe: (data) => api.post('/recipes', data),
};

// Goal endpoints
export const goalAPI = {
  getAllGoals: () => api.get('/goals'),
  getUserGoals: (userId) => api.get(`/goals/user/${userId}`),
  setGoal: (data) => api.post('/goals', data),
  updateGoal: (id, data) => api.put(`/goals/${id}`, data),
  clearUserGoals: (userId) => api.delete(`/goals/user/${userId}`),
  removeUserGoal: (userId, goalId) => api.delete(`/goals/user/${userId}/${goalId}`),
};

// User endpoints
export const userAPI = {
  getProfile: (userId) => api.get(`/users/${userId}`),
  updateProfile: (userId, data) => api.put(`/users/${userId}`, data),
};

// Nutrients endpoints
export const nutrientAPI = {
  getAllNutrients: () => api.get('/nutrients'),
  getNutrients: (foodId) => api.get(`/nutrients/food/${foodId}`),
  getGoalNutrients: (goalId) => api.get(`/nutrients/goal/${goalId}`),
};

// Recommendation endpoints
export const recommendAPI = {
  getRecommendations: (userId) => api.get(`/recommend/${userId}`),
  getRecommendedNutrients: (userId) => api.get(`/recommend/${userId}/nutrients`),
  getRecommendedFoods: (userId) => api.get(`/recommend/${userId}/foods`),
  getRecommendedRecipes: (userId) => api.get(`/recommend/${userId}/recipes`),
  applyRecommendations: (userId) => api.post(`/recommend/${userId}/apply`),
};

// Allergy endpoints
export const allergyAPI = {
  getUserAllergies: (userId) => api.get(`/allergies/${userId}`),
  addAllergy: (userId, allergyName) => api.post(`/allergies/${userId}`, { allergy_name: allergyName }),
  removeAllergy: (userId, allergyName) => api.delete(`/allergies/${userId}/${allergyName}`),
};

// Admin endpoints
export const adminAPI = {
  // Nutrients
  addNutrient: (data) => api.post('/admin/nutrient', data),
  updateNutrient: (nutrientId, data) => api.put(`/admin/nutrient/${nutrientId}`, data),
  deleteNutrient: (nutrientId) => api.delete(`/admin/nutrient/${nutrientId}`),
  // Foods
  addFood: (data) => api.post('/admin/food', data),
  updateFood: (foodId, data) => api.put(`/admin/food/${foodId}`, data),
  deleteFood: (foodId) => api.delete(`/admin/food/${foodId}`),
  linkNutrients: (foodId, data) => api.post(`/admin/food/${foodId}/nutrients`, data),
  // Recipes
  addRecipe: (data) => api.post('/admin/recipe', data),
  updateRecipe: (recipeId, data) => api.put(`/admin/recipe/${recipeId}`, data),
  deleteRecipe: (recipeId) => api.delete(`/admin/recipe/${recipeId}`),
  // Goals
  addGoal: (data) => api.post('/admin/goal', data),
  updateGoal: (goalId, data) => api.put(`/admin/goal/${goalId}`, data),
  deleteGoal: (goalId) => api.delete(`/admin/goal/${goalId}`),
  // Users
  getAllUsers: () => api.get('/admin/users'),
  // Get all foods (for admin to manage)
  getAllFoods: () => api.get('/food'),
  // Get all goals (master list for admin to manage)
  getAllGoals: () => api.get('/goals'),
  // Get all recipes (for admin to manage)
  getAllRecipes: () => api.get('/recipes'),
};

export default api;
