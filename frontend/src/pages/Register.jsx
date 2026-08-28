import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerUser } from "../services/auth.api";

export default function Register() {
  const navigate = useNavigate();

  // Form inputs ka state
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Jab bhi user input type karega, state update hogi
  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  // Jab user submit button dabayega
  const handleSubmit = async (e) => {
    e.preventDefault(); // Page refresh hone se rokta hai
    setLoading(true);
    setError("");

    try {
      // Backend ko data bheja
      const response = await registerUser(form);
      console.log("Registration Success:", response);

      // 👉 Backend response se debugOtp nikal lo (response.data ke andar hota hai)
      const debugOtp = response.data?.debugOtp;

      // Successfully register hone ke baad user ko OTP page par bhej do
      // Saath mein phone aur debugOtp state pass kar rahe hain
      navigate("/verify-otp", {
        state: { 
          phone: form.phone,
          debugOtp: debugOtp 
        },
      });
    } catch (err) {
      // Backend se jo error aayega, wo yahan catch hoga
      setError(
        err.response?.data?.message || "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "50px auto", padding: "20px" }}>
      <h2>VendorOS - Create Account</h2>
      
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <input
          name="fullName"
          placeholder="Full Name"
          value={form.fullName}
          onChange={handleChange}
          required
        />
        <input
          name="email"
          type="email"
          placeholder="Email Address"
          value={form.email}
          onChange={handleChange}
          required
        />
        <input
          name="phone"
          placeholder="Phone Number (e.g., 8955745484)"
          value={form.phone}
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
          {loading ? "Creating Account..." : "Register"}
        </button>
      </form>

      <p style={{ marginTop: "15px" }}>
        Already have an account? <Link to="/login">Login here</Link>
      </p>
    </div>
  );
}