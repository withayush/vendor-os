import api from "./api";

const getBusinessHeader = () => ({
  headers: { "x-business-id": localStorage.getItem("businessId") },
});

// T15: Get master inventory store state (products with physical stock & reorder level)
export const getInventoryStoreState = async ({
  page = 1,
  limit = 15,
  search = "",
  status = "",
  sortBy = "name",
  sortDir = "ASC",
} = {}) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (search) params.append("search", search);
  if (status) params.append("status", status);
  if (sortBy) params.append("sortBy", sortBy);
  if (sortDir) params.append("sortDir", sortDir);

  const res = await api.get(`/inventory/store-state?${params.toString()}`, getBusinessHeader());
  return res.data;
};

// T15: Get inventory valuation & health summary
export const getInventorySummary = async () => {
  const res = await api.get("/inventory/store-state/summary", getBusinessHeader());
  return res.data;
};

// T15: Get single product inventory store state
export const getProductStoreState = async (productId) => {
  const res = await api.get(`/inventory/store-state/${productId}`, getBusinessHeader());
  return res.data;
};

// T15: Update reorder level threshold for product
export const updateInventoryConfig = async (productId, { reorderLevel }) => {
  const res = await api.put(
    `/inventory/store-state/${productId}`,
    { reorderLevel: parseFloat(reorderLevel) },
    getBusinessHeader()
  );
  return res.data;
};

// T18: Stock IN
export const recordStockIn = async (payload) => {
  const res = await api.post("/inventory/stock-in", payload, getBusinessHeader());
  return res.data;
};

// T19: Stock OUT
export const recordStockOut = async (payload) => {
  const res = await api.post("/inventory/stock-out", payload, getBusinessHeader());
  return res.data;
};

// T20: Reconcile / Adjust Stock
export const adjustStock = async (payload) => {
  const res = await api.post("/inventory/adjust", payload, getBusinessHeader());
  return res.data;
};

// T16 & T21: Get Ledger Audit Logs with type and product filters
export const getInventoryLedger = async (params = {}) => {
  const options = typeof params === "string" ? { productId: params } : params;
  const searchParams = new URLSearchParams();
  if (options.productId) searchParams.append("productId", options.productId);
  if (options.type) searchParams.append("type", options.type);
  if (options.invoiceId) searchParams.append("invoiceId", options.invoiceId);
  if (options.limit) searchParams.append("limit", String(options.limit));

  const qs = searchParams.toString();
  const res = await api.get(`/inventory/ledger${qs ? `?${qs}` : ""}`, getBusinessHeader());
  return res.data;
};

// T16: Get ledger movement summary
export const getInventoryLedgerSummary = async () => {
  const res = await api.get("/inventory/ledger/summary", getBusinessHeader());
  return res.data;
};

// T22: Get Low Stock Alerts
export const getLowStockAlerts = async () => {
  const res = await api.get("/inventory/low-stock", getBusinessHeader());
  return res.data;
};

// T17: Initialize opening stock for a product
export const initializeOpeningStock = async ({ productId, openingQty, notes }) => {
  const res = await api.post(
    "/inventory/opening-stock",
    { productId, openingQty: parseFloat(openingQty), notes },
    getBusinessHeader()
  );
  return res.data;
};

// T17: Check if opening stock has been initialized for a product
export const getProductOpeningStock = async (productId) => {
  const res = await api.get(`/inventory/opening-stock/${productId}`, getBusinessHeader());
  return res.data;
};
