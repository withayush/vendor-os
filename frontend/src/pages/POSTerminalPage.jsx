import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import { Search, ShoppingCart, ArrowLeft, Trash2, Plus, Minus, CreditCard } from "lucide-react";

export default function POSTerminalPage() {
  const navigate = useNavigate();
  const searchInputRef = useRef(null);

  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [loading, setLoading] = useState(false);

  const businessId = localStorage.getItem("businessId");

  // Fetch products
  const fetchProducts = async () => {
    if (!businessId) return;
    try {
      const res = await api.get(`/products?search=${searchQuery}&limit=100`, {
        headers: { "x-business-id": businessId }
      });
      setProducts(res.data.data.products || []);
    } catch (err) {
      console.error("Error fetching products:", err);
      toast.error("Failed to load products list");
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [searchQuery, businessId]);

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

      toast.success(`Added ${product.name} to cart`);
      return [
        ...prevCart,
        {
          productId: product.id,
          name: product.name,
          price: parseFloat(product.selling_price),
          quantity: 1,
          availableStock
        }
      ];
    });
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
        items: cart.map((item) => ({ productId: item.productId, quantity: item.quantity }))
      };

      const res = await api.post("/sales/checkout", payload, {
        headers: { "x-business-id": businessId }
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
        <div className="flex justify-between items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="p-2 hover:bg-secondary/50 rounded-xl transition border border-border bg-card"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl font-bold tracking-tight">POS Terminal</h1>
              <p className="text-xs text-muted-foreground">Quick cashier billing & stock matching</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-card border border-border px-3 py-1.5 rounded-lg">
            <span className="font-semibold px-1 py-0.5 bg-secondary border border-border rounded text-[10px]">F2</span> Search focus
            <span className="ml-2 font-semibold px-1 py-0.5 bg-secondary border border-border rounded text-[10px]">F9</span> Checkout
            <span className="ml-2 font-semibold px-1 py-0.5 bg-secondary border border-border rounded text-[10px]">ESC</span> Clear
          </div>
        </div>

        {/* Large search query input */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search products by name, SKU, barcode... (F2)"
            className="w-full pl-11 pr-4 py-3 bg-card border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 align-content-start">
          {products.length === 0 ? (
            <div className="col-span-full py-16 text-center text-muted-foreground border border-dashed border-border rounded-2xl">
              No products found matching your search.
            </div>
          ) : (
            products.map((p) => {
              const stock = parseFloat(p.available_stock || 0);
              const isLow = stock <= parseFloat(p.reorder_level || 0) && stock > 0;
              const isOut = stock <= 0;

              return (
                <div
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className={`bg-card p-4 rounded-xl border transition-all flex flex-col justify-between select-none ${
                    isOut 
                      ? "opacity-50 border-destructive/20 cursor-not-allowed bg-card/40" 
                      : "border-border hover:border-primary/40 cursor-pointer hover:shadow-sm"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-semibold text-xs truncate flex-1">{p.name}</h3>
                      {isOut ? (
                        <span className="text-[9px] bg-destructive/10 text-destructive border border-destructive/20 px-1.5 py-0.5 rounded-full font-bold">
                          OUT
                        </span>
                      ) : isLow ? (
                        <span className="text-[9px] bg-warning/10 text-warning border border-warning/20 px-1.5 py-0.5 rounded-full font-bold">
                          LOW ({stock})
                        </span>
                      ) : (
                        <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full font-bold">
                          {stock} in stock
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground tracking-wide">SKU: {p.sku || "N/A"}</p>
                  </div>
                  
                  <div className="mt-4 flex justify-between items-center">
                    <span className="text-foreground font-extrabold text-sm">₹{parseFloat(p.selling_price).toFixed(2)}</span>
                    <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-1 rounded-lg font-medium hover:bg-primary/20 transition-colors">
                      Add +
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
              <ShoppingCart className="w-4 h-4 text-primary" /> Active Cart
            </h2>
            {cart.length > 0 && (
              <button
                onClick={() => {
                  setCart([]);
                  toast("Cart cleared", { icon: "🧹" });
                }}
                className="text-[10px] bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/25 px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-colors font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear Cart
              </button>
            )}
          </div>
          
          {/* Customer Ledger Info inputs */}
          <div className="bg-background/40 border border-border/80 p-3 rounded-xl mb-4 space-y-3">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Customer Details</p>
            <input
              type="text"
              placeholder="Customer Name"
              className="w-full p-2 bg-card border border-border rounded-lg text-xs outline-none focus:border-primary/40 transition-colors"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
            <input
              type="text"
              placeholder="Customer Phone (Mandatory for Credit)"
              className="w-full p-2 bg-card border border-border rounded-lg text-xs outline-none focus:border-primary/40 transition-colors"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
            />
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 py-1">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground">
                <ShoppingCart className="w-8 h-8 opacity-25 mb-2" />
                <p className="text-xs">Cart is empty.</p>
                <p className="text-[10px] opacity-75 mt-0.5">Click products on the left to add items</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.productId} className="bg-background/25 border border-border/50 p-2.5 rounded-lg flex justify-between items-center text-xs">
                  <div className="truncate max-w-[170px]">
                    <p className="font-semibold truncate">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      ₹{item.price.toFixed(2)} x {item.quantity}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.productId, -1)}
                      className="p-1 hover:bg-secondary/70 border border-border rounded-md text-foreground transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-bold text-xs min-w-[20px] text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.productId, 1)}
                      className="p-1 hover:bg-secondary/70 border border-border rounded-md text-foreground transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Checkout Bar */}
        <div className="space-y-4 pt-4 border-t border-border mt-4">
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground font-medium">Payment Mode:</span>
            <select
              className="p-1.5 bg-card border border-border rounded-lg text-xs font-semibold focus:outline-none focus:border-primary/40 transition-colors cursor-pointer"
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
            >
              <option value="CASH">CASH</option>
              <option value="UPI">UPI</option>
              <option value="CARD">CARD</option>
              <option value="CREDIT">CREDIT (Udhaar)</option>
            </select>
          </div>

          <div className="flex justify-between items-center border-t border-border pt-4">
            <span className="text-muted-foreground font-medium text-sm">Grand Total:</span>
            <span className="text-primary font-black text-xl">₹{grandTotal.toFixed(2)}</span>
          </div>

          <button
            onClick={handleCheckout}
            disabled={loading || cart.length === 0}
            className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold hover:bg-primary/95 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-xs flex items-center justify-center gap-2 border border-primary/20 shadow-md shadow-primary/5"
          >
            <CreditCard className="w-4 h-4" />
            {loading ? "Processing transaction..." : "Complete Checkout (F9)"}
          </button>
        </div>
      </div>
    </div>
  );
}
