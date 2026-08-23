import API from "./api";

// 1. Request OTP
export const requestOtpApi = async (phone) => {
  const response = await API.post("/auth/otp/request", { phone });
  return response.data;
};

// 2. Verify OTP & Login
export const verifyOtpApi = async (phone, otp) => {
  const response = await API.post("/auth/otp/verify", { phone, otp });
  return response.data;
};

// 3. Get Current User Profile (/me)
export const getCurrentUserApi = async () => {
  const response = await API.get("/auth/me");
  return response.data;
};