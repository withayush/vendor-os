import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// 1. Sirf logged-in users ke liye (Jaise Dashboard)
export function ProtectedRoute({ children }) {
  const { isAuthenticated, hasBusiness, loading } = useAuth();

  if (loading) {
    return <div style={{ textAlign: "center", marginTop: "100px" }}>Loading security context...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Agar user logged in hai lekin business onboarding complete nahi hai, toh use wahan bhej do
  if (!hasBusiness) {
    return <Navigate to="/business-onboarding" replace />;
  }

  return children;
}

// 2. Sirf Onboarding ke liye route guard
export function OnboardingRoute({ children }) {
  const { isAuthenticated, hasBusiness, loading } = useAuth();

  if (loading) {
    return <div style={{ textAlign: "center", marginTop: "100px" }}>Loading security context...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Agar business pehle se bani hui hai, toh onboarding bar-bar kholne ki zaroorat nahi, seedha dashboard bhejo
  if (hasBusiness) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}