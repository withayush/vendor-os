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
  Boxes,
  AlertTriangle,
  RefreshCw,
  FileText,
  Activity,
  Receipt
} from "lucide-react";
import toast from "react-hot-toast";

export default function InventoryAuditPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [logs, setLogs] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const businessId = localStorage.getItem("businessId");

  const fetchData = async () => {
    if (!businessId) return;
    try {
      setLoading(true);
      const headers = { "x-business-id": businessId };
      const [ledgerRes, lowStockRes] = await Promise.all([
        api.get("/inventory/ledger", { headers }),
        api.get("/inventory/low-stock", { headers })
      ]);
      setLogs(ledgerRes.data.data.logs || []);
      setLowStock(lowStockRes.data.data.lowStockItems || []);
    } catch (error) {
      console.error("Error fetching audit data:", error);
      toast.error(error.response?.data?.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [businessId]);

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
          <Link
            to="/products"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-all"
          >
            <Package className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1 text-sm font-medium">Products</span>
          </Link>
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary text-foreground">
            <Boxes className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1 text-sm font-medium">Inventory</span>
          </div>
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
                <Link
                  to="/products"
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-secondary/50"
                >
                  <Package className="w-5 h-5" />
                  <span className="text-sm font-medium">Products</span>
                </Link>
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary text-foreground">
                  <Boxes className="w-5 h-5" />
                  <span className="text-sm font-medium">Inventory</span>
                </div>
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
      <main className="lg:pl-72 min-h-screen">
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
          
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Boxes className="w-8 h-8 text-foreground" />
                Inventory Audit Flow
              </h1>
              <p className="text-muted-foreground mt-1">
                Monitor low stock alerts and review chronological ledger logs.
              </p>
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="btn btn-secondary self-start sm:self-center"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh Flow
            </button>
          </div>

          {/* T22: Low Stock Notifications Section */}
          <div className="bg-destructive/10 border border-destructive/25 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute right-0 bottom-0 opacity-5 pointer-events-none">
              <AlertTriangle className="w-48 h-48 text-destructive" />
            </div>
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-destructive" />
              <h2 className="text-lg font-bold text-foreground">Low Stock Warnings (Reorder Level Breached)</h2>
            </div>
            {lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">All inventory levels are fully healthy!</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {lowStock.map((item) => (
                  <div key={item.id} className="bg-card/50 border border-border p-4 rounded-xl flex flex-col justify-between hover:border-destructive/40 transition-colors">
                    <div>
                      <p className="font-semibold text-foreground text-sm">{item.product_name}</p>
                      <p className="text-[11px] text-muted-foreground/80 mt-0.5">SKU: {item.sku || "N/A"}</p>
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50 text-xs">
                      <div>
                        <span className="block text-muted-foreground/60 text-[9px] uppercase font-bold tracking-wide">Current</span>
                        <span className="text-destructive font-bold text-sm">{item.available_stock} pcs</span>
                      </div>
                      <div className="text-right">
                        <span className="block text-muted-foreground/60 text-[9px] uppercase font-bold tracking-wide">Reorder Level</span>
                        <span className="text-muted-foreground font-semibold">{item.reorder_level} pcs</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* T21: Inventory Ledger Audit Log Table */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <FileText className="w-6 h-6 text-foreground" />
              <h2 className="text-xl font-bold text-foreground">Chronological Ledger Logs (Stock Flow)</h2>
            </div>

            {loading && logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-3">
                <div className="spinner animate-spin" />
                <p className="text-sm text-muted-foreground">Retrieving ledger details...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-border rounded-xl">
                <Activity className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No ledger transactions recorded yet.</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Product</th>
                      <th>Type</th>
                      <th>Qty Change</th>
                      <th>Notes / Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => {
                      const qty = parseFloat(log.qty_change);
                      const isPositive = qty > 0;
                      return (
                        <tr key={log.id} className="hover:bg-secondary/20 transition-colors">
                          <td className="whitespace-nowrap text-xs text-muted-foreground">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td className="whitespace-nowrap font-medium text-foreground">
                            {log.product_name}
                          </td>
                          <td className="whitespace-nowrap">
                            <span className={`badge ${
                              log.type === 'IN' 
                                ? 'bg-success/10 text-success border-success/20' 
                                : log.type === 'OUT' 
                                  ? 'bg-destructive/10 text-destructive border-destructive/20' 
                                  : 'bg-warning/10 text-warning border-warning/20'
                            }`}>
                              {log.type}
                            </span>
                          </td>
                          <td className={`whitespace-nowrap font-bold ${isPositive ? 'text-success' : 'text-destructive'}`}>
                            {isPositive ? `+${qty}` : qty}
                          </td>
                          <td className="text-sm text-muted-foreground max-w-xs truncate">
                            {log.notes || "N/A"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
