import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { goalAPI } from '../services/api';

function Goals() {
  const { user } = useAuth();
  const [userGoals, setUserGoals] = useState([]);
  const [allGoals, setAllGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState('');

  useEffect(() => {
    if (user?.user_id) {
      fetchData();
    }
  }, [user?.user_id]);

  const fetchData = async () => {
    if (!user?.user_id) return;
    try {
      setLoading(true);
      setError('');
      const [userGoalsRes, allGoalsRes] = await Promise.all([
        goalAPI.getUserGoals(user.user_id),
        goalAPI.getAllGoals(),
      ]);
      setUserGoals(userGoalsRes.data || []);
      setAllGoals(allGoalsRes.data || []);
      setSelectedGoal('');
    } catch (err) {
      setError('Failed to load goals');
      console.error('Failed to load goals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await goalAPI.setGoal({
        user_id: user?.user_id,
        goal_id: parseInt(selectedGoal),
      });
      setSelectedGoal('');
      setShowForm(false);
      fetchData();
    } catch (err) {
      setError('Failed to set goal');
      console.error('Failed to set goal:', err);
    }
  };

  const handleClearGoal = async (goalId) => {
    if (!user?.user_id || !goalId) return;
    try {
      await goalAPI.removeUserGoal(user.user_id, goalId);
      fetchData();
    } catch (err) {
      setError('Failed to clear goal');
      console.error('Failed to clear goal:', err);
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
        <h1>My Goals</h1>
        <button
          className="btn btn-success"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : '+ New Goal'}
        </button>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {showForm && (
        <div className="card card-custom mb-4 p-4">
          <h5 className="mb-3">Set a New Goal</h5>
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="goal_id" className="form-label">Select Goal</label>
              <select
                className="form-select"
                id="goal_id"
                value={selectedGoal}
                onChange={(e) => setSelectedGoal(e.target.value)}
                required
              >
                <option value="">Choose a goal...</option>
                {allGoals.map(goal => (
                  <option key={goal.goal_id} value={goal.goal_id}>
                    {goal.goal_name} - {goal.description}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn btn-success">
              Set Goal
            </button>
          </form>
        </div>
      )}

      <div className="row">
        {userGoals.length === 0 ? (
          <div className="col-12">
            <div className="alert alert-info">
              No goals set yet. Click "+ New Goal" to create one!
            </div>
          </div>
        ) : (
          userGoals.map(goal => (
            <div key={goal.goal_id} className="col-md-6 mb-3">
              <div className="card card-custom">
                <div className="card-body">
                  <h5 className="card-title">{goal.goal_name}</h5>
                  <p className="text-muted">{goal.description}</p>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleClearGoal(goal.goal_id)}
                  >
                    Remove Goal
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

export default Goals;

