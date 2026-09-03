import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  X,
  Edit3,
  IndianRupee,
  ChevronLeft,
  Wallet,
  ReceiptText,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeft,
  Loader2,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  Clock,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  Activity,
  RefreshCw,
} from "lucide-react";
import {
  getCustomers,
  createCustomer,
  updateCustomer,
  getCustomerOutstanding,
  getBusinessOutstandingSummary,
  getBusinessOutstandingTotals,
  recordCustomerPayment,
  getCustomerLedger,
  getCustomerPaymentHistory,
} from "../services/customer.api";

// ─── Utility ─────────────────────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(n ?? 0);

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-base font-semibold text-foreground">{title}</h2>
              <button onClick={onClose} className="p-1.5 hover:bg-secondary/60 rounded-xl transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="px-6 py-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────
function Input({ label, icon: Icon, required, ...props }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <div className="relative">
        {Icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Icon className="w-4 h-4" />
          </span>
        )}
        <input
          {...props}
          className={`w-full bg-background border border-border rounded-xl py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all ${Icon ? "pl-9 pr-3" : "px-3"}`}
        />
      </div>
    </div>
  );
}

// ─── Customer Card ─────────────────────────────────────────────────────────────
function CustomerCard({ customer, onClick }) {
  const initials = customer.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      whileHover={{ y: -2 }}
      onClick={() => onClick(customer)}
      className="bg-card border border-border rounded-2xl p-5 cursor-pointer hover:border-muted-foreground/30 hover:shadow-lg transition-all duration-200 group"
    >
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm truncate">{customer.name}</p>
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <Phone className="w-3 h-3 flex-shrink-0" />
            <span>{customer.phone}</span>
          </div>
          {customer.email && (
            <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground truncate">
              <Mail className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{customer.email}</span>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[10px] text-muted-foreground/50">Since</span>
          <span className="text-[11px] text-muted-foreground">{new Date(customer.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}</span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function CustomersPage() {
  const navigate = useNavigate();

  // List state
  const [customers, setCustomers] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [search, setSearch] = useState("");

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Drawer / detail view
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [outstanding, setOutstanding] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Form state
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "" });
  const [payForm, setPayForm] = useState({ amount: "", paymentMode: "CASH", notes: "" });

  // T34: Real-time outstanding state
  const [outstandingTotals, setOutstandingTotals] = useState(null);
  const [outstandingDebtors, setOutstandingDebtors] = useState([]);
  const [loadingTotals, setLoadingTotals] = useState(false);
  const [showOutstandingPanel, setShowOutstandingPanel] = useState(false);

  // T35: Payment History state
  const [paymentSummary, setPaymentSummary] = useState(null);
  const [ledgerTab, setLedgerTab] = useState("ALL"); // "ALL" | "PAYMENTS"

  // ── Fetch customers ──
  const fetchCustomers = useCallback(async () => {
    try {
      setLoadingList(true);
      const res = await getCustomers(search);
      setCustomers(res.data?.customers || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load customers");
    } finally {
      setLoadingList(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(fetchCustomers, 300);
    return () => clearTimeout(t);
  }, [fetchCustomers]);

  // T34: Fetch business-wide outstanding totals on mount
  const fetchOutstandingTotals = useCallback(async () => {
    try {
      setLoadingTotals(true);
      const [totalsRes, summaryRes] = await Promise.all([
        getBusinessOutstandingTotals(),
        getBusinessOutstandingSummary(),
      ]);
      setOutstandingTotals(totalsRes.data);
      setOutstandingDebtors(summaryRes.data?.debtors || []);
    } catch {
      // silently fail — not critical
    } finally {
      setLoadingTotals(false);
    }
  }, []);

  useEffect(() => { fetchOutstandingTotals(); }, [fetchOutstandingTotals]);

  // ── Fetch detail ──
  const fetchDetail = async (customer) => {
    setSelectedCustomer(customer);
    setLoadingDetail(true);
    setLedgerTab("ALL");
    try {
      const [outRes, ledRes] = await Promise.all([
        getCustomerOutstanding(customer.id),
        getCustomerLedger(customer.id),
      ]);
      setOutstanding(outRes.data);
      // T35: ledger endpoint now returns { transactions, payment_summary }
      const ledgerData = ledRes.data;
      setLedger(ledgerData?.transactions || ledgerData || []);
      setPaymentSummary(ledgerData?.payment_summary || null);
    } catch {
      setOutstanding(null);
      setLedger([]);
      setPaymentSummary(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  // ── Create customer ──
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) return toast.error("Name and phone are required");
    try {
      setSubmitting(true);
      await createCustomer(form);
      toast.success("Customer registered successfully!");
      setShowAddModal(false);
      setForm({ name: "", phone: "", email: "", address: "" });
      fetchCustomers();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to create customer");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Update customer ──
  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const updated = await updateCustomer(selectedCustomer.id, form);
      toast.success("Customer updated!");
      setShowEditModal(false);
      setSelectedCustomer(updated.data?.customer || { ...selectedCustomer, ...form });
      fetchCustomers();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update customer");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Record payment ──
  const handlePayment = async (e) => {
    e.preventDefault();
    if (!payForm.amount || parseFloat(payForm.amount) <= 0) return toast.error("Enter a valid amount");
    try {
      setSubmitting(true);
      const res = await recordCustomerPayment(selectedCustomer.id, {
        ...payForm,
        amount: parseFloat(payForm.amount),
      });
      toast.success(`₹${payForm.amount} payment recorded!`);
      setShowPayModal(false);
      setPayForm({ amount: "", paymentMode: "CASH", notes: "" });
      fetchDetail(selectedCustomer);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Payment failed");
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = () => {
    setForm({
      name: selectedCustomer.name,
      phone: selectedCustomer.phone,
      email: selectedCustomer.email || "",
      address: selectedCustomer.address || "",
    });
    setShowEditModal(true);
  };

  const openAdd = () => {
    setForm({ name: "", phone: "", email: "", address: "" });
    setShowAddModal(true);
  };

  // ── Derived ──
  const outstandingBalance = parseFloat(outstanding?.outstanding_balance ?? 0);

  // ─────────────────────────────────────────────────────────────────────────────
  // DETAIL VIEW
  // ─────────────────────────────────────────────────────────────────────────────
  if (selectedCustomer) {
    const initials = selectedCustomer.name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    return (
      <div className="min-h-screen bg-background text-foreground p-4 md:p-8 max-w-3xl mx-auto">
        {/* Back */}
        <button
          onClick={() => setSelectedCustomer(null)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Customers
        </button>

        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-2xl p-6 mb-4"
        >
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xl">
              {initials}
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground">{selectedCustomer.name}</h1>
              <div className="flex flex-wrap gap-3 mt-2">
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Phone className="w-3.5 h-3.5" /> {selectedCustomer.phone}
                </span>
                {selectedCustomer.email && (
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Mail className="w-3.5 h-3.5" /> {selectedCustomer.email}
                  </span>
                )}
                {selectedCustomer.address && (
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5" /> {selectedCustomer.address}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(`/customers/${selectedCustomer.id}/profile`)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border hover:bg-secondary/50 transition-colors text-muted-foreground hover:text-foreground text-xs font-medium"
              >
                <Activity className="w-3.5 h-3.5" />
                CRM Profile
              </button>
              <button
                onClick={openEdit}
                className="p-2.5 rounded-xl border border-border hover:bg-secondary/50 transition-colors text-muted-foreground hover:text-foreground"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Outstanding Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-4"
        >
          {loadingDetail ? (
            <div className="bg-card border border-border rounded-2xl p-6 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div
              className="relative overflow-hidden rounded-2xl p-6"
              style={{
                background:
                  outstandingBalance > 0
                    ? "linear-gradient(135deg, hsl(var(--card)) 50%, rgba(239,68,68,0.07) 100%)"
                    : "linear-gradient(135deg, hsl(var(--card)) 50%, rgba(16,185,129,0.07) 100%)",
                border: `1px solid ${outstandingBalance > 0 ? "rgba(239,68,68,0.25)" : "rgba(16,185,129,0.25)"}`,
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-2 mb-1">
                    <Wallet className="w-4 h-4" /> Outstanding Balance
                  </p>
                  <p
                    className={`text-3xl font-bold ${outstandingBalance > 0 ? "text-red-400" : "text-emerald-400"}`}
                  >
                    {fmt(outstandingBalance)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {outstandingBalance > 0 ? (
                    <button
                      onClick={() => setShowPayModal(true)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-emerald-500/20"
                    >
                      <IndianRupee className="w-4 h-4" />
                      Collect Payment
                    </button>
                  ) : (
                    <span className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                      <CheckCircle2 className="w-4 h-4" /> Fully Settled
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* T35: Payment & Credit History Panel */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-2xl overflow-hidden"
        >
          {/* Panel Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-3">
            <div className="flex items-center gap-2">
              <ReceiptText className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-semibold text-foreground text-sm">Payment History</h2>
            </div>
            {/* Tab toggle */}
            <div className="flex bg-secondary border border-border rounded-lg p-0.5 text-xs">
              {["ALL", "PAYMENTS"].map(tab => (
                <button
                  key={tab}
                  onClick={() => setLedgerTab(tab)}
                  className={`px-3 py-1 rounded-md transition-all ${
                    ledgerTab === tab
                      ? "bg-card text-foreground font-medium shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab === "ALL" ? "All Entries" : "Payments Only"}
                </button>
              ))}
            </div>
          </div>

          {/* T35: Payment Summary Stats Row */}
          {paymentSummary && paymentSummary.total_payments > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 px-6 pb-4">
              {[
                { label: "Payments Made", value: paymentSummary.total_payments, color: "text-emerald-400" },
                { label: "Total Paid", value: fmt(paymentSummary.total_paid), color: "text-emerald-400" },
                { label: "Avg Payment", value: fmt(paymentSummary.avg_payment), color: "text-primary" },
                { label: "Largest", value: fmt(paymentSummary.largest_payment), color: "text-blue-400" },
              ].map((s, i) => (
                <div key={i} className="bg-secondary/40 border border-border/40 rounded-xl px-3 py-2">
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  <p className={`text-sm font-bold ${s.color} mt-0.5`}>{s.value}</p>
                </div>
              ))}
            </div>
          )}

          <div className="px-6 pb-6">
            {loadingDetail ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : ledger.length === 0 ? (
              <div className="text-center py-10">
                <Clock className="w-8 h-8 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground text-sm">No transactions yet</p>
              </div>
            ) : (() => {
              // T35: filter by active tab
              const filtered = ledgerTab === "PAYMENTS"
                ? ledger.filter(tx => {
                    const isPayment = tx.type === "PAYMENT_RECEIVED" || (parseFloat(tx.credit_amount) > 0 && parseFloat(tx.debit_amount) === 0);
                    return isPayment;
                  })
                : ledger;

              if (filtered.length === 0) {
                return (
                  <div className="text-center py-8">
                    <CheckCircle2 className="w-7 h-7 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-muted-foreground text-sm">No payment settlements recorded yet</p>
                  </div>
                );
              }

              return (
                <div className="space-y-2">
                  {filtered.map((tx, i) => {
                    const isPayment = tx.type === "PAYMENT_RECEIVED" || (parseFloat(tx.credit_amount) > 0 && parseFloat(tx.debit_amount) === 0);
                    const displayAmount = isPayment
                      ? parseFloat(tx.credit_amount || tx.amount_paid || 0)
                      : parseFloat(tx.debit_amount || 0);
                    const balanceAfter = tx.balance_snapshot ?? tx.balance_after ?? tx.current_balance;
                    const balanceBefore = tx.balance_before ?? null;

                    // Payment mode badge
                    const mode = tx.payment_mode || (
                      tx.notes?.toLowerCase().includes("upi") ? "UPI" :
                      tx.notes?.toLowerCase().includes("card") ? "CARD" :
                      tx.notes?.toLowerCase().includes("bank") || tx.notes?.toLowerCase().includes("neft") ? "BANK" : null
                    );
                    const modeBadge = {
                      CASH: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
                      UPI: "bg-violet-500/10 text-violet-400 border-violet-500/20",
                      CARD: "bg-blue-500/10 text-blue-400 border-blue-500/20",
                      BANK: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
                    };

                    return (
                      <div key={tx.id || i} className="flex items-start gap-3 p-3 rounded-xl bg-secondary/30 border border-border/50 hover:border-border transition-colors">
                        {/* Icon */}
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          isPayment ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                        }`}>
                          {isPayment ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                        </div>

                        {/* Description + Date + Mode */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs font-medium text-foreground truncate">
                              {tx.notes || (isPayment ? "Payment received" : "Credit sale (Udhaar)")}
                            </p>
                            {/* Payment mode badge */}
                            {isPayment && mode && (
                              <span className={`text-[9px] font-semibold border px-1.5 py-0.5 rounded ${modeBadge[mode] || "bg-secondary text-muted-foreground border-border"}` }>
                                {mode}
                              </span>
                            )}
                            {/* Invoice badge */}
                            {tx.sale_id && (
                              <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground/60 bg-secondary border border-border/40 px-1.5 py-0.5 rounded">
                                <ShoppingBag className="w-2.5 h-2.5" /> Invoice
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <p className="text-[10px] text-muted-foreground">{fmtDate(tx.created_at)}</p>
                            {/* T35: Balance before → after for payment entries */}
                            {isPayment && balanceBefore !== null && balanceAfter !== null && (
                              <p className="text-[10px] text-muted-foreground/60">
                                {fmt(balanceBefore)} → {fmt(balanceAfter)}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Amount */}
                        <div className="text-right flex-shrink-0">
                          <p className={`text-sm font-bold ${
                            isPayment ? "text-emerald-400" : "text-red-400"
                          }`}>
                            {isPayment ? "-" : "+"}{fmt(displayAmount)}
                          </p>
                          {!isPayment && balanceAfter !== undefined && balanceAfter !== null && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">Bal: {fmt(balanceAfter)}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </motion.div>

        {/* Edit Modal */}
        <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Customer">
          <form onSubmit={handleUpdate} className="space-y-4">
            <Input label="Full Name" icon={UserCheck} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="John Doe" />
            <Input label="Phone Number" icon={Phone} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required placeholder="+91 98765 43210" />
            <Input label="Email (Optional)" icon={Mail} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="john@example.com" />
            <Input label="Address (Optional)" icon={MapPin} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="123, Main Street..." />
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 px-4 py-2.5 border border-border rounded-xl text-sm text-muted-foreground hover:bg-secondary/50 transition-colors">Cancel</button>
              <button type="submit" disabled={submitting} className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Changes
              </button>
            </div>
          </form>
        </Modal>

        {/* Payment Modal */}
        <Modal open={showPayModal} onClose={() => setShowPayModal(false)} title="Record Payment">
          <form onSubmit={handlePayment} className="space-y-4">
            <div className="p-4 bg-secondary/30 border border-border rounded-xl text-sm">
              <p className="text-muted-foreground">Outstanding for <span className="text-foreground font-medium">{selectedCustomer.name}</span></p>
              <p className="text-2xl font-bold text-red-400 mt-1">{fmt(outstandingBalance)}</p>
            </div>
            <Input label="Amount (₹)" icon={IndianRupee} type="number" min="1" step="0.01" required value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} placeholder="500.00" />
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Payment Mode</label>
              <div className="grid grid-cols-4 gap-2">
                {["CASH", "UPI", "CARD", "BANK"].map((mode) => (
                  <button key={mode} type="button" onClick={() => setPayForm({ ...payForm, paymentMode: mode })}
                    className={`py-2 rounded-xl text-xs font-medium border transition-all ${payForm.paymentMode === mode ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground hover:border-muted-foreground/40"}`}
                  >{mode}</button>
                ))}
              </div>
            </div>
            <Input label="Notes (Optional)" value={payForm.notes} onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })} placeholder="e.g. Partial payment for April..." />
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowPayModal(false)} className="flex-1 px-4 py-2.5 border border-border rounded-xl text-sm text-muted-foreground hover:bg-secondary/50 transition-colors">Cancel</button>
              <button type="submit" disabled={submitting} className="flex-1 px-4 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-400 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm Payment
              </button>
            </div>
          </form>
        </Modal>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // LIST VIEW
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 max-w-5xl mx-auto">
        <div>
          <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-2 transition-colors text-sm">
            <ChevronLeft className="w-4 h-4" /> Dashboard
          </button>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Customers</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage customer profiles and credit ledger</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, email…"
              className="pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50 w-56 transition-all"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            Add Customer
          </motion.button>
        </div>
      </div>

      {/* T34: Real-Time Outstanding Summary Panel */}
      <div className="max-w-5xl mx-auto mb-6">
        {/* Totals Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          {[
            {
              label: "Total Customers",
              value: loadingList ? "…" : customers.length,
              icon: Users,
              color: "text-primary",
              sub: null
            },
            {
              label: "With Active Debt",
              value: loadingTotals ? "…" : (outstandingTotals?.customers_with_debt ?? "—"),
              icon: TrendingDown,
              color: outstandingTotals?.customers_with_debt > 0 ? "text-red-400" : "text-emerald-400",
              sub: null
            },
            {
              label: "Total Outstanding",
              value: loadingTotals ? "…" : fmt(outstandingTotals?.total_outstanding),
              icon: Wallet,
              color: outstandingTotals?.total_outstanding > 0 ? "text-orange-400" : "text-emerald-400",
              sub: `Collected: ${fmt(outstandingTotals?.total_collected)}`
            },
            {
              label: "Highest Debtor",
              value: loadingTotals ? "…" : fmt(outstandingTotals?.highest_outstanding),
              icon: Activity,
              color: "text-rose-400",
              sub: outstandingDebtors[0]?.customer_name || null
            },
          ].map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="bg-card border border-border rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              {s.sub && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{s.sub}</p>}
            </motion.div>
          ))}
        </div>

        {/* T34 Debtors Panel Toggle */}
        {outstandingTotals?.customers_with_debt > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-orange-500/20 rounded-2xl overflow-hidden"
            style={{ background: "linear-gradient(135deg, hsl(var(--card)) 70%, rgba(249,115,22,0.04) 100%)" }}
          >
            <button
              onClick={() => setShowOutstandingPanel(p => !p)}
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-secondary/30 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                  <TrendingDown className="w-3.5 h-3.5 text-orange-400" />
                </div>
                <span className="text-sm font-semibold text-foreground">Active Debtors</span>
                <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full">
                  {outstandingTotals.customers_with_debt} customers
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); fetchOutstandingTotals(); }}
                  className="p-1.5 hover:bg-secondary/60 rounded-lg text-muted-foreground transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingTotals ? "animate-spin" : ""}`} />
                </button>
                <span className="text-muted-foreground text-xs">{showOutstandingPanel ? "▲ Hide" : "▼ Show"}</span>
              </div>
            </button>

            <AnimatePresence>
              {showOutstandingPanel && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-4 space-y-2 max-h-64 overflow-y-auto">
                    {outstandingDebtors.map((d, i) => (
                      <div
                        key={d.customer_id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-border/50 hover:border-orange-500/20 cursor-pointer transition-colors"
                        onClick={() => fetchDetail({ id: d.customer_id, name: d.customer_name, phone: d.customer_phone, email: d.email })}
                      >
                        <span className="text-xs font-bold text-muted-foreground w-5 text-center">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{d.customer_name}</p>
                          <p className="text-[10px] text-muted-foreground">{d.customer_phone}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-red-400">{fmt(d.outstanding_balance)}</p>
                          <p className="text-[10px] text-muted-foreground">{d.credit_transaction_count} credit sale{d.credit_transaction_count !== 1 ? "s" : ""}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Customer Grid */}
      <div className="max-w-5xl mx-auto">
        {loadingList ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : customers.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-secondary border border-border flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <p className="text-foreground font-medium">No customers yet</p>
            <p className="text-muted-foreground text-sm mt-1">Add your first customer to get started</p>
            <button onClick={openAdd} className="mt-4 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
              + Add Customer
            </button>
          </motion.div>
        ) : (
          <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {customers.map((c) => (
                <CustomerCard key={c.id} customer={c} onClick={fetchDetail} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Add Customer Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Register New Customer">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Full Name" icon={UserCheck} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="John Doe" />
          <Input label="Phone Number" icon={Phone} required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" />
          <Input label="Email (Optional)" icon={Mail} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="john@example.com" />
          <Input label="Address (Optional)" icon={MapPin} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="123, Main Street..." />
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2.5 border border-border rounded-xl text-sm text-muted-foreground hover:bg-secondary/50 transition-colors">Cancel</button>
            <button type="submit" disabled={submitting} className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Register Customer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
