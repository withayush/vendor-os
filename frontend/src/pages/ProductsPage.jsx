import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  Package,
  Plus,
  Search,
  X,
  Edit3,
  Archive,
  Tag,
  Hash,
  Boxes,
  IndianRupee,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  CheckCircle2,
  RefreshCw,
  BarChart2,
  Filter,
  ArrowUpDown,
  FolderPlus,
  Layers
} from "lucide-react";
import {
  getProducts,
  getProductCategories,
  createProduct,
  updateProduct,
  archiveProduct
} from "../services/product.api";

// ─── Utilities ────────────────────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(n ?? 0);

const margin = (cost, sell) => {
  if (!sell || sell <= 0) return 0;
  return (((sell - cost) / sell) * 100).toFixed(1);
};

// ─── Form Field ───────────────────────────────────────────────────────────────
function Field({ label, icon: Icon, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full px-3.5 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-sm text-foreground placeholder:text-muted-foreground/50 transition-all";

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, icon: Icon, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl relative z-10 overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-secondary/50">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-card rounded-lg border border-transparent hover:border-border transition-all"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </motion.div>
    </div>
  );
}

// ─── Empty Form State ─────────────────────────────────────────────────────────
const emptyForm = {
  name: "",
  sku: "",
  barcode: "",
  categoryName: "",
  sellingPrice: "",
  costPrice: "",
  unit: "pcs",
  // T17: Opening stock initialization fields
  openingStock: "",
  openingStockNotes: "",
};

export default function ProductsPage() {
  const navigate = useNavigate();
  const businessId = localStorage.getItem("businessId");
  const isFirst = useRef(true);

  // Data
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const LIMIT = 12;

  // Filters & Sorting (T14)
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ACTIVE"); // ALL | ACTIVE | ARCHIVED
  const [selectedCategory, setSelectedCategory] = useState("");
  const [sortBy, setSortBy] = useState("created"); // created | name | price | margin
  const [sortDir, setSortDir] = useState("DESC");

  // Modals
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form
  const [form, setForm] = useState(emptyForm);

  // ── Stats derived ──
  const activeCount = products.filter((p) => p.is_active).length;
  const archivedCount = products.filter((p) => !p.is_active).length;
  const avgMargin =
    products.length > 0
      ? (
          products.reduce(
            (acc, p) =>
              acc +
              ((parseFloat(p.selling_price) - parseFloat(p.cost_price)) /
                Math.max(parseFloat(p.selling_price), 0.01)) *
                100,
            0
          ) / products.length
        ).toFixed(1)
      : 0;

  // ── Fetch Categories ──
  const fetchCategories = useCallback(async () => {
    if (!businessId) return;
    try {
      const res = await getProductCategories();
      setCategories(res.data?.categories || []);
    } catch (err) {
      console.error("Failed to load categories:", err);
    }
  }, [businessId]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // ── Fetch Products ──
  const fetchProducts = useCallback(
    async (pg = 1) => {
      if (!businessId) return;
      setLoading(true);
      try {
        const isArchived =
          statusFilter === "ARCHIVED" ? true : statusFilter === "ACTIVE" ? false : undefined;

        const res = await getProducts({
          page: pg,
          limit: LIMIT,
          search,
          isArchived,
          categoryId: selectedCategory || null,
          sortBy,
          sortDir,
        });

        const { products: fetched, pagination } = res.data;
        setProducts(fetched || []);
        setTotalPages(pagination?.totalPages || 1);
        setTotalItems(pagination?.totalItems || 0);
      } catch (err) {
        toast.error(err?.response?.data?.message || "Failed to load products");
      } finally {
        setLoading(false);
      }
    },
    [businessId, search, statusFilter, selectedCategory, sortBy, sortDir]
  );

  useEffect(() => {
    fetchProducts(page);
  }, [page, fetchProducts]);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    const t = setTimeout(() => {
      if (page === 1) fetchProducts(1);
      else setPage(1);
    }, 250);
    return () => clearTimeout(t);
  }, [search, statusFilter, selectedCategory, sortBy, sortDir]);

  // ── Add Product ──
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.sellingPrice) return toast.error("Name and selling price are required");
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim() || null,
        barcode: form.barcode.trim() || null,
        categoryName: form.categoryName.trim() || null,
        sellingPrice: parseFloat(form.sellingPrice),
        costPrice: form.costPrice ? parseFloat(form.costPrice) : 0,
        unit: form.unit.trim() || "pcs",
      };

      // T17: Attach opening stock if provided
      if (form.openingStock !== "" && form.openingStock !== null) {
        const openingQty = parseFloat(form.openingStock);
        if (!isNaN(openingQty) && openingQty >= 0) {
          payload.openingStock = openingQty;
          payload.openingStockNotes = form.openingStockNotes.trim() || null;
        }
      }

      const result = await createProduct(payload);

      if (result?.data?.openingStockInitialized) {
        toast.success(`Product added with opening stock of ${form.openingStock} units!`, { icon: "📦" });
      } else {
        toast.success("Product added successfully!");
      }

      setShowAdd(false);
      setForm(emptyForm);
      setPage(1);
      fetchProducts(1);
      fetchCategories();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to add product");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Edit Product ──
  const openEdit = (product) => {
    setEditTarget(product);
    setForm({
      name: product.name,
      sku: product.sku || "",
      barcode: product.barcode || "",
      categoryName: product.category_name || "",
      sellingPrice: parseFloat(product.selling_price).toString(),
      costPrice: parseFloat(product.cost_price).toString(),
      unit: product.unit || "pcs",
    });
    setShowEdit(true);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.sellingPrice) return toast.error("Name and selling price are required");
    setSubmitting(true);
    try {
      await updateProduct(editTarget.id, {
        name: form.name.trim(),
        sku: form.sku.trim() || null,
        barcode: form.barcode.trim() || null,
        categoryName: form.categoryName.trim() || null,
        sellingPrice: parseFloat(form.sellingPrice),
        costPrice: form.costPrice ? parseFloat(form.costPrice) : 0,
        unit: form.unit.trim() || "pcs",
      });
      toast.success("Product updated!");
      setShowEdit(false);
      setEditTarget(null);
      setForm(emptyForm);
      fetchProducts(page);
      fetchCategories();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update product");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Archive ──
  const confirmArchive = (product) => {
    setArchiveTarget(product);
    setShowArchiveConfirm(true);
  };

  const handleArchive = async () => {
    if (!archiveTarget) return;
    setSubmitting(true);
    try {
      await archiveProduct(archiveTarget.id);
      toast.success("Product archived (invoices preserved)");
      setShowArchiveConfirm(false);
      setArchiveTarget(null);
      fetchProducts(page);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to archive");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render Form ──
  const renderForm = (onSubmit, submitLabel) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Product Name" icon={Tag}>
        <input
          className={inputCls}
          required
          placeholder="e.g. Aashirvaad Atta 10kg"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Category" icon={Layers}>
          <input
            list="categories-datalist"
            className={inputCls}
            placeholder="e.g. Groceries, Dairy"
            value={form.categoryName}
            onChange={(e) => setForm({ ...form, categoryName: e.target.value })}
          />
          <datalist id="categories-datalist">
            {categories.map((c) => (
              <option key={c.id} value={c.name} />
            ))}
          </datalist>
        </Field>

        <Field label="Packaging Unit" icon={Boxes}>
          <input
            className={inputCls}
            placeholder="pcs, kg, bag, liter"
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="SKU Code" icon={Hash}>
          <input
            className={inputCls}
            placeholder="e.g. ASH-ATT-10"
            value={form.sku}
            onChange={(e) => setForm({ ...form, sku: e.target.value })}
          />
        </Field>
        <Field label="Barcode (UPC/EAN)" icon={Hash}>
          <input
            className={inputCls}
            placeholder="e.g. 8901725181222"
            value={form.barcode}
            onChange={(e) => setForm({ ...form, barcode: e.target.value })}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Cost Price (₹)" icon={IndianRupee}>
          <input
            type="number"
            step="0.01"
            min="0"
            className={inputCls}
            placeholder="0.00"
            value={form.costPrice}
            onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
          />
        </Field>
        <Field label="Selling Price (₹)" icon={IndianRupee}>
          <input
            type="number"
            step="0.01"
            min="0"
            required
            className={inputCls}
            placeholder="0.00"
            value={form.sellingPrice}
            onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
          />
        </Field>
      </div>

      {/* Live margin preview */}
      {form.sellingPrice && parseFloat(form.sellingPrice) > 0 && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
          <TrendingUp className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <p className="text-xs text-emerald-400">
            Profit margin:{" "}
            <span className="font-bold">
              {margin(parseFloat(form.costPrice || 0), parseFloat(form.sellingPrice))}%
            </span>
            {" · "}Profit per unit:{" "}
            <span className="font-bold">
              {fmt(parseFloat(form.sellingPrice || 0) - parseFloat(form.costPrice || 0))}
            </span>
          </p>
        </div>
      )}

      <div className="flex items-start gap-2 p-3 bg-secondary/40 border border-border rounded-xl text-xs text-muted-foreground">
        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <span>Price adjustments do not retroactively alter historic invoices. Audit records stay fully preserved.</span>
      </div>

      {/* T17: Opening Stock Initialization — only for new products */}
      {!editTarget && (
        <div className="space-y-3 pt-1">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Opening Stock (Optional)</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="p-3 bg-primary/5 border border-primary/15 rounded-xl">
            <div className="flex items-start gap-2 mb-3">
              <Package className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Set the initial audited stock for this product. This seeds an <span className="font-bold text-primary font-mono">OPENING</span> ledger entry — the first immutable record in the inventory audit trail. Leave blank to start with zero stock.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Opening Qty" icon={Boxes}>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className={inputCls}
                  placeholder="0"
                  value={form.openingStock}
                  onChange={(e) => setForm({ ...form, openingStock: e.target.value })}
                />
              </Field>
              <Field label="Opening Note (optional)" icon={Tag}>
                <input
                  className={inputCls}
                  placeholder="e.g. Initial stock count"
                  value={form.openingStockNotes}
                  onChange={(e) => setForm({ ...form, openingStockNotes: e.target.value })}
                />
              </Field>
            </div>

            {form.openingStock !== "" && parseFloat(form.openingStock) > 0 && (
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-primary font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Opening stock of <span className="font-bold">{form.openingStock} {form.unit || "pcs"}</span> will be seeded as the starting audited ledger value.
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-2.5 pt-2">
        <button
          type="button"
          onClick={() => { setShowAdd(false); setShowEdit(false); setForm(emptyForm); }}
          className="flex-1 px-4 py-2.5 border border-border rounded-xl text-sm text-muted-foreground hover:bg-secondary/50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {submitLabel}
        </button>
      </div>
    </form>
  );


  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8 max-w-7xl mx-auto">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground mb-2 transition-colors text-sm"
          >
            <ChevronLeft className="w-4 h-4" /> Dashboard
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Product Inventory</h1>
            <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-full font-medium">
              T14 Elastic Search Enabled
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">
            Real-time indexed search by SKU, Name, Barcode & Category with instant margins
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => { setForm(emptyForm); setShowAdd(true); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" /> Add Product
        </motion.button>
      </div>

      {/* ── Stats Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          {
            label: "Total Products",
            value: totalItems,
            icon: Package,
            color: "text-primary",
            bg: "bg-primary/10 border-primary/20",
          },
          {
            label: "Active In Stock",
            value: loading ? "…" : activeCount,
            icon: CheckCircle2,
            color: "text-emerald-400",
            bg: "bg-emerald-500/10 border-emerald-500/20",
          },
          {
            label: "Categories",
            value: categories.length,
            icon: Layers,
            color: "text-violet-400",
            bg: "bg-violet-500/10 border-violet-500/20",
          },
          {
            label: "Avg Margin",
            value: loading ? "…" : `${avgMargin}%`,
            icon: BarChart2,
            color: parseFloat(avgMargin) >= 20 ? "text-emerald-400" : "text-yellow-400",
            bg: parseFloat(avgMargin) >= 20 ? "bg-emerald-500/10 border-emerald-500/20" : "bg-yellow-500/10 border-yellow-500/20",
          },
        ].map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-card border border-border rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</span>
              <div className={`w-7 h-7 rounded-lg ${s.bg} border flex items-center justify-center`}>
                <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
              </div>
            </div>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Elastic Search & Multi-filter Controls (T14) ────────────────────── */}
      <div className="bg-card border border-border rounded-2xl p-4 mb-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Elastic Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by product name, SKU, barcode, or category..."
              className="w-full pl-10 pr-10 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-sans"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-lg"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter Dropdown */}
          <div className="flex items-center gap-2">
            <div className="relative min-w-[160px]">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full appearance-none px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium pr-8 cursor-pointer"
              >
                <option value="">All Categories ({categories.length})</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <Filter className="w-3.5 h-3.5 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Sort Dropdown */}
            <div className="relative min-w-[160px]">
              <select
                value={`${sortBy}-${sortDir}`}
                onChange={(e) => {
                  const [sb, sd] = e.target.value.split("-");
                  setSortBy(sb);
                  setSortDir(sd);
                }}
                className="w-full appearance-none px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium pr-8 cursor-pointer"
              >
                <option value="created-DESC">Newest First</option>
                <option value="name-ASC">Name (A to Z)</option>
                <option value="price-ASC">Price (Low to High)</option>
                <option value="price-DESC">Price (High to Low)</option>
                <option value="margin-DESC">Highest Margin</option>
              </select>
              <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Status filter tabs */}
          <div className="flex bg-background border border-border rounded-xl p-1 text-xs self-start md:self-auto">
            {["ACTIVE", "ALL", "ARCHIVED"].map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-1.5 rounded-lg transition-all capitalize font-medium ${
                  statusFilter === f
                    ? "bg-secondary text-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.toLowerCase()}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchProducts(page)}
            className="p-2.5 border border-border bg-background rounded-xl hover:bg-secondary/50 transition-colors text-muted-foreground self-start md:self-auto"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Active Filter Indicators */}
        {(search || selectedCategory || statusFilter !== "ACTIVE") && (
          <div className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground">
            <span>Active filters:</span>
            {search && (
              <span className="bg-secondary px-2 py-0.5 rounded-md border border-border text-foreground">
                Query: "{search}"
              </span>
            )}
            {selectedCategory && (
              <span className="bg-secondary px-2 py-0.5 rounded-md border border-border text-foreground">
                Category: {categories.find((c) => c.id === selectedCategory)?.name || "Selected"}
              </span>
            )}
            {statusFilter !== "ACTIVE" && (
              <span className="bg-secondary px-2 py-0.5 rounded-md border border-border text-foreground capitalize">
                Status: {statusFilter.toLowerCase()}
              </span>
            )}
            <button
              onClick={() => {
                setSearch("");
                setSelectedCategory("");
                setStatusFilter("ACTIVE");
              }}
              className="text-primary hover:underline ml-auto"
            >
              Reset all filters
            </button>
          </div>
        )}
      </div>

      {/* ── Product Table ────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-secondary border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                <th className="px-5 py-3.5">Product</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5">SKU / Barcode</th>
                <th className="px-5 py-3.5">Unit</th>
                <th className="px-5 py-3.5">Stock</th>
                <th className="px-5 py-3.5">Cost</th>
                <th className="px-5 py-3.5">Price</th>
                <th className="px-5 py-3.5">Margin</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Running indexed query…</p>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center">
                    <Package className="w-10 h-10 mx-auto mb-3 text-muted-foreground/20" />
                    <p className="font-semibold text-sm text-foreground">
                      {search || selectedCategory ? "No products match the filter criteria" : "No products yet"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {search || selectedCategory ? "Try adjusting your search or category" : 'Click "+ Add Product" to create your first item'}
                    </p>
                  </td>
                </tr>
              ) : (
                <AnimatePresence>
                  {products.map((p, idx) => {
                    const marginVal = margin(
                      parseFloat(p.cost_price),
                      parseFloat(p.selling_price)
                    );
                    const isGoodMargin = parseFloat(marginVal) >= 15;
                    const stock = parseFloat(p.available_stock || 0);

                    return (
                      <motion.tr
                        key={p.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.02 }}
                        className={`hover:bg-secondary/30 transition-colors ${!p.is_active ? "opacity-50" : ""}`}
                      >
                        {/* Product name */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-secondary border border-border flex items-center justify-center flex-shrink-0">
                              <Package className="w-3.5 h-3.5 text-muted-foreground" />
                            </div>
                            <span className="font-semibold text-foreground">{p.name}</span>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-5 py-4">
                          {p.category_name ? (
                            <span className="inline-flex items-center gap-1 text-xs bg-secondary/80 border border-border px-2 py-0.5 rounded-md text-foreground/80 font-medium">
                              <Layers className="w-2.5 h-2.5 text-muted-foreground" />
                              {p.category_name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/40 text-xs">Uncategorized</span>
                          )}
                        </td>

                        {/* SKU / Barcode */}
                        <td className="px-5 py-4">
                          <div className="font-mono text-xs flex flex-col gap-0.5">
                            <span className="text-muted-foreground">
                              {p.sku ? (
                                <span className="bg-secondary border border-border px-1.5 py-0.5 rounded text-[10px]">
                                  {p.sku}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/40">—</span>
                              )}
                            </span>
                            <span className="text-muted-foreground/50 text-[10px]">
                              {p.barcode || "no barcode"}
                            </span>
                          </div>
                        </td>

                        {/* Unit */}
                        <td className="px-5 py-4 text-xs text-muted-foreground font-medium">
                          {p.unit || "pcs"}
                        </td>

                        {/* Available Stock */}
                        <td className="px-5 py-4 font-mono text-xs">
                          <span className={`px-2 py-0.5 rounded-full font-semibold ${
                            stock > 0
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-red-500/10 text-red-400 border border-red-500/20"
                          }`}>
                            {stock} {p.unit || "pcs"}
                          </span>
                        </td>

                        {/* Cost */}
                        <td className="px-5 py-4 font-mono text-xs text-muted-foreground">
                          {fmt(parseFloat(p.cost_price))}
                        </td>

                        {/* Selling Price */}
                        <td className="px-5 py-4 font-mono font-bold text-foreground">
                          {fmt(parseFloat(p.selling_price))}
                        </td>

                        {/* Margin */}
                        <td className="px-5 py-4">
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                              isGoodMargin
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : parseFloat(marginVal) > 0
                                ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                                : "bg-red-500/10 text-red-400 border-red-500/20"
                            }`}
                          >
                            {marginVal}%
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              p.is_active
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-secondary text-muted-foreground border-border"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                p.is_active ? "bg-emerald-400" : "bg-muted-foreground"
                              }`}
                            />
                            {p.is_active ? "Active" : "Archived"}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right">
                          {p.is_active ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openEdit(p)}
                                className="p-1.5 rounded-lg border border-border hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors"
                                title="Edit product"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => confirmArchive(p)}
                                className="p-1.5 rounded-lg border border-destructive/20 hover:bg-destructive/10 text-destructive/70 hover:text-destructive transition-colors"
                                title="Archive product"
                              >
                                <Archive className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/40">Archived</span>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3.5 border-t border-border flex items-center justify-between bg-secondary/30 text-xs">
            <span className="text-muted-foreground">
              Page {page} of {totalPages} · {totalItems} indexed products
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1 || loading}
                onClick={() => setPage(page - 1)}
                className="p-1.5 rounded-lg border border-border hover:bg-secondary disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                disabled={page >= totalPages || loading}
                onClick={() => setPage(page + 1)}
                className="p-1.5 rounded-lg border border-border hover:bg-secondary disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* ── Add Modal ────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showAdd && (
          <Modal open={showAdd} onClose={() => { setShowAdd(false); setForm(emptyForm); }} title="Add New Product" icon={Plus}>
            {renderForm(handleAdd, "Save Product")}
          </Modal>
        )}
      </AnimatePresence>

      {/* ── Edit Modal ───────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showEdit && (
          <Modal open={showEdit} onClose={() => { setShowEdit(false); setForm(emptyForm); }} title={`Edit: ${editTarget?.name}`} icon={Edit3}>
            {renderForm(handleEdit, "Save Changes")}
          </Modal>
        )}
      </AnimatePresence>

      {/* ── Archive Confirmation Modal ───────────────────────────────────────── */}
      <AnimatePresence>
        {showArchiveConfirm && (
          <Modal open={showArchiveConfirm} onClose={() => setShowArchiveConfirm(false)} title="Archive Product" icon={Archive}>
            <div className="space-y-4">
              <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
                <p className="text-sm text-foreground font-medium mb-1">
                  Archive <span className="text-yellow-400">{archiveTarget?.name}</span>?
                </p>
                <p className="text-xs text-muted-foreground">
                  This product will be archived from active catalog but all historical invoices will remain intact.
                </p>
              </div>
              <div className="flex gap-2.5">
                <button
                  onClick={() => setShowArchiveConfirm(false)}
                  className="flex-1 px-4 py-2.5 border border-border rounded-xl text-sm text-muted-foreground hover:bg-secondary/50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleArchive}
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Yes, Archive
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}