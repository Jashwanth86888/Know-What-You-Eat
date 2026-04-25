import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="container-main">
      <div className="row align-items-center min-vh-100">
        <div className="col-md-6">
          <h1 className="display-4 fw-bold mb-4">Know What You Eat</h1>
          <p className="lead mb-4">
            Track your nutrition, manage your diet, and achieve your health goals with our comprehensive nutrition tracking app.
          </p>
          <p className="text-muted mb-4">
            Monitor calories, macronutrients, and micronutrients. Get personalized recommendations and manage your dietary restrictions.
          </p>
          {!isAuthenticated ? (
            <div className="d-flex gap-3">
              <Link to="/signup" className="btn btn-success btn-lg">
                Get Started
              </Link>
              <Link to="/login" className="btn btn-outline-success btn-lg">
                Sign In
              </Link>
            </div>
          ) : (
            <Link to="/dashboard" className="btn btn-success btn-lg">
              Go to Dashboard
            </Link>
          )}
        </div>
        <div className="col-md-6">
          <div className="text-center">
            <div style={{ fontSize: '200px' }}>🥗</div>
            <p className="fs-5 text-muted mt-3">Nutrition Intelligence at Your Fingertips</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
