import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  Search,
  ShoppingCart,
  ArrowLeft,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  Barcode,
  Layers,
  Sparkles,
  X,
  Package
} from "lucide-react";
import { instantSearchProducts, getProductCategories } from "../services/product.api";

export default function POSTerminalPage() {
  const navigate = useNavigate();
  const searchInputRef = useRef(null);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  const businessId = localStorage.getItem("businessId");

  // Fetch categories
  useEffect(() => {
    if (!businessId) return;
    getProductCategories()
      .then((res) => setCategories(res.data?.categories || []))
      .catch((err) => console.error("Error loading categories:", err));
  }, [businessId]);

  // Fetch products with T14 Instant Elastic Search
  const fetchProducts = useCallback(async () => {
    if (!businessId) return;
    try {
      setSearching(true);
      const res = await instantSearchProducts(searchQuery, 40);
      let list = res.data?.results || [];

      // Filter by category if one is selected
      if (selectedCategory) {
        list = list.filter((p) => p.category_name === selectedCategory);
      }

      setProducts(list);
    } catch (err) {
      console.error("Error searching products:", err);
    } finally {
      setSearching(false);
    }
  }, [searchQuery, selectedCategory, businessId]);

  useEffect(() => {
    const delay = setTimeout(() => {
      fetchProducts();
    }, 150); // fast 150ms debounce for typeahead
    return () => clearTimeout(delay);
  }, [fetchProducts]);

  // Keyboard shortcut listeners
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "F9") {
        e.preventDefault();
        handleCheckout();
      } else if (e.key === "F2") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "Escape") {
        e.preventDefault();
        setCart([]);
        toast("Cart cleared", { icon: "🧹" });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cart, customerName, customerPhone, paymentMode]);

  // Add to cart with stock validation check
  const addToCart = (product) => {
    const availableStock = parseFloat(product.available_stock || 0);

    if (availableStock <= 0) {
      toast.error(`"${product.name}" is out of stock!`);
      return;
    }

    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.productId === product.id);
      const currentQty = existing ? existing.quantity : 0;

      if (currentQty >= availableStock) {
        toast.error(`Cannot add more. Only ${availableStock} units available in stock.`);
        return prevCart;
      }

      if (existing) {
        return prevCart.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }

      toast.success(`Added ${product.name} to cart`, { duration: 1500 });
      return [
        ...prevCart,
        {
          productId: product.id,
          name: product.name,
          price: parseFloat(product.selling_price),
          quantity: 1,
          availableStock,
        },
      ];
    });
  };

  // Barcode / Fast Enter Key handler (T14 Rapid POS Billing)
  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const q = searchQuery.trim().toLowerCase();
      if (!q) return;

      // 1. Exact match by barcode or SKU
      const exactMatch = products.find(
        (p) =>
          (p.barcode && p.barcode.toLowerCase() === q) ||
          (p.sku && p.sku.toLowerCase() === q)
      );

      if (exactMatch) {
        addToCart(exactMatch);
        setSearchQuery("");
        return;
      }

      // 2. If exactly one item matches the search query, add it directly
      if (products.length === 1) {
        addToCart(products[0]);
        setSearchQuery("");
        return;
      }

      // 3. Otherwise add the top ranked result if barcode-like (all digits >= 6)
      if (/^\d{6,}$/.test(q) && products.length > 0) {
        addToCart(products[0]);
        setSearchQuery("");
      }
    }
  };

  // Adjust quantity
  const updateQuantity = (productId, delta) => {
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          if (item.productId === productId) {
            const newQty = item.quantity + delta;
            if (newQty > item.availableStock) {
              toast.error(`Cannot exceed available stock of ${item.availableStock} units.`);
              return item;
            }
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  // Calculate totals
  const grandTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // POS Checkout Handler (Task T25 & T30)
  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty!");
      return;
    }

    if (paymentMode === "CREDIT") {
      if (!customerName.trim() || !customerPhone.trim()) {
        toast.error("Customer Name & Phone are required for Credit (Udhaar) checkout.");
        return;
      }
    }

    const checkoutToast = toast.loading("Processing transaction...");
    try {
      setLoading(true);
      const payload = {
        customerName: customerName || "Walk-in Customer",
        customerPhone: customerPhone || null,
        paymentMode,
        items: cart.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      };

      const res = await api.post("/sales/checkout", payload, {
        headers: { "x-business-id": businessId },
      });

      toast.success(
        `Sale completed! Invoice: ${res.data.data.invoice.invoice_number}`,
        { id: checkoutToast, duration: 4000 }
      );

      // Reset POS cart and inputs
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      fetchProducts(); // Refresh stock in product grid
    } catch (err) {
      console.error("Checkout failed:", err);
      toast.error(err.response?.data?.message || "POS Checkout failed.", { id: checkoutToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-background text-foreground overflow-hidden font-sans">
      {/* Left Section: Product Grid & Search */}
      <div className="w-2/3 flex flex-col p-6 border-r border-border bg-background/95">
        <div className="flex justify-between items-center gap-4 mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="p-2 hover:bg-secondary/50 rounded-xl transition border border-border bg-card"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">POS Terminal</h1>
                <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> Rapid Billing
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Scan barcode or instant search by name, SKU & category</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-card border border-border px-3 py-1.5 rounded-lg">
            <span className="font-semibold px-1 py-0.5 bg-secondary border border-border rounded text-[10px]">F2</span> Search
            <span className="ml-2 font-semibold px-1 py-0.5 bg-secondary border border-border rounded text-[10px]">Enter</span> Auto-Add
            <span className="ml-2 font-semibold px-1 py-0.5 bg-secondary border border-border rounded text-[10px]">F9</span> Checkout
            <span className="ml-2 font-semibold px-1 py-0.5 bg-secondary border border-border rounded text-[10px]">ESC</span> Clear
          </div>
        </div>

        {/* Rapid Search Bar with Barcode Scanner Icon */}
        <div className="relative mb-3">
          <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Scan barcode or type product name, SKU, category... Press [Enter] to quick-add"
            className="w-full pl-11 pr-10 py-3 bg-card border border-border rounded-xl focus:ring-2 focus:ring-primary/30 outline-none text-sm transition-all font-sans"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-lg"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Pills (T14 Fast Filtering) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-none">
          <button
            onClick={() => setSelectedCategory("")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
              selectedCategory === ""
                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                : "bg-card border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            All Products ({products.length})
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(selectedCategory === c.name ? "" : c.name)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border flex items-center gap-1.5 ${
                selectedCategory === c.name
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-card border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <Layers className="w-2.5 h-2.5" />
              {c.name}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 align-content-start">
          {products.length === 0 ? (
            <div className="col-span-full py-16 text-center text-muted-foreground border border-dashed border-border rounded-2xl">
              <Package className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
              <p className="font-medium text-sm text-foreground">No products found</p>
              <p className="text-xs text-muted-foreground mt-1">Try another barcode or keyword</p>
            </div>
          ) : (
            products.map((p) => {
              const stock = parseFloat(p.available_stock || 0);
              const isOut = stock <= 0;

              return (
                <div
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className={`bg-card p-4 rounded-xl border transition-all flex flex-col justify-between select-none ${
                    isOut
                      ? "opacity-50 border-destructive/20 cursor-not-allowed bg-card/40"
                      : "border-border hover:border-primary/50 cursor-pointer hover:shadow-md hover:-translate-y-0.5"
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-semibold text-xs text-foreground truncate flex-1">{p.name}</h3>
                      {isOut ? (
                        <span className="text-[9px] bg-destructive/10 text-destructive border border-destructive/20 px-1.5 py-0.5 rounded-full font-bold flex-shrink-0">
                          OUT
                        </span>
                      ) : (
                        <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full font-bold flex-shrink-0">
                          {stock} {p.unit || "pcs"}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {p.category_name && (
                        <span className="text-[9px] bg-secondary border border-border text-foreground/70 px-1.5 py-0.2 rounded font-medium">
                          {p.category_name}
                        </span>
                      )}
                      {p.sku && (
                        <span className="text-[9px] font-mono text-muted-foreground">
                          SKU: {p.sku}
                        </span>
                      )}
                      {p.barcode && (
                        <span className="text-[9px] font-mono text-muted-foreground/60">
                          UPC: {p.barcode}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex justify-between items-center pt-2 border-t border-border/40">
                    <span className="text-foreground font-extrabold text-sm">
                      ₹{parseFloat(p.selling_price).toFixed(2)}
                    </span>
                    <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-1 rounded-lg font-semibold hover:bg-primary/20 transition-colors">
                      + Add
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Section: Quick Cart & Checkout Bar */}
      <div className="w-1/3 bg-card border-l border-border flex flex-col justify-between p-6 shadow-2xl relative z-10">
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
            <h2 className="text-sm font-bold tracking-wider uppercase text-muted-foreground flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-primary" /> Active Cart ({cart.reduce((a, b) => a + b.quantity, 0)})
            </h2>
            {cart.length > 0 && (
              <button
                onClick={() => {
                  setCart([]);
                  toast("Cart cleared", { icon: "🧹" });
                }}
                className="text-[10px] bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/25 px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-colors font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </div>

          {/* Customer Ledger Info inputs */}
          <div className="bg-background/40 border border-border/80 p-3 rounded-xl mb-4 space-y-3">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Customer Details</p>
            <input
              type="text"
              placeholder="Customer Name (optional, required for credit)"
              className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs outline-none focus:border-primary/40 text-foreground"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
            <input
              type="text"
              placeholder="Phone Number (e.g. +91 9876543210)"
              className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs outline-none focus:border-primary/40 text-foreground font-mono"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
            />
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground/60 border border-dashed border-border rounded-xl">
                <ShoppingCart className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-xs font-semibold text-foreground">Cart is empty</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Scan a barcode or click items to add</p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.productId}
                  className="bg-background/80 border border-border p-3 rounded-xl flex items-center justify-between gap-3 shadow-xs"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate text-foreground">{item.name}</p>
                    <p className="text-[10px] font-mono text-muted-foreground">
                      ₹{item.price.toFixed(2)} × {item.quantity} = ₹{(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => updateQuantity(item.productId, -1)}
                      className="p-1 rounded-lg bg-secondary hover:bg-secondary/80 border border-border text-foreground transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-xs font-extrabold">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.productId, 1)}
                      className="p-1 rounded-lg bg-secondary hover:bg-secondary/80 border border-border text-foreground transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Bottom Payment & Checkout Actions */}
        <div className="mt-4 pt-4 border-t border-border space-y-3">
          {/* Payment Mode Selector */}
          <div className="grid grid-cols-4 gap-1.5">
            {["CASH", "UPI", "CARD", "CREDIT"].map((mode) => (
              <button
                key={mode}
                onClick={() => setPaymentMode(mode)}
                className={`py-2 text-[10px] font-bold rounded-lg border transition-all ${
                  paymentMode === mode
                    ? mode === "CREDIT"
                      ? "bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-xs"
                      : "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-background border-border text-muted-foreground hover:bg-secondary/50"
                }`}
              >
                {mode === "CREDIT" ? "UDHAAR" : mode}
              </button>
            ))}
          </div>

          {/* Total & Checkout button */}
          <div className="flex justify-between items-baseline pt-2">
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Grand Total:</span>
            <span className="text-2xl font-black text-foreground">₹{grandTotal.toFixed(2)}</span>
          </div>

          <button
            disabled={cart.length === 0 || loading}
            onClick={handleCheckout}
            className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm tracking-wide hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
          >
            <CreditCard className="w-4 h-4" />
            {loading ? "Processing..." : `Complete Sale (F9)`}
          </button>
        </div>
      </div>
    </div>
  );
}
