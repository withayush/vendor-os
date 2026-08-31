import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  LogOut,
  Package,
  ShoppingCart,
  Users,
  TrendingUp,
  Menu,
  X,
  Search,
  Bell,
  Settings,
  HelpCircle,
  Plus,
  Archive,
  AlertCircle,
  Tag,
  Hash,
  Boxes,
  IndianRupee,
  Receipt
} from "lucide-react";
import toast from "react-hot-toast";

export default function ProductsPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Search state
  const [search, setSearch] = useState("");
  const isFirstRender = React.useRef(true);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    barcode: "",
    sellingPrice: "",
    costPrice: "",
    unit: "pcs"
  });

  const businessId = localStorage.getItem("businessId");

  const fetchProducts = async (currentPage = page) => {
    if (!businessId) return;
    try {
      setLoading(true);
      const response = await api.get(`/products?page=${currentPage}&limit=${limit}&search=${encodeURIComponent(search)}`, {
        headers: {
          "x-business-id": businessId
        }
      });
      
      const { products: fetchedProducts, pagination } = response.data.data;
      setProducts(fetchedProducts || []);
      if (pagination) {
        setTotalPages(pagination.totalPages || 1);
        setTotalItems(pagination.totalItems || 0);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error(error.response?.data?.message || "Failed to fetch products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts(page);
  }, [page, businessId]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const delayDebounceFn = setTimeout(() => {
      if (page === 1) {
        fetchProducts(1);
      } else {
        setPage(1);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!businessId) {
      toast.error("Business ID is missing. Please restart onboarding.");
      return;
    }

    const payload = {
      name: formData.name.trim(),
      sku: formData.sku.trim() || null,
      barcode: formData.barcode.trim() || null,
      sellingPrice: parseFloat(formData.sellingPrice),
      costPrice: formData.costPrice ? parseFloat(formData.costPrice) : 0,
      unit: formData.unit.trim() || "pcs"
    };

    const toastId = toast.loading("Adding product...");
    try {
      await api.post("/products", payload, {
        headers: {
          "x-business-id": businessId
        }
      });
      toast.success("Product added successfully!", { id: toastId });
      setIsAddModalOpen(false);
      setFormData({ name: "", sku: "", barcode: "", sellingPrice: "", costPrice: "", unit: "pcs" });
      setPage(1);
      fetchProducts(1);
    } catch (error) {
      console.error("Error creating product:", error);
      toast.error(error.response?.data?.message || "Failed to add product", { id: toastId });
    }
  };

  const handleArchive = async (id) => {
    if (!window.confirm("Are you sure you want to archive this product? This preserves historical invoices.")) return;
    const toastId = toast.loading("Archiving product...");
    try {
      await api.delete(`/products/${id}`, {
        headers: {
          "x-business-id": businessId
        }
      });
      toast.success("Product archived successfully", { id: toastId });
      fetchProducts(page);
    } catch (error) {
      console.error("Error archiving product:", error);
      toast.error(error.response?.data?.message || "Failed to archive product", { id: toastId });
    }
  };

  const handleLogout = () => {
    const toastId = toast.loading('Logging out...');
    try {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('vendor');
      localStorage.removeItem('business');
      localStorage.removeItem('businessId');
      logout();
      toast.dismiss(toastId);
      toast.success('Logged out successfully!');
      navigate("/login", { replace: true });
    } catch (error) {
      toast.dismiss(toastId);
      toast.error('Error logging out.');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-card border border-border rounded-xl text-foreground hover:bg-secondary/50 transition-all"
      >
        {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Sidebar Navigation */}
      <aside className="fixed top-0 left-0 h-full w-72 bg-card border-r border-border p-6 z-40 hidden lg:flex flex-col">
        <div className="flex items-center gap-3 mb-6 flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-secondary border border-border flex items-center justify-center">
            <LayoutDashboard className="w-5 h-5 text-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">VendorOS</span>
        </div>

        {user && (
          <div className="p-4 bg-secondary/30 border border-border rounded-xl mb-4 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center text-foreground font-bold text-sm">
                {user.fullName?.charAt(0) || user.name?.charAt(0) || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate text-sm text-foreground">{user.fullName || user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto space-y-1 py-2">
          <Link
            to="/dashboard"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-all"
          >
            <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1 text-sm font-medium">Dashboard</span>
          </Link>
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary text-foreground">
            <Package className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1 text-sm font-medium">Products</span>
            <span className="text-[10px] bg-background text-muted-foreground px-2 py-0.5 rounded-full border border-border">{totalItems}</span>
          </div>
          <Link to="/inventory" className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-all">
            <Boxes className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1 text-sm">Inventory</span>
          </Link>
          <Link to="/pos" className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-all">
            <Receipt className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1 text-sm font-medium">POS Terminal</span>
          </Link>
          <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-all opacity-55 cursor-not-allowed">
            <ShoppingCart className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1 text-sm">Orders</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-all opacity-55 cursor-not-allowed">
            <Users className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1 text-sm">Customers</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-all opacity-55 cursor-not-allowed">
            <TrendingUp className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1 text-sm">Analytics</span>
          </a>
        </nav>

        <div className="flex-shrink-0 pt-4 border-t border-border mt-2">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all border border-destructive/20"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1 text-left font-medium text-sm">Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black z-30 lg:hidden"
            />
            <motion.div
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              className="fixed top-0 left-0 h-full w-72 bg-card border-r border-border p-6 z-40 lg:hidden flex flex-col"
            >
              <div className="flex items-center justify-between mb-6 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary border border-border flex items-center justify-center text-foreground">
                    <LayoutDashboard className="w-5 h-5" />
                  </div>
                  <span className="text-xl font-bold text-foreground">VendorOS</span>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-secondary/50 rounded-xl">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 space-y-1">
                <Link
                  to="/dashboard"
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-secondary/50"
                >
                  <LayoutDashboard className="w-5 h-5" />
                  <span className="text-sm font-medium">Dashboard</span>
                </Link>
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary text-foreground">
                  <Package className="w-5 h-5" />
                  <span className="text-sm font-medium">Products</span>
                </div>
                <Link
                  to="/inventory"
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-secondary/50"
                >
                  <Boxes className="w-5 h-5" />
                  <span className="text-sm font-medium">Inventory</span>
                </Link>
              </nav>

              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 mt-auto"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-sm font-medium">Logout</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="lg:ml-72 p-4 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Product Inventory</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage and track your products, prices, and stock units.</p>
          </div>
          {/* Add Product Button - Styled cleanly with card/secondary background */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-secondary border border-border text-foreground px-5 py-2.5 rounded-xl font-semibold hover:bg-secondary/80 transition-all duration-200 text-sm self-start md:self-auto shadow-sm"
          >
            <Plus className="w-4 h-4 text-foreground" /> Add Product
          </button>
        </div>

        {/* Search Bar & Filters */}
        <div className="mb-6 flex items-center max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search product name, SKU, or barcode..."
              className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl focus:outline-none focus:border-muted-foreground/40 transition-all text-sm placeholder:text-muted-foreground/60 text-foreground"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Inventory list wrapper */}
        <div className="bg-card rounded-2xl overflow-hidden border border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-secondary text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="px-6 py-4">Product Details</th>
                  <th className="px-6 py-4">SKU / Barcode</th>
                  <th className="px-6 py-4">Unit</th>
                  <th className="px-6 py-4">Cost Price</th>
                  <th className="px-6 py-4">Selling Price</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-foreground border-t-transparent"></div>
                      <p className="text-muted-foreground text-xs mt-2">Loading products...</p>
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12 text-muted-foreground">
                      <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p className="font-semibold text-sm">No products found</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">Click "+ Add Product" to create your first inventory item.</p>
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr key={product.id} className="hover:bg-secondary/40 transition-colors">
                      <td className="px-6 py-4 font-semibold text-foreground">{product.name}</td>
                      <td className="px-6 py-4">
                        <div className="text-xs font-mono flex flex-col gap-0.5">
                          <span className="text-muted-foreground">SKU: {product.sku || "N/A"}</span>
                          <span className="text-muted-foreground/60">UPC: {product.barcode || "N/A"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground text-xs">{product.unit || "pcs"}</td>
                      <td className="px-6 py-4 font-mono text-muted-foreground">₹{parseFloat(product.cost_price).toFixed(2)}</td>
                      <td className="px-6 py-4 font-mono font-bold text-foreground">₹{parseFloat(product.selling_price).toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          product.is_active
                            ? "bg-secondary border-border text-emerald-400"
                            : "bg-secondary border-border text-destructive"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${product.is_active ? "bg-emerald-400" : "bg-destructive"}`}></span>
                          {product.is_active ? "Active" : "Archived"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {product.is_active ? (
                          <button
                            onClick={() => handleArchive(product.id)}
                            className="px-3 py-1.5 bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 rounded-lg transition-colors inline-flex items-center justify-center gap-1.5"
                            title="Archive Product"
                          >
                            <Archive className="w-3.5 h-3.5" />
                            <span className="text-xs font-semibold">Archive</span>
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground/50 font-medium">No actions</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-secondary/50">
              <span className="text-xs text-muted-foreground">
                Showing Page {page} of {totalPages} ({totalItems} total products)
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1 || loading}
                  onClick={() => setPage(page - 1)}
                  className="px-3 py-1.5 bg-card border border-border rounded-lg text-xs font-semibold hover:bg-secondary disabled:opacity-30 disabled:pointer-events-none transition-all"
                >
                  Previous
                </button>
                <button
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage(page + 1)}
                  className="px-3 py-1.5 bg-card border border-border rounded-lg text-xs font-semibold hover:bg-secondary disabled:opacity-30 disabled:pointer-events-none transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Add Product Dialog Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="fixed inset-0 bg-black"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl overflow-hidden relative z-10"
            >
              {/* Header */}
              <div className="p-6 border-b border-border flex justify-between items-center bg-secondary">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Plus className="w-5 h-5 text-foreground" /> Add New Product
                </h2>
                <button onClick={() => setIsAddModalOpen(false)} className="p-1.5 hover:bg-card rounded-xl transition-all border border-transparent hover:border-border">
                  <X className="w-5 h-5 text-foreground" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleCreateProduct} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Tag className="w-3 h-3 text-muted-foreground" /> Product Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aashirvaad Atta 10kg"
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-muted-foreground/50 text-sm transition-all text-foreground"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Hash className="w-3 h-3 text-muted-foreground" /> SKU Code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ASH-ATT-10"
                      className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-muted-foreground/50 text-sm transition-all text-foreground"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Hash className="w-3 h-3 text-muted-foreground" /> Barcode (UPC)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 8901725181222"
                      className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-muted-foreground/50 text-sm transition-all text-foreground"
                      value={formData.barcode}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <IndianRupee className="w-3 h-3 text-muted-foreground" /> Cost Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="₹0.00"
                      className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-muted-foreground/50 text-sm transition-all text-foreground"
                      value={formData.costPrice}
                      onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <IndianRupee className="w-3 h-3 text-muted-foreground" /> Selling Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="₹0.00"
                      className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-muted-foreground/50 text-sm transition-all text-foreground"
                      value={formData.sellingPrice}
                      onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Boxes className="w-3 h-3 text-muted-foreground" /> Packaging Unit
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. pcs, kg, bag"
                      className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-muted-foreground/50 text-sm transition-all text-foreground"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-3.5 bg-secondary/50 border border-border rounded-xl text-xs text-muted-foreground leading-normal">
                  <AlertCircle className="w-4 h-4 text-foreground flex-shrink-0" />
                  <span>Adding a product establishes historical pricing parameters which will not break existing invoice calculations.</span>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-border bg-secondary/30 -mx-6 -mb-6 p-6">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 bg-card hover:bg-secondary border border-border rounded-xl text-sm font-semibold transition-all text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-secondary border border-border hover:bg-secondary/80 text-foreground rounded-xl text-sm font-semibold transition-all shadow-sm"
                  >
                    Save Product
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}