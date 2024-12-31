import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import WelcomePage from "./pages/WelcomePage";
import Dashboard from "./pages/Dashboard";
import Recommendations from "./pages/Recommendations";
import CreateIdea from "./pages/CreateIdea";
import ViewIdea from "./pages/ViewIdea";
import Layout from "./components/layout/Layout";
import { AuthProvider, useAuth } from "./context/AuthContext";

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  console.log('ProtectedRoute - Auth State:', { isAuthenticated, isLoading, user });

  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  if (!isAuthenticated) {
    console.log('Not authenticated, redirecting to root');
    return <Navigate to="/" replace />;
  }
  
  return children;
};

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route
            path="/"
            element={
              <WelcomePage />
            }
          />
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
            path="/recommendations"
            element={
              <ProtectedRoute>
                <Layout>
                  <Recommendations />
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
          <Route
            path="/ideas/:ideaId"
            element={
              <Layout>
                <ProtectedRoute>
                  <ViewIdea />
                </ProtectedRoute>
              </Layout>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
