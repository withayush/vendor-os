import api from "./api";

// Naya business create karne ke liye (Onboarding submit)
export const createBusiness = async (data) => {
  const response = await api.post("/businesses", data);
  console.log("createBusiness raw response:", response);
  return response.data;
};

// Logged-in vendor ka business fetch karne ke liye
export const getMyBusiness = async () => {
  const response = await api.get("/businesses/me");
  console.log("getMyBusiness raw response:", response);
  console.log("getMyBusiness data:", response.data);
  return response.data;
};

// Business profile update karne ke liye (Using correct backend route structure with businessId)
export const updateMyBusiness = async (businessId, data) => {
  const response = await api.put(`/businesses/${businessId}`, data);
  return response.data;
};