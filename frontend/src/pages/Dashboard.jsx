import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getMyBusiness } from "../services/business.api";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  User,
  Building2,
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
  Boxes,
  Receipt
} from "lucide-react";
import toast from "react-hot-toast";
import LowStockAlerts from "../components/LowStockAlerts";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [business, setBusiness] = useState(null);
  const [loadingBusiness, setLoadingBusiness] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const fetchBusiness = async () => {
      try {
        const response = await getMyBusiness();
        console.log("Dashboard API Response:", response);

        const businessData = response.data?.business || response.data;

        if (businessData && (businessData.id || businessData.business_name)) {
          setBusiness(businessData);
        } else {
          navigate("/business-onboarding", { replace: true });
        }
      } catch (err) {
        console.error("Dashboard Fetch Business Error:", err);
        if (err.response?.status === 404) {
          navigate("/business-onboarding", { replace: true });
        }
      } finally {
        setLoadingBusiness(false);
      }
    };

    fetchBusiness();
  }, [navigate]);

  const handleLogout = () => {
    const toastId = toast.loading('Logging out...');

    try {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('vendor');
      localStorage.removeItem('business');

      logout();

      toast.dismiss(toastId);
      toast.success('Logged out successfully!');

      navigate("/login", { replace: true });
    } catch (error) {
      toast.dismiss(toastId);
      toast.error('Error logging out. Please try again.');
      console.error('Logout error:', error);
    }
  };

  if (loadingBusiness) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground mt-4">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Mobile Sidebar Toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-card border border-border rounded-xl text-foreground hover:bg-secondary/50 transition-all duration-200"
      >
        {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Sidebar - Fixed height with proper layout */}
      <aside className="fixed top-0 left-0 h-full w-72 bg-card border-r border-border p-6 z-40 hidden lg:flex flex-col">
        {/* Logo - Updated to match clean monochrome style */}
        <div className="flex items-center gap-3 mb-6 flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-secondary border border-border flex items-center justify-center flex-shrink-0">
            <LayoutDashboard className="w-5 h-5 text-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground tracking-tight">VendorOS</span>
        </div>

        {/* User Profile - Updated to match clean card style */}
        {user && (
          <div className="p-4 bg-secondary/30 border border-border rounded-xl mb-4 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center text-foreground font-bold text-sm flex-shrink-0">
                {user.fullName?.charAt(0) || user.name?.charAt(0) || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate text-sm text-foreground">{user.fullName || user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation - Scrollable middle section */}
        <nav className="flex-1 overflow-y-auto space-y-1 py-2 scrollbar-thin scrollbar-thumb-secondary scrollbar-track-transparent">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary text-foreground">
            <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1 text-sm font-medium">Dashboard</span>
            <span className="text-[10px] bg-background text-muted-foreground px-2 py-0.5 rounded-full border border-border">Active</span>
          </div>
          <Link to="/products" className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-all duration-200">
            <Package className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1 text-sm">Products</span>
            <span className="text-[10px] bg-secondary/30 text-muted-foreground px-2 py-0.5 rounded-full">0</span>
          </Link>
          <Link to="/inventory" className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-all duration-200">
            <Boxes className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1 text-sm">Inventory</span>
          </Link>
          <Link to="/pos" className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-all duration-200">
            <Receipt className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1 text-sm">POS Terminal</span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">Live</span>
          </Link>
          <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-all duration-200">
            <ShoppingCart className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1 text-sm">Orders</span>
            <span className="text-[10px] bg-secondary/30 text-muted-foreground px-2 py-0.5 rounded-full">0</span>
          </a>
          <Link to="/customers" className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-all duration-200">
            <Users className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1 text-sm">Customers</span>
            <span className="text-[10px] bg-secondary/30 text-muted-foreground px-2 py-0.5 rounded-full">0</span>
          </Link>
          <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-all duration-200">
            <TrendingUp className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1 text-sm">Analytics</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-all duration-200">
            <Settings className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1 text-sm">Settings</span>
          </a>
        </nav>

        {/* LOGOUT BUTTON */}
        <div className="flex-shrink-0 pt-4 border-t border-border mt-2">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all duration-200 group border border-destructive/20"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1 text-left font-medium text-sm">Logout</span>
            <span className="text-[10px] text-destructive/50 group-hover:text-destructive/70 transition-colors">
              Ctrl+Q
            </span>
          </button>

          <div className="mt-3 flex items-center justify-center gap-4 text-[10px] text-muted-foreground/50">
            <button className="hover:text-muted-foreground transition-colors flex items-center gap-1">
              <HelpCircle className="w-3 h-3" />
              Help
            </button>
            <span>•</span>
            <span className="text-muted-foreground/30">v1.0.0</span>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <motion.div
        initial={{ x: -320 }}
        animate={{ x: sidebarOpen ? 0 : -320 }}
        transition={{ duration: 0.3 }}
        className="fixed top-0 left-0 h-full w-72 bg-card border-r border-border p-6 z-40 lg:hidden flex flex-col"
      >
        <div className="flex items-center justify-between mb-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary border border-border flex items-center justify-center flex-shrink-0">
              <LayoutDashboard className="w-5 h-5 text-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">VendorOS</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-secondary/50 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {user && (
          <div className="p-4 bg-secondary/30 border border-border rounded-xl mb-4 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center text-foreground font-bold text-sm flex-shrink-0">
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
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary text-foreground">
            <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1 text-sm font-medium">Dashboard</span>
          </div>
          <Link to="/products" className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-all duration-200">
            <Package className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1 text-sm">Products</span>
          </Link>
          <Link to="/inventory" className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-all duration-200">
            <Boxes className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1 text-sm">Inventory</span>
          </Link>
          <Link to="/pos" className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-all duration-200">
            <Receipt className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1 text-sm">POS Terminal</span>
          </Link>
          <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-all duration-200">
            <ShoppingCart className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1 text-sm">Orders</span>
          </a>
          <Link to="/customers" className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-all duration-200">
            <Users className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1 text-sm">Customers</span>
          </Link>
          <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-all duration-200">
            <TrendingUp className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1 text-sm">Analytics</span>
          </a>
        </nav>

        <div className="flex-shrink-0 pt-4 border-t border-border mt-2">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all duration-200 border border-destructive/20"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1 text-left font-medium text-sm">Logout</span>
          </button>
        </div>
      </motion.div>

      {/* Main Content */}
      <main className="lg:ml-72 p-4 md:p-8">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground text-sm md:text-base mt-1">
              Welcome back, <span className="text-foreground font-medium">{user?.fullName || user?.name || 'Vendor'}</span>! Here's your business overview.
            </p>
          </motion.div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-xl text-sm text-muted-foreground">
              <Search className="w-4 h-4 flex-shrink-0" />
              <span>Search...</span>
            </div>

            <button className="relative p-2 bg-card border border-border rounded-xl hover:bg-secondary/50 transition-all duration-200">
              <Bell className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                3
              </span>
            </button>

            <span className="px-3 py-1.5 md:px-4 md:py-2 bg-card border border-border rounded-xl text-xs md:text-sm text-foreground flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Online
            </span>
          </div>
        </div>

        {/* Low-Stock Limit Warnings Widget */}
        <LowStockAlerts />

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
          {[
            { label: "Total Revenue", value: "₹24,890", change: "+12.5%", icon: TrendingUp },
            { label: "Orders", value: "342", change: "+8.2%", icon: ShoppingCart },
            { label: "Products", value: "1,243", change: "+3.1%", icon: Package },
            { label: "Customers", value: "892", change: "+15.3%", icon: Users },
          ].map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-card border border-border rounded-xl p-4 md:p-6 hover:border-muted-foreground/30 transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground text-xs md:text-sm font-medium">{stat.label}</span>
                <div className="p-1.5 md:p-2 rounded-xl bg-secondary border border-border">
                  <stat.icon className="w-3.5 h-3.5 md:w-4 md:h-4 text-foreground" />
                </div>
              </div>
              <div className="text-lg md:text-2xl font-bold tracking-tight text-foreground">{stat.value}</div>
              <div className="flex items-center gap-1 text-xs md:text-sm text-muted-foreground mt-1">
                <span className="inline-block w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-emerald-500"></span>
                <span className="text-emerald-400 font-medium">{stat.change}</span>
                <span className="text-muted-foreground text-[10px] md:text-xs ml-1">from last month</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* POS Terminal Quick Launch Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mb-6"
        >
          <div
            onClick={() => navigate("/pos")}
            className="relative overflow-hidden bg-card border border-border rounded-2xl p-5 md:p-6 cursor-pointer group hover:border-emerald-500/40 transition-all duration-300"
            style={{ background: "linear-gradient(135deg, hsl(var(--card)) 60%, rgba(16,185,129,0.06) 100%)" }}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500/20 transition-colors">
                  <Receipt className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-base md:text-lg">POS Terminal</h3>
                  <p className="text-xs md:text-sm text-muted-foreground mt-0.5">High-speed billing · Product Grid + Quick Cart · Keyboard shortcuts</p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="hidden md:flex flex-col items-end gap-1">
                  <span className="text-[10px] text-muted-foreground">Shortcuts</span>
                  <div className="flex gap-1">
                    {["F2 Search", "F9 Pay", "ESC Clear"].map(k => (
                      <span key={k} className="text-[9px] bg-secondary border border-border text-muted-foreground px-1.5 py-0.5 rounded font-mono">{k}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-semibold group-hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20">
                  <span>Launch</span>
                  <span className="text-emerald-100">→</span>
                </div>
              </div>
            </div>
            {/* Subtle pulse dot */}
            <div className="absolute top-3 right-3 md:hidden">
              <span className="flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
          </div>
        </motion.div>

        {/* Business Profile Card */}
        {business && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-card border border-border rounded-2xl p-6 hover:border-muted-foreground/30 transition-all duration-300"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-secondary border border-border">
                <Building2 className="w-5 h-5 text-foreground" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Business Profile</h2>
              <span className="ml-auto text-xs bg-secondary border border-border text-foreground px-3 py-1 rounded-full">Active</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div className="p-3 rounded-xl bg-secondary/30 border border-border/50">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Business Name</p>
                <p className="font-medium mt-1 text-sm md:text-base text-foreground">{business.business_name || business.name || 'N/A'}</p>
              </div>
              <div className="p-3 rounded-xl bg-secondary/30 border border-border/50">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Type</p>
                <p className="font-medium mt-1 text-sm md:text-base text-foreground">{business.business_type || business.type || 'N/A'}</p>
              </div>
              <div className="p-3 rounded-xl bg-secondary/30 border border-border/50">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Phone</p>
                <p className="font-medium mt-1 text-sm md:text-base text-foreground">{business.business_phone || business.phone || 'N/A'}</p>
              </div>
              <div className="p-3 rounded-xl bg-secondary/30 border border-border/50">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Address</p>
                <p className="font-medium mt-1 text-sm md:text-base text-foreground">
                  {business.address_line || business.address || 'N/A'}
                  {business.city && `, ${business.city}`}
                  {business.state && `, ${business.state}`}
                  {business.pincode && ` - ${business.pincode}`}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}