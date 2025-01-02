import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import SessionExpiredModal from "./components/modals/SessionExpiredModal";
import Dashboard from "./pages/Dashboard";
import Recommendations from "./pages/Recommendations";
import CreateIdea from "./pages/CreateIdea";
import EditIdea from "./pages/EditIdea";
import ViewIdea from "./pages/ViewIdea";
import Layout from "./components/layout/Layout";
import { AuthProvider, useAuth } from "./context/AuthContext";

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Layout>
        {children}
        {!isAuthenticated && <SessionExpiredModal />}
      </Layout>
    </>
  );
};

// Routes component - wrapped by AuthProvider
const AppRoutes = () => {
  return (
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
        path="/recommendations"
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
      <Route
        path="/ideas/:ideaId/edit"
        element={
          <ProtectedRoute>
            <EditIdea />
          </ProtectedRoute>
        }
      />
      <Route
        path="/create"
        element={
          <ProtectedRoute>
            <CreateIdea />
          </ProtectedRoute>
        }
      />

      {/* Protected routes with Layout */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
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
