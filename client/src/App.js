import React from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import SessionExpiredModal from "./components/modals/SessionExpiredModal";
import Dashboard from "./pages/Dashboard";
import Recommendations from "./pages/Recommendations";
import CreateIdea from "./pages/CreateIdea";
import ViewIdea from "./pages/ViewIdea";
import Layout from "./components/layout/Layout";
import { AuthProvider, useAuth } from "./context/AuthContext";

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    // Use navigate for programmatic navigation
    navigate('/', { replace: true });
    return null;
  }

  return children;
};

// Routes component - wrapped by AuthProvider
const AppRoutes = () => {
  const { isTokenExpired } = useAuth();

  return (
    <>
      <Routes>
        {/* Public routes with Layout */}
        <Route
          path="/"
          element={
            <Layout>
              <Recommendations />
            </Layout>
          }
        />
        <Route
          path="/ideas/:ideaId"
          element={
            <Layout>
              <ViewIdea />
            </Layout>
          }
        />

        {/* Protected routes with Layout */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/create"
          element={
            <ProtectedRoute>
              <Layout>
                <CreateIdea />
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>

      {/* Show session expired modal when token is expired */}
      {isTokenExpired &&<Layout><SessionExpiredModal /></Layout> }
    </>
  );
};

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
};

export default App;
