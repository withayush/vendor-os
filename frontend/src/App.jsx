import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute, OnboardingRoute } from "./routes/ProtectedRoute";

import Register from "./pages/Register";
import VerifyOTP from "./pages/VerifyOTP";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ProductsPage from "./pages/ProductsPage";
import InventoryAuditPage from "./pages/InventoryAuditPage";
import POSTerminalPage from "./pages/POSTerminalPage";
import CustomersPage from "./pages/CustomersPage";
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

          {/* Onboarding Route */}
          <Route
            path="/business-onboarding"
            element={
              <OnboardingRoute>
                <BusinessOnboarding />
              </OnboardingRoute>
            }
          />

          {/* Protected Dashboard Route */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Protected Products Route */}
          <Route
            path="/products"
            element={
              <ProtectedRoute>
                <ProductsPage />
              </ProtectedRoute>
            }
          />

          {/* Protected Inventory Audit Route */}
          <Route
            path="/inventory"
            element={
              <ProtectedRoute>
                <InventoryAuditPage />
              </ProtectedRoute>
            }
          />

          {/* Protected POS Route */}
          <Route
            path="/pos"
            element={
              <ProtectedRoute>
                <POSTerminalPage />
              </ProtectedRoute>
            }
          />

          {/* Protected Customers Route */}
          <Route
            path="/customers"
            element={
              <ProtectedRoute>
                <CustomersPage />
              </ProtectedRoute>
            }
          />

          {/* Fallback 404 */}
          <Route path="*" element={
            <div className="min-h-screen flex items-center justify-center bg-background">
              <div className="text-center glass-card p-12 rounded-2xl max-w-md">
                <h1 className="text-6xl font-bold gradient-text mb-4">404</h1>
                <p className="text-muted-foreground">Page Not Found</p>
                <a href="/login" className="mt-6 inline-block text-primary hover:text-primary/80">
                  Go Back Home
                </a>
              </div>
            </div>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}