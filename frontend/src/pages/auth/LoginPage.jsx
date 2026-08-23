import React, { useState } from "react";
import { requestOtpApi, verifyOtpApi } from "../../services/auth.api";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const [step, setStep] = useState(1); // Step 1: Phone input, Step 2: OTP input
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [debugOtp, setDebugOtp] = useState(""); // Development ke liye backend se aane wala OTP dekhne ko

  const navigate = useNavigate();

  // Handle Send OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError("");
    
    if (!phone || phone.length < 10) {
      setError("Please enter a valid phone number.");
      return;
    }

    try {
      setLoading(true);
      const formattedPhone = phone.startsWith("+") ? phone : `+91${phone}`;
      const response = await requestOtpApi(formattedPhone);
      
      setPhone(formattedPhone);
      if (response.debugOtp) {
        setDebugOtp(response.debugOtp); // Console/UI par dikhane ke liye ki kya OTP aaya hai
      }
      setStep(2); // Move to OTP verification step
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send OTP. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Verify OTP & Login
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");

    if (!otp || otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP.");
      return;
    }

    try {
      setLoading(true);
      const response = await verifyOtpApi(phone, otp);
      
      // Save token to localStorage
      localStorage.setItem("accessToken", response.data.accessToken);
      localStorage.setItem("refreshToken", response.data.refreshToken);

      alert("Login successful!");
      // TODO: Redirect to Dashboard / Onboarding
      // navigate("/dashboard");

    } catch (err) {
      setError(err.response?.data?.message || "Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F6FA] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-[#E5E7EB] p-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#111827]">VendorOS</h1>
          <p className="text-sm text-[#6B7280] mt-1">Manage your business smarter and faster</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
            {error}
          </div>
        )}

        {/* Development Helper: Show OTP on UI */}
        {debugOtp && step === 2 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded-lg">
            <strong>[DEV MODE]</strong> Your OTP is: <span className="font-bold tracking-widest">{debugOtp}</span>
          </div>
        )}

        {/* Step 1: Phone Input Form */}
        {step === 1 ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#111827] mb-1">
                Mobile Number
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-[#E5E7EB] bg-gray-50 text-gray-500 text-sm">
                  +91
                </span>
                <input
                  type="text"
                  placeholder="9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength="10"
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-r-lg focus:outline-none focus:ring-2 focus:ring-[#2842FF] text-sm"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#2842FF] hover:bg-blue-700 text-white font-medium rounded-lg transition text-sm disabled:opacity-50"
            >
              {loading ? "Sending OTP..." : "Continue"}
            </button>
          </form>
        ) : (
          /* Step 2: OTP Verification Form */
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#111827] mb-1">
                Enter 6-digit OTP sent to <span className="font-semibold">{phone}</span>
              </label>
              <input
                type="text"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength="6"
                className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2842FF] text-center tracking-widest text-lg font-bold"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#2842FF] hover:bg-blue-700 text-white font-medium rounded-lg transition text-sm disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify & Login"}
            </button>

            <button
              type="button"
              onClick={() => { setStep(1); setOtp(""); setDebugOtp(""); }}
              className="w-full text-center text-xs text-[#6B7280] hover:text-[#111827] mt-2"
            >
              Change phone number?
            </button>
          </form>
        )}

        <p className="text-center text-xs text-[#6B7280] mt-6">
          By continuing, you agree to VendorOS Terms & Privacy Policy.
        </p>

      </div>
    </div>
  );
}