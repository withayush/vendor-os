import React from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem("accessToken");

  // Agar token nahi hai, toh login page par bhej do
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Agar token hai, toh component render karo
  return children;
}