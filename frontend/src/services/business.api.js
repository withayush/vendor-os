import api from "./api";

// Naya business create karne ke liye (Onboarding submit)
export const createBusiness = async (data) => {
  const response = await api.post("/businesses", data);
  return response.data;
};

// Logged-in vendor ka business fetch karne ke liye
export const getMyBusiness = async () => {
  const response = await api.get("/businesses/me");
  return response.data;
};

// Business profile update karne ke liye
export const updateMyBusiness = async (data) => {
  const response = await api.patch("/businesses/me", data);
  return response.data;
};