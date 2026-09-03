import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Users,
  Phone,
  Mail,
  MapPin,
  Wallet,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Calendar,
  Star,
  Clock,
  CreditCard,
  BarChart3,
  Package,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  IndianRupee,
  Activity,
  Zap,
} from "lucide-react";
import { getCustomerCRMProfile, getCustomerOutstanding } from "../services/customer.api";

// ─── Utilities ────────────────────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n ?? 0);

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

// ─── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ data, color = "#6366f1" }) {
  if (!data || data.length === 0) return <div className="h-12 flex items-end text-[10px] text-muted-foreground">No data</div>;
  const maxVal = Math.max(...data.map((d) => d.total_spend), 1);
  const barW = Math.max(100 / data.length - 1, 4);

  return (
    <div className="flex items-end gap-[2px] h-12 w-full">
      {data.map((d, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-sm transition-all duration-300 cursor-default group relative"
          style={{
            height: `${Math.max((d.total_spend / maxVal) * 100, 6)}%`,
            background: `${color}`,
            opacity: 0.5 + 0.5 * (i / data.length),
          }}
          title={`${d.month_label}: ${fmt(d.total_spend)}`}
        >
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-popover border border-border text-[9px] text-foreground px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            {d.month_label}: {fmt(d.total_spend)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Debt Aging Bar ───────────────────────────────────────────────────────────
function DebtAgingBar({ aging }) {
  const total =
    aging.aging_0_30 + aging.aging_31_60 + aging.aging_61_90 + aging.aging_90_plus;
  if (total === 0) return null;

  const buckets = [
    { label: "0–30d", value: aging.aging_0_30, color: "bg-emerald-500", textColor: "text-emerald-400" },
    { label: "31–60d", value: aging.aging_31_60, color: "bg-yellow-500", textColor: "text-yellow-400" },
    { label: "61–90d", value: aging.aging_61_90, color: "bg-orange-500", textColor: "text-orange-400" },
    { label: "90d+", value: aging.aging_90_plus, color: "bg-red-500", textColor: "text-red-400" },
  ].filter((b) => b.value > 0);

  return (
    <div className="space-y-2">
      <div className="flex h-3 rounded-full overflow-hidden gap-px">
        {buckets.map((b, i) => (
          <div
            key={i}
            className={`${b.color} rounded-full`}
            style={{ width: `${(b.value / total) * 100}%` }}
            title={`${b.label}: ${fmt(b.value)}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        {buckets.map((b, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${b.color}`} />
            <span className="text-[10px] text-muted-foreground">{b.label}</span>
            <span className={`text-[10px] font-semibold ${b.textColor}`}>{fmt(b.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main CRM Page ────────────────────────────────────────────────────────────
export default function CustomerCRMPage() {
  const navigate = useNavigate();
  const { customerId } = useParams();

  const [profile, setProfile] = useState(null);
  const [outstanding, setOutstanding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [profileRes, outRes] = await Promise.all([
          getCustomerCRMProfile(customerId),
          getCustomerOutstanding(customerId),
        ]);
        setProfile(profileRes.data);
        setOutstanding(outRes.data);
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load customer profile");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [customerId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Loading CRM profile…</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-foreground font-medium">{error || "Customer not found"}</p>
          <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-secondary rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const { customer, sales, debt_aging, top_products, monthly_trend, payment_track } = profile;
  const outstandingBalance = parseFloat(outstanding?.outstanding_balance ?? 0);

  const initials = customer.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Customer health score (0-100): based on payment rate and recency
  const paymentRate = sales.total_visits > 0 ? sales.paid_visits / sales.total_visits : 1;
  const recencyScore = Math.max(0, 1 - sales.days_since_last_visit / 90);
  const healthScore = Math.round((paymentRate * 0.6 + recencyScore * 0.4) * 100);
  const healthColor =
    healthScore >= 80 ? "text-emerald-400" : healthScore >= 50 ? "text-yellow-400" : "text-red-400";
  const healthBg =
    healthScore >= 80 ? "bg-emerald-500/10 border-emerald-500/20" : healthScore >= 50 ? "bg-yellow-500/10 border-yellow-500/20" : "bg-red-500/10 border-red-500/20";
  const healthLabel =
    healthScore >= 80 ? "Excellent" : healthScore >= 60 ? "Good" : healthScore >= 40 ? "Fair" : "At Risk";

  const modeBadge = {
    CASH: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    UPI: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    CARD: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    BANK: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8 max-w-4xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Customers
      </button>

      {/* ── Header: Customer Identity + Health Score ─────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl p-6 mb-4"
        style={{ background: "linear-gradient(135deg, hsl(var(--card)) 60%, hsl(var(--primary)/0.04) 100%)" }}
      >
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xl flex-shrink-0">
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h1 className="text-xl font-bold text-foreground">{customer.name}</h1>
                <div className="flex flex-wrap gap-3 mt-1.5">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Phone className="w-3 h-3" /> {customer.phone}
                  </span>
                  {customer.email && (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Mail className="w-3 h-3" /> {customer.email}
                    </span>
                  )}
                  {customer.address && (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" /> {customer.address}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Customer since {fmtDate(customer.customer_since)}
                </p>
              </div>

              {/* CRM Health Score */}
              <div className={`flex flex-col items-center px-4 py-2.5 rounded-xl border ${healthBg}`}>
                <span className="text-[10px] text-muted-foreground mb-0.5">CRM Score</span>
                <span className={`text-2xl font-black ${healthColor}`}>{healthScore}</span>
                <span className={`text-[10px] font-semibold ${healthColor}`}>{healthLabel}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Key Metrics Row ──────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4"
      >
        {[
          {
            label: "Total Spend",
            value: fmt(sales.total_spend),
            sub: `${sales.total_visits} visit${sales.total_visits !== 1 ? "s" : ""}`,
            icon: IndianRupee,
            color: "text-primary",
            bg: "bg-primary/10 border-primary/20",
          },
          {
            label: "Avg Purchase",
            value: fmt(sales.avg_spend),
            sub: `Max: ${fmt(sales.largest_purchase)}`,
            icon: TrendingUp,
            color: "text-emerald-400",
            bg: "bg-emerald-500/10 border-emerald-500/20",
          },
          {
            label: "Outstanding",
            value: fmt(outstandingBalance),
            sub: outstandingBalance > 0 ? "Active debt" : "Fully cleared",
            icon: Wallet,
            color: outstandingBalance > 0 ? "text-red-400" : "text-emerald-400",
            bg: outstandingBalance > 0 ? "bg-red-500/10 border-red-500/20" : "bg-emerald-500/10 border-emerald-500/20",
          },
          {
            label: "Last Visit",
            value: sales.last_visit_at ? `${Math.round(sales.days_since_last_visit)}d ago` : "—",
            sub: fmtDate(sales.last_visit_at),
            icon: Clock,
            color: sales.days_since_last_visit > 30 ? "text-orange-400" : "text-blue-400",
            bg: sales.days_since_last_visit > 30 ? "bg-orange-500/10 border-orange-500/20" : "bg-blue-500/10 border-blue-500/20",
          },
        ].map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 + i * 0.05 }}
            className="bg-card border border-border rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-muted-foreground">{s.label}</span>
              <div className={`w-6 h-6 rounded-lg ${s.bg} border flex items-center justify-center`}>
                <s.icon className={`w-3 h-3 ${s.color}`} />
              </div>
            </div>
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{s.sub}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Row 2: Monthly Spend Trend + Payment Profile ─────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Monthly Spend Sparkline */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="bg-card border border-border rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Monthly Spend</h3>
            </div>
            <span className="text-[10px] text-muted-foreground">Last 12 months</span>
          </div>
          <Sparkline data={monthly_trend} color="hsl(var(--primary))" />
          {monthly_trend.length === 0 && (
            <p className="text-center text-xs text-muted-foreground py-4">No purchase history yet</p>
          )}
        </motion.div>

        {/* Payment Profile */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
          className="bg-card border border-border rounded-2xl p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Payment Profile</h3>
          </div>

          <div className="space-y-3">
            {/* Paid vs Credit split */}
            <div>
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                <span>Paid ({sales.paid_visits} visits)</span>
                <span>Credit ({sales.credit_visits} visits)</span>
              </div>
              {sales.total_visits > 0 && (
                <div className="flex h-2 rounded-full overflow-hidden gap-px">
                  <div
                    className="bg-emerald-500 rounded-l-full"
                    style={{ width: `${(sales.paid_visits / sales.total_visits) * 100}%` }}
                  />
                  <div
                    className="bg-red-500 rounded-r-full"
                    style={{ width: `${(sales.credit_visits / sales.total_visits) * 100}%` }}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-secondary/40 rounded-lg p-2.5">
                <p className="text-[10px] text-muted-foreground">Preferred Mode</p>
                <span className={`text-xs font-bold border px-2 py-0.5 rounded mt-1 inline-block ${modeBadge[sales.preferred_payment_mode] || "bg-secondary text-foreground border-border"}`}>
                  {sales.preferred_payment_mode}
                </span>
              </div>
              <div className="bg-secondary/40 rounded-lg p-2.5">
                <p className="text-[10px] text-muted-foreground">Repayments</p>
                <p className="text-sm font-bold text-emerald-400 mt-0.5">
                  {payment_track.total_payments} × {fmt(payment_track.avg_payment)} avg
                </p>
              </div>
            </div>

            <div className="text-[10px] text-muted-foreground flex justify-between">
              <span>First visit: {fmtDate(sales.first_visit_at)}</span>
              <span>Total paid back: {fmt(payment_track.total_paid)}</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Debt Aging ────────────────────────────────────────────────────────── */}
      {debt_aging.total_credit_taken > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="bg-card border border-orange-500/20 rounded-2xl p-5 mb-4"
          style={{ background: "linear-gradient(135deg, hsl(var(--card)) 70%, rgba(249,115,22,0.04) 100%)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-400" />
              <h3 className="text-sm font-semibold text-foreground">Debt Aging Analysis</h3>
            </div>
            <span className="text-xs text-muted-foreground">
              Total credit taken: <span className="text-orange-400 font-semibold">{fmt(debt_aging.total_credit_taken)}</span>
            </span>
          </div>
          <DebtAgingBar aging={debt_aging} />
          {debt_aging.aging_90_plus > 0 && (
            <div className="mt-3 flex items-center gap-2 text-[11px] text-red-400 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              {fmt(debt_aging.aging_90_plus)} of credit debt is over 90 days old — follow up required
            </div>
          )}
        </motion.div>
      )}

      {/* ── Top Products ──────────────────────────────────────────────────────── */}
      {top_products.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className="bg-card border border-border rounded-2xl p-5 mb-4"
        >
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Top Purchased Products</h3>
            <span className="text-[10px] text-muted-foreground ml-auto">by frequency</span>
          </div>
          <div className="space-y-2">
            {top_products.map((p, i) => {
              const maxRevenue = top_products[0].total_revenue;
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground w-4 text-center">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-medium text-foreground truncate">{p.product_name}</p>
                      <span className="text-xs font-bold text-primary ml-2 flex-shrink-0">{fmt(p.total_revenue)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${(p.total_revenue / maxRevenue) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">
                        {p.purchase_count}× · {p.total_qty} units
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── Activity Summary Footer ───────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.26 }}
        className="bg-card border border-border rounded-2xl p-5"
      >
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Activity Summary</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Visits", value: sales.total_visits, icon: Users },
            { label: "Paid Visits", value: sales.paid_visits, icon: CheckCircle2 },
            { label: "Credit Visits", value: sales.credit_visits, icon: TrendingDown },
          ].map((s, i) => (
            <div key={i} className="text-center p-3 bg-secondary/30 rounded-xl border border-border/40">
              <s.icon className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
