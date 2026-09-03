import api from "./api";

const getBusinessHeader = () => ({
  headers: { "x-business-id": localStorage.getItem("businessId") },
});

// T14: Instant typeahead / barcode search for POS and autocomplete
export const instantSearchProducts = async (query = "", limit = 15) => {
  const res = await api.get(
    `/products/search?q=${encodeURIComponent(query)}&limit=${limit}`,
    getBusinessHeader()
  );
  return res.data;
};

// T14: Fetch categories list for filters & product categorization
export const getProductCategories = async () => {
  const res = await api.get("/products/categories", getBusinessHeader());
  return res.data;
};

// List products with pagination, search, category filter, status filter, and sorting
export const getProducts = async ({
  page = 1,
  limit = 12,
  search = "",
  isArchived = undefined,
  categoryId = null,
  sortBy = "created",
  sortDir = "DESC",
} = {}) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (search) params.append("search", search);
  if (isArchived !== undefined) params.append("isArchived", String(isArchived));
  if (categoryId) params.append("categoryId", categoryId);
  if (sortBy) params.append("sortBy", sortBy);
  if (sortDir) params.append("sortDir", sortDir);

  const res = await api.get(`/products?${params.toString()}`, getBusinessHeader());
  return res.data;
};

// Create product
export const createProduct = async (payload) => {
  const res = await api.post("/products", payload, getBusinessHeader());
  return res.data;
};

// Update product
export const updateProduct = async (id, payload) => {
  const res = await api.put(`/products/${id}`, payload, getBusinessHeader());
  return res.data;
};

// Archive product (soft delete)
export const archiveProduct = async (id) => {
  const res = await api.delete(`/products/${id}`, getBusinessHeader());
  return res.data;
};
