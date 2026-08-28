import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getMyBusiness } from "../services/business.api";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const [business, setBusiness] = useState(null);
  const [loadingBusiness, setLoadingBusiness] = useState(true);

  useEffect(() => {
    const fetchBusiness = async () => {
      try {
        const response = await getMyBusiness();
        console.log("Dashboard API Response:", response);
        
        // Response se safely business data nikal lo chahe wo kisi bhi format mein aaye
        const businessData = response.data?.business || response.data;

        if (businessData && (businessData.id || businessData.business_name)) {
          setBusiness(businessData);
        } else {
          // Agar data nahi hai, tabhi onboarding par bhejo
          navigate("/business-onboarding", { replace: true });
        }
      } catch (err) {
        console.error("Dashboard Fetch Business Error:", err);
        // Agar 404 (Business not found) aaye, tabhi onboarding par bhejo
        if (err.response?.status === 404) {
          navigate("/business-onboarding", { replace: true });
        }
      } finally {
        setLoadingBusiness(false);
      }
    };

    fetchBusiness();
  }, [navigate]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  if (loadingBusiness) {
    return (
      <div style={{ textAlign: "center", marginTop: "100px", fontFamily: "sans-serif" }}>
        <h2>Loading your VendorOS workspace...</h2>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "600px", margin: "50px auto", padding: "20px", fontFamily: "sans-serif", background: "#f9f9f9", borderRadius: "8px", border: "1px solid #ddd" }}>
      <h1>🎉 Welcome to VendorOS Dashboard</h1>
      
      {user && (
        <div style={{ background: "#ffffff", padding: "15px", borderRadius: "8px", margin: "20px 0", border: "1px solid #eee" }}>
          <h3>User Profile:</h3>
          <p><strong>Name:</strong> {user.fullName}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Phone:</strong> {user.phone}</p>
        </div>
      )}

      {business ? (
        <div style={{ background: "#e8f5e9", padding: "15px", borderRadius: "8px", margin: "20px 0", border: "1px solid #c8e6c9" }}>
          <h3 style={{ color: "#2e7d32", marginTop: 0 }}>🏢 Business Profile (Root Tenant Entity)</h3>
          <p><strong>Business Name:</strong> {business.business_name}</p>
          <p><strong>Type:</strong> {business.business_type} ({business.category || "General"})</p>
          <p><strong>Phone:</strong> {business.business_phone}</p>
          <p><strong>Address:</strong> {business.address_line}, {business.city}, {business.state} - {business.pincode}</p>
        </div>
      ) : (
        <div style={{ background: "#fff3cd", padding: "15px", borderRadius: "8px", margin: "20px 0", border: "1px solid #ffeeba" }}>
          <p>No business profile linked to your account.</p>
          <button 
            onClick={() => navigate("/business-onboarding")} 
            style={{ background: "#ffc107", border: "none", padding: "8px 15px", cursor: "pointer", borderRadius: "4px", fontWeight: "bold" }}
          >
            Complete Onboarding Now
          </button>
        </div>
      )}

      <button 
        onClick={handleLogout} 
        style={{ background: "#d32f2f", color: "white", border: "none", padding: "10px 15px", cursor: "pointer", borderRadius: "5px", fontWeight: "bold" }}
      >
        Logout
      </button>
    </div>
  );
}