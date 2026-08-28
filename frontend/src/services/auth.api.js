import api from "./api";

// Register API call
export const registerUser = async (data) => {
  const response = await api.post("/auth/register", data);
  return response.data; // Backend ka response data return kar rahe hain
};

// Verify OTP API call
export const verifyOTP = async (data) => {
  const response = await api.post("/auth/verify-phone", data);
  return response.data;
};

// Login API call
export const loginUser = async (data) => {
  const response = await api.post("/auth/login", data);
  return response.data;
};

// Resend OTP API call
export const resendOTP = async (data) => {
  const response = await api.post("/auth/resend-phone-otp", data);
  return response.data;
};