import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext"; // AuthContext import kiya

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth(); // Context se direct user aur logout function nikal liya

  const handleLogout = () => {
    logout(); // Context ka logout localStorage clear kar dega aur state reset kar dega
    navigate("/login");
  };

  return (
    <div style={{ maxWidth: "600px", margin: "50px auto", padding: "20px", fontFamily: "sans-serif" }}>
      <h1>🎉 Welcome to VendorOS Dashboard</h1>
      
      {user ? (
        <div style={{ background: "#f4f4f4", padding: "15px", borderRadius: "8px", margin: "20px 0" }}>
          <h3>Profile Details:</h3>
          <p><strong>Name:</strong> {user.fullName}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Phone:</strong> {user.phone}</p>
          <p><strong>Status:</strong> <span style={{ color: "green" }}>{user.status}</span></p>
        </div>
      ) : (
        <p>Loading user data...</p>
      )}

      <button 
        onClick={handleLogout} 
        style={{ background: "red", color: "white", border: "none", padding: "10px 15px", cursor: "pointer", borderRadius: "5px" }}
      >
        Logout
      </button>
    </div>
  );
}