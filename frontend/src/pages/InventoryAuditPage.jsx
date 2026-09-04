import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
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
  Receipt,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  IndianRupee,
  Edit3,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Layers,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Loader2
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getInventoryStoreState,
  getInventorySummary,
  updateInventoryConfig,
  getInventoryLedger,
  getInventoryLedgerSummary,
  getLowStockAlerts
} from "../services/inventory.api";


// ─── Utilities ────────────────────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(n ?? 0);

export default function InventoryAuditPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const businessId = localStorage.getItem("businessId");
  const isFirst = useRef(true);

  // Active Tab
  const [activeTab, setActiveTab] = useState("store-state"); // store-state | ledger | alerts

  // Summary State (T15)
  const [summary, setSummary] = useState({
    totalProducts: 0,
    totalPhysicalUnits: 0,
    totalCostValuation: 0,
    totalRetailValuation: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    healthyStockCount: 0,
  });

  // Master Store State Table (T15)
  const [storeState, setStoreState] = useState([]);
  const [storeStateLoading, setStoreStateLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(""); // '' | HEALTHY | LOW_STOCK | OUT_OF_STOCK
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const LIMIT = 12;

  // Logs, Ledger Summary and Low Stock
  const [logs, setLogs] = useState([]);
  const [ledgerSummary, setLedgerSummary] = useState({
    totalInUnits: 0,
    totalOutUnits: 0,
    inCount: 0,
    outCount: 0,
    adjustCount: 0,
  });
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState(""); // "" | "IN" | "OUT" | "ADJUST"
  const [lowStock, setLowStock] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Edit Reorder Level Modal
  const [editingItem, setEditingItem] = useState(null);
  const [newReorderLevel, setNewReorderLevel] = useState("");
  const [savingConfig, setSavingConfig] = useState(false);

  // Mobile sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Fetch Summary ──
  const fetchSummary = useCallback(async () => {
    if (!businessId) return;
    try {
      const res = await getInventorySummary();
      setSummary(res.data || {});
    } catch (err) {
      console.error("Failed to load inventory summary:", err);
    }
  }, [businessId]);

  // ── Fetch Store State ──
  const fetchStoreState = useCallback(
    async (pg = 1) => {
      if (!businessId) return;
      setStoreStateLoading(true);
      try {
        const res = await getInventoryStoreState({
          page: pg,
          limit: LIMIT,
          search,
          status: statusFilter,
        });
        setStoreState(res.data?.items || []);
        setTotalPages(res.data?.pagination?.totalPages || 1);
        setTotalItems(res.data?.pagination?.totalItems || 0);
      } catch (err) {
        toast.error(err?.response?.data?.message || "Failed to load inventory store state");
      } finally {
        setStoreStateLoading(false);
      }
    },
    [businessId, search, statusFilter]
  );

  // ── Fetch Ledger & Alerts ──
  const fetchLogsAndAlerts = useCallback(async () => {
    if (!businessId) return;
    setLogsLoading(true);
    try {
      const [ledgerRes, alertsRes, ledgerSummaryRes] = await Promise.all([
        getInventoryLedger({ type: ledgerTypeFilter || null }),
        getLowStockAlerts(),
        getInventoryLedgerSummary(),
      ]);
      setLogs(ledgerRes.data?.logs || []);
      setLowStock(alertsRes.data?.lowStockItems || []);
      setLedgerSummary(ledgerSummaryRes.data || {});
    } catch (err) {
      console.error("Failed to fetch logs and alerts:", err);
    } finally {
      setLogsLoading(false);
    }
  }, [businessId, ledgerTypeFilter]);

  useEffect(() => {
    fetchSummary();
    fetchStoreState(page);
  }, [page, fetchSummary, fetchStoreState]);

  useEffect(() => {
    fetchLogsAndAlerts();
  }, [fetchLogsAndAlerts]);


  // Debounced search
  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    const t = setTimeout(() => {
      if (page === 1) fetchStoreState(1);
      else setPage(1);
    }, 250);
    return () => clearTimeout(t);
  }, [search, statusFilter]);

  // ── Update Reorder Level ──
  const handleUpdateReorderLevel = async (e) => {
    e.preventDefault();
    if (!editingItem) return;
    const level = parseFloat(newReorderLevel);
    if (isNaN(level) || level < 0) {
      toast.error("Please enter a valid non-negative reorder level");
      return;
    }

    setSavingConfig(true);
    try {
      await updateInventoryConfig(editingItem.productId, { reorderLevel: level });
      toast.success(`Reorder level updated for ${editingItem.productName}`);
      setEditingItem(null);
      fetchStoreState(page);
      fetchSummary();
      fetchLogsAndAlerts();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update reorder level");
    } finally {
      setSavingConfig(false);
    }
  };

  const handleLogout = () => {
    const toastId = toast.loading("Logging out...");
    try {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      localStorage.removeItem("vendor");
      localStorage.removeItem("business");
      localStorage.removeItem("businessId");
      logout();
      toast.dismiss(toastId);
      toast.success("Logged out successfully!");
      navigate("/login", { replace: true });
    } catch (error) {
      toast.dismiss(toastId);
      toast.error("Error logging out.");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-card border border-border rounded-xl text-foreground hover:bg-secondary/50 transition-all shadow-md"
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
            <span className="flex-1 text-sm font-semibold">Inventory</span>
            <span className="text-[10px] bg-background text-muted-foreground px-2 py-0.5 rounded-full border border-border">
              {summary.totalProducts || 0}
            </span>
          </div>
          <Link to="/pos" className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-all">
            <Receipt className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1 text-sm font-medium">POS Terminal</span>
          </Link>
          <Link to="/customers" className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-all">
            <Users className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1 text-sm font-medium">Customers</span>
          </Link>
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

      {/* Main Content */}
      <main className="lg:pl-72 min-h-screen">
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <Boxes className="w-7 h-7 text-primary" />
                  Inventory Store State
                </h1>
                <span className="text-[11px] bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-full font-semibold">
                  T15 Master Schema Active
                </span>
              </div>
              <p className="text-muted-foreground text-sm mt-1">
                Real-time physical stock counts, reorder level thresholds, and inventory valuation.
              </p>
            </div>

            <button
              onClick={() => {
                fetchSummary();
                fetchStoreState(page);
                fetchLogsAndAlerts();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-secondary border border-border hover:bg-secondary/80 rounded-xl text-sm font-medium text-foreground transition-all self-start sm:self-auto"
            >
              <RefreshCw className={`w-4 h-4 ${storeStateLoading ? "animate-spin" : ""}`} />
              Refresh State
            </button>
          </div>

          {/* ── Metric Summary Cards (T15 Master Metrics) ───────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                label: "Tracked Products",
                value: summary.totalProducts || 0,
                sub: `${summary.healthyStockCount || 0} healthy`,
                icon: Package,
                color: "text-primary",
                bg: "bg-primary/10 border-primary/20",
              },
              {
                label: "Physical Units in Stock",
                value: (summary.totalPhysicalUnits || 0).toLocaleString("en-IN"),
                sub: "Current total volume",
                icon: Boxes,
                color: "text-emerald-400",
                bg: "bg-emerald-500/10 border-emerald-500/20",
              },
              {
                label: "Inventory Valuation",
                value: fmt(summary.totalCostValuation || 0),
                sub: `Retail: ${fmt(summary.totalRetailValuation || 0)}`,
                icon: IndianRupee,
                color: "text-violet-400",
                bg: "bg-violet-500/10 border-violet-500/20",
              },
              {
                label: "Stock Attention",
                value: `${summary.lowStockCount || 0} Low · ${summary.outOfStockCount || 0} Out`,
                sub: summary.lowStockCount + summary.outOfStockCount > 0 ? "Requires purchase order" : "All levels adequate",
                icon: AlertTriangle,
                color: summary.outOfStockCount > 0 ? "text-destructive" : summary.lowStockCount > 0 ? "text-amber-400" : "text-emerald-400",
                bg: summary.outOfStockCount > 0 ? "bg-destructive/10 border-destructive/20" : summary.lowStockCount > 0 ? "bg-amber-500/10 border-amber-500/20" : "bg-emerald-500/10 border-emerald-500/20",
              },
            ].map((card, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card border border-border rounded-2xl p-4 shadow-sm flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                    {card.label}
                  </span>
                  <div className={`w-7 h-7 rounded-lg ${card.bg} border flex items-center justify-center`}>
                    <card.icon className={`w-3.5 h-3.5 ${card.color}`} />
                  </div>
                </div>
                <div>
                  <p className={`text-xl md:text-2xl font-black ${card.color}`}>{card.value}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{card.sub}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* ── Navigation Tabs ──────────────────────────────────────────────── */}
          <div className="flex items-center gap-2 border-b border-border pb-1">
            <button
              onClick={() => setActiveTab("store-state")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === "store-state"
                  ? "bg-secondary text-foreground shadow-xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Boxes className="w-4 h-4" />
              Master Store State ({totalItems})
            </button>
            <button
              onClick={() => setActiveTab("alerts")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all relative ${
                activeTab === "alerts"
                  ? "bg-secondary text-foreground shadow-xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Low Stock Watchlist
              {lowStock.length > 0 && (
                <span className="ml-1 text-[10px] bg-destructive text-destructive-foreground px-1.5 py-0.2 rounded-full font-bold">
                  {lowStock.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("ledger")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === "ledger"
                  ? "bg-secondary text-foreground shadow-xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText className="w-4 h-4" />
              Ledger Flow Logs ({logs.length})
            </button>
          </div>

          {/* ── TAB 1: Master Store State (T15 Master Schema) ────────────────── */}
          {activeTab === "store-state" && (
            <div className="space-y-4">
              {/* Filter Bar */}
              <div className="bg-card border border-border rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shadow-xs">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search master catalog by name, SKU, barcode, category..."
                    className="w-full pl-10 pr-10 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Status Pills */}
                <div className="flex bg-background border border-border rounded-xl p-1 text-xs">
                  {[
                    { key: "", label: "All Status" },
                    { key: "HEALTHY", label: "In Stock" },
                    { key: "LOW_STOCK", label: "Low Stock" },
                    { key: "OUT_OF_STOCK", label: "Out of Stock" },
                  ].map((s) => (
                    <button
                      key={s.key}
                      onClick={() => setStatusFilter(s.key)}
                      className={`px-3 py-1.5 rounded-lg transition-all font-semibold ${
                        statusFilter === s.key
                          ? "bg-secondary text-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Master Inventory Table */}
              <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-secondary border-b border-border text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                        <th className="px-5 py-3.5">Product & SKU</th>
                        <th className="px-5 py-3.5">Category</th>
                        <th className="px-5 py-3.5">Available Stock</th>
                        <th className="px-5 py-3.5">Reorder Threshold</th>
                        <th className="px-5 py-3.5">Status</th>
                        <th className="px-5 py-3.5">Cost Value</th>
                        <th className="px-5 py-3.5">Retail Value</th>
                        <th className="px-5 py-3.5 text-right">Configure</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {storeStateLoading ? (
                        <tr>
                          <td colSpan={8} className="py-16 text-center">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto mb-2" />
                            <p className="text-xs text-muted-foreground">Reading physical inventory state…</p>
                          </td>
                        </tr>
                      ) : storeState.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-16 text-center">
                            <Boxes className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                            <p className="font-semibold text-sm text-foreground">No inventory records match filters</p>
                            <p className="text-xs text-muted-foreground mt-1">Try resetting the search or filter</p>
                          </td>
                        </tr>
                      ) : (
                        storeState.map((item) => {
                          const isOut = item.stockStatus === "OUT_OF_STOCK";
                          const isLow = item.stockStatus === "LOW_STOCK";

                          return (
                            <tr key={item.inventoryId} className="hover:bg-secondary/25 transition-colors">
                              {/* Product Info */}
                              <td className="px-5 py-4">
                                <div className="space-y-0.5">
                                  <p className="font-bold text-foreground">{item.productName}</p>
                                  <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                                    {item.sku ? <span>SKU: {item.sku}</span> : <span>No SKU</span>}
                                    {item.barcode && <span className="text-muted-foreground/50">UPC: {item.barcode}</span>}
                                  </div>
                                </div>
                              </td>

                              {/* Category */}
                              <td className="px-5 py-4 text-xs">
                                {item.categoryName ? (
                                  <span className="inline-flex items-center gap-1 bg-secondary border border-border px-2 py-0.5 rounded text-foreground/80 font-medium">
                                    <Layers className="w-2.5 h-2.5 text-muted-foreground" />
                                    {item.categoryName}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground/40">—</span>
                                )}
                              </td>

                              {/* Available Physical Stock */}
                              <td className="px-5 py-4 font-mono font-extrabold text-base">
                                <span className={isOut ? "text-destructive" : isLow ? "text-amber-400" : "text-emerald-400"}>
                                  {item.availableStock}
                                </span>
                                <span className="text-xs font-normal text-muted-foreground ml-1">{item.unit}</span>
                              </td>

                              {/* Reorder Level Threshold */}
                              <td className="px-5 py-4 font-mono text-xs text-muted-foreground">
                                <span className="font-bold text-foreground">{item.reorderLevel}</span> {item.unit}
                              </td>

                              {/* Stock Status Badge */}
                              <td className="px-5 py-4">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                    isOut
                                      ? "bg-destructive/10 text-destructive border-destructive/20"
                                      : isLow
                                      ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                      : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  }`}
                                >
                                  {isOut ? (
                                    <>
                                      <XCircle className="w-3 h-3" /> OUT OF STOCK
                                    </>
                                  ) : isLow ? (
                                    <>
                                      <AlertTriangle className="w-3 h-3" /> LOW STOCK
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 className="w-3 h-3" /> HEALTHY
                                    </>
                                  )}
                                </span>
                              </td>

                              {/* Cost Value */}
                              <td className="px-5 py-4 font-mono text-xs text-muted-foreground">
                                {fmt(item.stockCostValue)}
                              </td>

                              {/* Retail Value */}
                              <td className="px-5 py-4 font-mono text-xs font-semibold text-foreground">
                                {fmt(item.stockRetailValue)}
                              </td>

                              {/* Quick Reorder Config Action */}
                              <td className="px-5 py-4 text-right">
                                <button
                                  onClick={() => {
                                    setEditingItem(item);
                                    setNewReorderLevel(String(item.reorderLevel));
                                  }}
                                  className="p-1.5 rounded-lg border border-border hover:bg-secondary/70 text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 text-xs"
                                  title="Configure Reorder Threshold"
                                >
                                  <Sliders className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline font-medium">Threshold</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="px-5 py-3.5 border-t border-border flex items-center justify-between bg-secondary/30 text-xs">
                    <span className="text-muted-foreground">
                      Page {page} of {totalPages} · {totalItems} items tracked
                    </span>
                    <div className="flex gap-2">
                      <button
                        disabled={page <= 1 || storeStateLoading}
                        onClick={() => setPage(page - 1)}
                        className="p-1.5 rounded-lg border border-border hover:bg-secondary disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        disabled={page >= totalPages || storeStateLoading}
                        onClick={() => setPage(page + 1)}
                        className="p-1.5 rounded-lg border border-border hover:bg-secondary disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TAB 2: Low Stock Watchlist (T22) ─────────────────────────────── */}
          {activeTab === "alerts" && (
            <div className="space-y-4">
              <div className="bg-card border border-amber-500/20 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  <h2 className="text-lg font-bold text-foreground">Items Breaching Reorder Level</h2>
                </div>

                {lowStock.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-border rounded-xl">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                    <p className="font-semibold text-sm text-foreground">All inventory levels are fully healthy!</p>
                    <p className="text-xs text-muted-foreground mt-0.5">No products are below their reorder threshold.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {lowStock.map((item) => (
                      <div
                        key={item.id}
                        className="bg-background border border-amber-500/30 p-4 rounded-xl flex flex-col justify-between hover:shadow-sm transition-all"
                      >
                        <div>
                          <p className="font-bold text-foreground text-sm">{item.product_name}</p>
                          <p className="text-[11px] font-mono text-muted-foreground mt-0.5">SKU: {item.sku || "N/A"}</p>
                        </div>
                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50 text-xs">
                          <div>
                            <span className="block text-muted-foreground text-[9px] uppercase font-bold">Physical Stock</span>
                            <span className="text-destructive font-bold text-sm">{item.available_stock}</span>
                          </div>
                          <div className="text-right">
                            <span className="block text-muted-foreground text-[9px] uppercase font-bold">Reorder Level</span>
                            <span className="text-muted-foreground font-semibold">{item.reorder_level}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TAB 3: Ledger Flow Logs (T16 & T21) ────────────────────────────────── */}
          {activeTab === "ledger" && (
            <div className="space-y-4">
              {/* Architectural Rule Enforcement Banner */}
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-foreground">
                      Immutable Audit Ledger (T16 Architectural Rule)
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      Stock quantities are never directly overwritten. Every inventory modification is permanently recorded as an immutable ledger entry.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                    Append-Only Guaranteed
                  </span>
                </div>
              </div>

              {/* Ledger Summary Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-card border border-border p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Initial Seeds (OPENING)</span>
                    <p className="text-lg font-black text-violet-400 mt-0.5">
                      +{ledgerSummary.totalOpeningUnits || 0} units
                    </p>
                    <p className="text-[11px] text-muted-foreground">{ledgerSummary.openingCount || 0} products initialized</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                    <Boxes className="w-4 h-4 text-violet-400" />
                  </div>
                </div>

                <div className="bg-card border border-border p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Total Inflow (Stock IN)</span>
                    <p className="text-lg font-black text-emerald-400 mt-0.5">
                      +{ledgerSummary.totalInUnits || 0} units
                    </p>
                    <p className="text-[11px] text-muted-foreground">{ledgerSummary.inCount || 0} intake batches</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                  </div>
                </div>

                <div className="bg-card border border-border p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Total Outflow (Sales / OUT)</span>
                    <p className="text-lg font-black text-destructive mt-0.5">
                      -{ledgerSummary.totalOutUnits || 0} units
                    </p>
                    <p className="text-[11px] text-muted-foreground">{ledgerSummary.outCount || 0} POS checkout deductions</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center justify-center">
                    <ArrowDownRight className="w-4 h-4 text-destructive" />
                  </div>
                </div>

                <div className="bg-card border border-border p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Reconciliations (ADJUST)</span>
                    <p className="text-lg font-black text-amber-400 mt-0.5">
                      {ledgerSummary.adjustCount || 0} adjustments
                    </p>
                    <p className="text-[11px] text-muted-foreground">Audited physical reconciliations</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <Activity className="w-4 h-4 text-amber-400" />
                  </div>
                </div>
              </div>

              {/* Ledger Card Table */}
              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      Transaction Ledger History
                    </h2>
                    <span className="text-xs text-muted-foreground">Chronological audit stream linking sales and adjustments</span>
                  </div>

                  {/* Operation Type Filter Tabs */}
                  <div className="flex flex-wrap bg-background border border-border rounded-xl p-1 text-xs">
                    {[
                      { key: "", label: "All Movements" },
                      { key: "OPENING", label: "Opening Stock" },
                      { key: "IN", label: "Stock IN" },
                      { key: "OUT", label: "Stock OUT" },
                      { key: "ADJUST", label: "Adjustments" },
                    ].map((f) => (
                      <button
                        key={f.key}
                        onClick={() => setLedgerTypeFilter(f.key)}
                        className={`px-3 py-1 rounded-lg transition-all font-semibold ${
                          ledgerTypeFilter === f.key
                            ? "bg-secondary text-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>


                {logsLoading ? (
                  <div className="py-16 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Reading immutable ledger transactions…</p>
                  </div>
                ) : logs.length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-border rounded-xl">
                    <Activity className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground font-medium">No ledger records found for this filter</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-secondary border-b border-border text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                          <th className="px-5 py-3">Timestamp</th>
                          <th className="px-5 py-3">Product</th>
                          <th className="px-5 py-3">Operation</th>
                          <th className="px-5 py-3">Qty Change</th>
                          <th className="px-5 py-3">Invoice Link</th>
                          <th className="px-5 py-3">Notes & Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {logs.map((log) => {
                          const qty = parseFloat(log.qtyChange);
                          const isPositive = qty > 0;
                          return (
                            <tr key={log.id} className="hover:bg-secondary/20 transition-colors">
                              <td className="px-5 py-3.5 text-xs text-muted-foreground whitespace-nowrap font-mono">
                                {new Date(log.createdAt).toLocaleString("en-IN")}
                              </td>
                              <td className="px-5 py-3.5">
                                <p className="font-semibold text-foreground">{log.productName}</p>
                                {log.sku && <p className="text-[10px] font-mono text-muted-foreground">SKU: {log.sku}</p>}
                              </td>
                              <td className="px-5 py-3.5">
                                <span
                                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                                    log.type === "IN"
                                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                      : log.type === "OUT"
                                      ? "bg-destructive/10 text-destructive border-destructive/20"
                                      : log.type === "OPENING"
                                      ? "bg-violet-500/10 text-violet-400 border-violet-500/20"
                                      : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                  }`}
                                >
                                  {log.type === "OPENING" ? "⟳ OPENING" : log.type}
                                </span>
                              </td>
                              <td className={`px-5 py-3.5 font-mono font-bold ${isPositive ? "text-emerald-400" : "text-destructive"}`}>
                                {isPositive ? `+${qty}` : qty} {log.unit || "pcs"}
                              </td>
                              <td className="px-5 py-3.5">
                                {log.invoiceNumber ? (
                                  <span className="inline-flex items-center gap-1.5 text-xs font-mono bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-md font-semibold">
                                    <Receipt className="w-3 h-3" />
                                    {log.invoiceNumber}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground/40 text-xs font-mono">—</span>
                                )}
                              </td>
                              <td className="px-5 py-3.5 text-xs text-muted-foreground max-w-sm truncate">
                                {log.notes || "Standard movement entry"}
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
          )}

        </div>
      </main>

      {/* ── Reorder Level Configuration Modal (T15 Master Parameter) ─────── */}
      <AnimatePresence>
        {editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black"
              onClick={() => setEditingItem(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-secondary/50">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-primary" />
                  Configure Reorder Threshold
                </h2>
                <button
                  onClick={() => setEditingItem(null)}
                  className="p-1 text-muted-foreground hover:text-foreground rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleUpdateReorderLevel} className="p-6 space-y-4">
                <div>
                  <p className="text-sm font-bold text-foreground">{editingItem.productName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Current Physical Stock: <span className="font-bold text-foreground">{editingItem.availableStock} {editingItem.unit}</span>
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Reorder Alert Level ({editingItem.unit})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={newReorderLevel}
                    onChange={(e) => setNewReorderLevel(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="e.g. 5.00"
                    autoFocus
                  />
                  <p className="text-[11px] text-muted-foreground">
                    When available stock drops to or below this quantity, a low stock alert will trigger.
                  </p>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="flex-1 px-4 py-2.5 border border-border rounded-xl text-sm text-muted-foreground hover:bg-secondary/50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingConfig}
                    className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {savingConfig && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save Threshold
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
