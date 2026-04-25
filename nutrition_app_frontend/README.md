# Know What You Eat - Frontend

A modern React frontend for the nutrition tracking application.

## Features

- **User Authentication**: Sign up and login with secure credentials
- **Dashboard**: Overview of meals and goals
- **Meal Logging**: Log daily meals with quantities
- **Recipe Browser**: Browse and view healthy recipes
- **Goal Setting**: Set and track nutrition goals
- **Profile Management**: Manage user profile and health information
- **Responsive Design**: Bootstrap-based responsive UI

## Tech Stack

- React 18
- Vite
- React Router DOM v6
- Axios for API calls
- Bootstrap 5
- Chart.js for data visualization

## Installation

1. Navigate to the frontend directory:
```bash
cd nutrition_app_frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The application will run on `http://localhost:3001`

## Backend API

Make sure your backend is running on `http://localhost:3000`

### Available Endpoints

- **Auth**: `/auth/signup`, `/auth/login`
- **Meals**: `/meals/add`, `/meals/user/:id`, `/meals/:id`
- **Food**: `/food/all`, `/food/search`, `/food/:id`
- **Recipes**: `/recipes/all`, `/recipes/:id`, `/recipes/create`
- **Goals**: `/goals/user/:id`, `/goals/set`, `/goals/:id`
- **Users**: `/users/:id`, `/users/:id` (update)
- **Nutrients**: `/nutrients/food/:id`, `/nutrients/user/:id`
- **Allergies**: `/allergies/user/:id`, `/allergies/add`, `/allergies/:id`

## Project Structure

```
src/
├── components/        # Reusable components (Navbar, ProtectedRoute)
├── context/          # React context (AuthContext)
├── pages/            # Page components (Home, Login, Dashboard, etc.)
├── services/         # API service (axios instance and endpoints)
├── App.jsx           # Main app component with routing
├── main.jsx          # Entry point
└── index.css         # Global styles
```

## Pages

- **Home** (`/`): Landing page
- **Login** (`/login`): User login
- **Signup** (`/signup`): User registration
- **Dashboard** (`/dashboard`): User dashboard (protected)
- **Meals** (`/meals`): Log and view meals (protected)
- **Recipes** (`/recipes`): Browse recipes (protected)
- **Goals** (`/goals`): Set and track goals (protected)
- **Profile** (`/profile`): Manage user profile (protected)

## Build for Production

```bash
npm run build
```

The production-ready files will be in the `dist/` directory.

## Environment Setup

Create a `.env` file in the root directory if you need to customize the API URL:

```
VITE_API_URL=http://localhost:3000
```

## Future Enhancements

- [ ] Nutrition analytics with charts
- [ ] Social features (share meals, challenges)
- [ ] Mobile app version
- [ ] Advanced filtering and search
- [ ] Export nutrition reports
- [ ] Integration with fitness trackers
