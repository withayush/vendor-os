import API from "./api";

// 1. Create Vendor Profile
export const createVendorProfileApi = async (vendorData) => {
  const response = await API.post("/vendors/profile", vendorData);
  return response.data;
};

// 2. Get Vendor Profile
export const getVendorProfileApi = async () => {
  const response = await API.get("/vendors/profile");
  return response.data;
};

// 3. Update Vendor Profile
export const updateVendorProfileApi = async (vendorData) => {
  const response = await API.patch("/vendors/profile", vendorData);
  return response.data;
};