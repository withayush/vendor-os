import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { loginUser } from "../services/auth.api";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth(); // AuthContext ka login function

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await loginUser(form);
      console.log("Login Success:", response);

      const { accessToken, refreshToken, account, vendor } = response.data;
      
      // AuthContext handle karega localStorage mein tokens/user save karna aur state update karna
      login(account, accessToken, refreshToken);
      
      // Agar vendor profile bhi aayi hai toh use bhi save kar lete hain
      if (vendor) {
        localStorage.setItem("vendor", JSON.stringify(vendor));
      }

      alert("Login successful! Redirecting to Dashboard...");
      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.message || "Invalid email or password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "50px auto", padding: "20px" }}>
      <h2>VendorOS - Login</h2>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "15px" }}>
        <input
          name="email"
          type="email"
          placeholder="Email Address"
          value={form.email}
          onChange={handleChange}
          required
        />
        
        <input
          name="password"
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          required
        />

        {error && <p style={{ color: "red", fontSize: "14px" }}>{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      <p style={{ marginTop: "15px", fontSize: "14px" }}>
        Don't have an account? <Link to="/register">Register here</Link>
      </p>
    </div>
  );
}