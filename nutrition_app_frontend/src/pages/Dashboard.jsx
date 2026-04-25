import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { mealAPI, goalAPI } from '../services/api';

function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [meals, setMeals] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && user?.user_id) {
      fetchData();
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [user?.user_id, authLoading]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      const [mealsResult, goalsResult] = await Promise.allSettled([
        mealAPI.getMeals(user.user_id),
        goalAPI.getUserGoals(user.user_id),
      ]);

      if (mealsResult.status === 'fulfilled') {
        setMeals(mealsResult.value.data || []);
      } else {
        console.error('Dashboard meal fetch failed:', mealsResult.reason);
        setMeals([]);
      }

      if (goalsResult.status === 'fulfilled') {
        setGoals(goalsResult.value.data || []);
      } else {
        console.error('Dashboard goals fetch failed:', goalsResult.reason);
        setGoals([]);
      }

      if (mealsResult.status === 'rejected' || goalsResult.status === 'rejected') {
        setError('Failed to load some dashboard data');
      }
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard fetch error:', err);
      setMeals([]);
      setGoals([]);
    } finally {
      setLoading(false);
    }
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
          Please log in to view your dashboard.
        </div>
      </div>
    );
  }

  return (
    <div className="container-main">
      <h1 className="mb-4">Welcome, {user?.name}! 👋</h1>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <div className="row mb-4">
        <div className="col-md-6 mb-3">
          <div className="card card-custom">
            <div className="card-body">
              <h5 className="card-title">Today's Meals</h5>
              <p className="card-text display-4">{meals.length}</p>
              <small className="text-muted">meals logged</small>
            </div>
          </div>
        </div>

        <div className="col-md-6 mb-3">
          <div className="card card-custom">
            <div className="card-body">
              <h5 className="card-title">Active Goals</h5>
              <p className="card-text display-4">{goals.length}</p>
              <small className="text-muted">goals set</small>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-md-6">
          <div className="card card-custom mb-3">
            <div className="card-header bg-success text-white">
              <h5 className="mb-0">Personal Info</h5>
            </div>
            <div className="card-body">
              <p><strong>Name:</strong> {user?.name}</p>
              <p><strong>Email:</strong> {user?.email}</p>
              <p><strong>Age:</strong> {user?.age || 'N/A'} years</p>
              <p><strong>Height:</strong> {user?.height || 'N/A'} cm</p>
              <p><strong>Weight:</strong> {user?.weight || 'N/A'} kg</p>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card card-custom">
            <div className="card-header bg-info text-white">
              <h5 className="mb-0">Quick Actions</h5>
            </div>
            <div className="card-body">
              <a href="/meals" className="btn btn-outline-primary btn-sm w-100 mb-2">
                Log a Meal
              </a>
              <a href="/recipes" className="btn btn-outline-primary btn-sm w-100 mb-2">
                Browse Recipes
              </a>
              <a href="/goals" className="btn btn-outline-primary btn-sm w-100 mb-2">
                Set Goals
              </a>
              <a href="/profile" className="btn btn-outline-primary btn-sm w-100">
                Edit Profile
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
