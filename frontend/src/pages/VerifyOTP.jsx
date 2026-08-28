import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { verifyOTP, resendOTP } from "../services/auth.api";

export default function VerifyOTP() {
  const navigate = useNavigate();
  const location = useLocation();

  // Register page se jo phone aur debugOtp pass hua tha, use yahan state se nikal lenge
  const phoneFromRegister = location.state?.phone || "";
  const initialDebugOtp = location.state?.debugOtp || "";

  const [phone, setPhone] = useState(phoneFromRegister);
  const [otp, setOtp] = useState("");
  const [debugOtp, setDebugOtp] = useState(initialDebugOtp); // Screen par show karne ke liye state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Jab user "Verify OTP" button dabayega
  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      // Backend ko phone aur otp bhejenge
      const response = await verifyOTP({ phone, otp });
      console.log("Verification Success:", response);

      alert("Phone verified successfully! Account is now active.");
      
      // Verify hone ke baad user ko Login page par bhej denge
      navigate("/login");
    } catch (err) {
      setError(
        err.response?.data?.message || "Invalid OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Agar OTP dobara bhejna ho (Resend OTP)
  const handleResend = async () => {
    setError("");
    setMessage("");

    try {
      const response = await resendOTP({ phone });
      setMessage("New OTP sent successfully!");
      
      // Resend karne par agar naya debugOtp aaye toh use bhi update kar do
      if (response.data?.debugOtp) {
        setDebugOtp(response.data.debugOtp);
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to resend OTP. Try again later."
      );
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "50px auto", padding: "20px" }}>
      <h2>Verify Your Phone</h2>
      <p style={{ fontSize: "14px", color: "#666" }}>
        Enter the 6-digit verification code sent to your phone number.
      </p>

      {/* 👉 Dev OTP screen par yahan show hoga */}
      {debugOtp && (
        <div style={{ background: "#e8f5e9", border: "1px solid #c8e6c9", padding: "10px", borderRadius: "5px", marginBottom: "15px", color: "#2e7d32" }}>
          🔑 <strong>Dev OTP:</strong> <span style={{ fontSize: "18px", fontWeight: "bold", letterSpacing: "2px" }}>{debugOtp}</span>
        </div>
      )}

      <form onSubmit={handleVerify} style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "15px" }}>
        <input
          type="text"
          placeholder="Phone Number (+91XXXXXXXXXX)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
        
        <input
          type="text"
          placeholder="Enter 6-digit OTP"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          maxLength={6}
          required
        />

        {error && <p style={{ color: "red", fontSize: "14px" }}>{error}</p>}
        {message && <p style={{ color: "green", fontSize: "14px" }}>{message}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "Verifying..." : "Verify OTP"}
        </button>
      </form>

      <div style={{ marginTop: "15px", display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
        <button 
          type="button" 
          onClick={handleResend}
          style={{ background: "none", border: "none", color: "blue", cursor: "pointer", padding: 0 }}
        >
          Resend OTP
        </button>
        <Link to="/register">Back to Register</Link>
      </div>
    </div>
  );
}