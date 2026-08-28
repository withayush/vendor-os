import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute, OnboardingRoute } from "./routes/ProtectedRoute";

import Register from "./pages/Register";
import VerifyOTP from "./pages/VerifyOTP";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import BusinessOnboarding from "./pages/business/BusinessOnboarding";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          {/* Public Auth Routes */}
          <Route path="/register" element={<Register />} />
          <Route path="/verify-otp" element={<VerifyOTP />} />
          <Route path="/login" element={<Login />} />

          {/* Onboarding Route (Accessible only if business is NOT created yet) */}
          <Route
            path="/business-onboarding"
            element={
              <OnboardingRoute>
                <BusinessOnboarding />
              </OnboardingRoute>
            }
          />

          {/* Protected Dashboard Route (Accessible only if authenticated AND business is created) */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Fallback 404 */}
          <Route path="*" element={<h2>404 - Page Not Found</h2>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}