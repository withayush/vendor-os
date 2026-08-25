import React, { useEffect, useState } from "react";
import { getVendorProfileApi } from "../../services/vendor.api";
import { useNavigate } from "react-router-dom";

export default function DashboardPage() {
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState("overview"); // overview, details, products
  const navigate = useNavigate();

  useEffect(() => {
    // Timer for real-time clock
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await getVendorProfileApi();
        setVendor(response.data.vendor);
      } catch (err) {
        console.error("Failed to fetch vendor profile:", err);
        if (err.response?.status === 404) {
          navigate("/onboarding");
        } else {
          setError("Unable to retrieve your workspace data. Please verify your connection.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    navigate("/login");
  };

  const getBusinessIcon = (type) => {
    switch (type) {
      case "CATERING":
        return "🍳";
      case "HALWAI":
        return "🍰";
      case "DECORATION":
        return "✨";
      case "PHOTOGRAPHY":
        return "📸";
      case "VENUE":
        return "🏰";
      case "DJ":
        return "🎵";
      default:
        return "💼";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070A13] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-[#4F46E5] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold tracking-wider text-slate-400 uppercase">Synchronizing Workspace...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#070A13] flex items-center justify-center p-4">
        <div className="max-w-md w-full backdrop-blur-md bg-slate-900/50 rounded-2xl border border-red-500/20 p-8 text-center shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Workspace Error</h2>
          <p className="text-sm text-slate-400 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-gradient-to-r from-[#4F46E5] to-indigo-500 text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-indigo-500/30 transition-all duration-300"
          >
            Reconnect
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090D1A] text-slate-100 flex font-sans">
      
      {/* 1. Sidebar */}
      <aside className="w-72 bg-[#0C1224] border-r border-slate-800/80 hidden lg:flex flex-col justify-between p-6">
        <div className="space-y-10">
          {/* Logo with Glow */}
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <span className="font-extrabold text-lg text-white">V</span>
            </div>
            <div>
              <h1 className="text-lg font-black tracking-wider text-white">VendorOS</h1>
              <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Enterprise Hub</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab("overview")}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                activeTab === "overview"
                  ? "bg-indigo-600/10 text-indigo-400 border-l-4 border-indigo-500"
                  : "text-slate-400 hover:bg-slate-800/40 hover:text-white"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
              </svg>
              Overview
            </button>

            <button
              onClick={() => setActiveTab("details")}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                activeTab === "details"
                  ? "bg-indigo-600/10 text-indigo-400 border-l-4 border-indigo-500"
                  : "text-slate-400 hover:bg-slate-800/40 hover:text-white"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Business Details
            </button>

            <button
              onClick={() => setActiveTab("products")}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                activeTab === "products"
                  ? "bg-indigo-600/10 text-indigo-400 border-l-4 border-indigo-500"
                  : "text-slate-400 hover:bg-slate-800/40 hover:text-white"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              Products & Catalog
            </button>
          </nav>
        </div>

        {/* User profile & Logout */}
        <div className="border-t border-slate-800/60 pt-6 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#2842FF] to-violet-500 text-white flex items-center justify-center font-bold text-sm shadow-md">
              {vendor?.business_name ? vendor.business_name[0].toUpperCase() : "V"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white truncate">{vendor?.business_name}</p>
              <span className="text-[10px] text-green-400 font-medium tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block animate-pulse"></span>
                Connected
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl text-sm font-semibold transition-all duration-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* 2. Main Workspace Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Top Navigation / Header */}
        <header className="h-20 bg-[#0C1224] border-b border-slate-800/80 flex items-center justify-between px-8 z-10 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-base font-bold text-white tracking-wide uppercase">
              {activeTab === "overview" && "Dashboard Overview"}
              {activeTab === "details" && "Vendor Profile Configuration"}
              {activeTab === "products" && "Product Catalog Manager"}
            </h2>
          </div>

          {/* Time & Quick Actions */}
          <div className="flex items-center gap-6">
            {/* Real-time Clock */}
            <div className="hidden md:flex flex-col items-end border-r border-slate-800/80 pr-6">
              <span className="text-sm font-bold text-slate-200">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                {currentTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            </div>

            {/* Notification Bell */}
            <div className="relative cursor-pointer text-slate-400 hover:text-white transition">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#0C1224] animate-ping"></span>
            </div>

            {/* Mobile Menu Action */}
            <button
              onClick={handleLogout}
              className="lg:hidden px-4 py-2 bg-red-500/10 text-red-400 text-xs font-bold rounded-xl hover:bg-red-500/20 transition-all duration-300"
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* Dashboard Body */}
        <div className="p-8 space-y-8 max-w-6xl w-full mx-auto">

          {/* Active Tab: Overview */}
          {activeTab === "overview" && (
            <>
              {/* Glowing Hero Banner */}
              <div className="relative overflow-hidden bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-700 rounded-3xl p-8 text-white shadow-xl shadow-indigo-900/10">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getBusinessIcon(vendor?.business_type)}</span>
                      <span className="px-2.5 py-0.5 bg-white/15 backdrop-blur-md rounded-full text-[10px] font-bold tracking-widest uppercase">
                        {vendor?.business_type || "Catering"} Specialist
                      </span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                      Namaste, {vendor?.business_name || "Merchant"}!
                    </h1>
                    <p className="text-indigo-100 text-sm max-w-lg leading-relaxed">
                      Your vendor workstation is setup and active. Access analytics, profile configurations, and catalog tools instantly.
                    </p>
                  </div>
                  
                  {/* Status Indicator badge */}
                  <div className="shrink-0 flex items-center gap-3 bg-black/25 backdrop-blur-lg px-5 py-3 rounded-2xl border border-white/10">
                    <div className="w-3.5 h-3.5 bg-green-500 rounded-full animate-pulse"></div>
                    <div>
                      <span className="text-[10px] text-slate-300 block font-bold uppercase tracking-wider">Account Mode</span>
                      <span className="text-sm font-bold text-white">{vendor?.status || "ACTIVE"}</span>
                    </div>
                  </div>
                </div>

                {/* Decorative glowing gradient elements */}
                <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full translate-x-1/4 -translate-y-1/4 blur-3xl"></div>
                <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-violet-400/10 rounded-full translate-y-1/2 blur-2xl"></div>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                
                <div className="bg-[#0C1224] border border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4 hover:border-indigo-500/40 transition duration-300 group">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Sales</span>
                    <span className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-lg group-hover:scale-110 transition duration-300">₹</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-extrabold text-white">₹0.00</h3>
                    <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-wider">Initial launch phase</p>
                  </div>
                </div>

                <div className="bg-[#0C1224] border border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4 hover:border-indigo-500/40 transition duration-300 group">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Leads</span>
                    <span className="w-8 h-8 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center font-bold text-lg group-hover:scale-110 transition duration-300">👥</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-extrabold text-white">0</h3>
                    <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-wider">0 in last 7 days</p>
                  </div>
                </div>

                <div className="bg-[#0C1224] border border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4 hover:border-indigo-500/40 transition duration-300 group">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Catalog Items</span>
                    <span className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-lg group-hover:scale-110 transition duration-300">📦</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-extrabold text-white">0</h3>
                    <p className="text-[10px] text-emerald-400 font-bold mt-1 uppercase tracking-wider">Add items to activate</p>
                  </div>
                </div>

                <div className="bg-[#0C1224] border border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4 hover:border-indigo-500/40 transition duration-300 group">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Completeness</span>
                    <span className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center font-bold text-lg group-hover:scale-110 transition duration-300">📈</span>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-extrabold text-white">100%</h3>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="w-full h-full bg-gradient-to-r from-indigo-500 to-orange-500"></div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Bottom Interactive Dashboard Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* 1. Mock Performance Chart Card */}
                <div className="bg-[#0C1224] border border-slate-800/80 rounded-3xl p-6 lg:col-span-2 shadow-sm space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-800/60 pb-4">
                    <div>
                      <h3 className="text-base font-bold text-white">Weekly Analytics</h3>
                      <p className="text-xs text-slate-400">Visitor views on search results</p>
                    </div>
                    <span className="px-3 py-1 bg-slate-800 text-slate-300 text-[10px] font-bold rounded-lg uppercase tracking-wider">Last 7 Days</span>
                  </div>

                  {/* SVG Line Chart */}
                  <div className="w-full h-64 relative flex items-end">
                    <svg className="w-full h-full absolute inset-0 overflow-visible" viewBox="0 0 500 200" preserveAspectRatio="none">
                      {/* Grid Lines */}
                      <line x1="0" y1="50" x2="500" y2="50" stroke="#1E293B" strokeWidth="1" strokeDasharray="5,5" />
                      <line x1="0" y1="100" x2="500" y2="100" stroke="#1E293B" strokeWidth="1" strokeDasharray="5,5" />
                      <line x1="0" y1="150" x2="500" y2="150" stroke="#1E293B" strokeWidth="1" strokeDasharray="5,5" />

                      {/* Area Under Chart */}
                      <path
                        d="M0,170 C50,150 100,120 150,130 C200,140 250,90 300,70 C350,50 400,110 450,80 L500,50 L500,200 L0,200 Z"
                        fill="url(#chart-glow)"
                        opacity="0.15"
                      />

                      {/* Sparkline Curve */}
                      <path
                        d="M0,170 C50,150 100,120 150,130 C200,140 250,90 300,70 C350,50 400,110 450,80 L500,50"
                        fill="none"
                        stroke="#4F46E5"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />

                      {/* Data Dots with Ring */}
                      <circle cx="150" cy="130" r="5" fill="#4F46E5" stroke="#0C1224" strokeWidth="2" />
                      <circle cx="300" cy="70" r="5" fill="#4F46E5" stroke="#0C1224" strokeWidth="2" />
                      <circle cx="500" cy="50" r="5" fill="#818CF8" stroke="#0C1224" strokeWidth="2" />

                      {/* Gradients */}
                      <defs>
                        <linearGradient id="chart-glow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4F46E5" />
                          <stop offset="100%" stopColor="#4F46E5" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                    </svg>

                    {/* Chart Labels */}
                    <div className="w-full flex justify-between px-1 text-[9px] text-slate-500 font-bold uppercase tracking-wider z-10">
                      <span>Mon</span>
                      <span>Tue</span>
                      <span>Wed</span>
                      <span>Thu</span>
                      <span>Fri</span>
                      <span>Sat</span>
                      <span>Sun</span>
                    </div>
                  </div>
                </div>

                {/* 2. Quick Operations / Leads Card */}
                <div className="bg-[#0C1224] border border-slate-800/80 rounded-3xl p-6 shadow-sm space-y-6 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white border-b border-slate-800/60 pb-4">Actions Hub</h3>
                    <div className="py-2 space-y-4">
                      
                      <button 
                        onClick={() => setActiveTab("details")}
                        className="w-full flex items-center justify-between p-3.5 bg-slate-800/40 hover:bg-slate-800 border border-slate-800 rounded-2xl transition duration-200 group text-left"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">⚙️</span>
                          <div>
                            <span className="text-sm font-bold text-white block">Configure Profile</span>
                            <span className="text-[10px] text-slate-500 font-medium">Verify credentials & details</span>
                          </div>
                        </div>
                        <span className="text-slate-500 group-hover:text-white group-hover:translate-x-1 transition duration-200">➔</span>
                      </button>

                      <button 
                        onClick={() => setActiveTab("products")}
                        className="w-full flex items-center justify-between p-3.5 bg-slate-800/40 hover:bg-slate-800 border border-slate-800 rounded-2xl transition duration-200 group text-left"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">🛒</span>
                          <div>
                            <span className="text-sm font-bold text-white block">Update Catalog</span>
                            <span className="text-[10px] text-slate-500 font-medium">Publish items or price packages</span>
                          </div>
                        </div>
                        <span className="text-slate-500 group-hover:text-white group-hover:translate-x-1 transition duration-200">➔</span>
                      </button>

                    </div>
                  </div>

                  <div className="p-4 bg-indigo-900/15 border border-indigo-500/20 rounded-2xl text-center space-y-3">
                    <p className="text-xs text-indigo-200 font-medium leading-relaxed">
                      Need help setting up your shop layout or services catalog?
                    </p>
                    <a href="mailto:support@vendoros.com" className="text-xs text-indigo-400 font-extrabold hover:text-indigo-300 underline block">
                      Contact Partner Support
                    </a>
                  </div>
                </div>

              </div>
            </>
          )}

          {/* Active Tab: Details */}
          {activeTab === "details" && (
            <div className="bg-[#0C1224] border border-slate-800/80 rounded-3xl p-8 shadow-sm space-y-8">
              <div className="border-b border-slate-800/60 pb-5">
                <h3 className="text-xl font-bold text-white">Business Verification Profile</h3>
                <p className="text-sm text-slate-400 mt-1">Verify or request changes to your registered company details.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Field Card 1 */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest">General Information</h4>
                  
                  <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 space-y-4">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Registered Brand Name</span>
                      <span className="text-sm font-bold text-white mt-1 block">{vendor?.business_name || "N/A"}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Business Type / Category</span>
                      <span className="text-sm font-bold text-white mt-1 block">{vendor?.business_type || "N/A"}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Brief Description</span>
                      <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">{vendor?.description || "No description provided."}</p>
                    </div>
                  </div>
                </div>

                {/* Field Card 2 */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Contacts & Addresses</h4>
                  
                  <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 space-y-4">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Corporate Phone</span>
                      <span className="text-sm font-bold text-white mt-1 block">{vendor?.contact_phone || "N/A"}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Corporate Email</span>
                      <span className="text-sm font-bold text-white mt-1 block">{vendor?.email || "N/A"}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Full Physical Address</span>
                      <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">
                        {vendor?.address_line},<br />
                        {vendor?.city}, {vendor?.state} - {vendor?.pincode}
                      </p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Bottom Action bar */}
              <div className="border-t border-slate-800/60 pt-6 flex justify-end">
                <button 
                  onClick={() => alert("Profile edits will be available in the next release.")}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition duration-200"
                >
                  Edit Profile Information
                </button>
              </div>
            </div>
          )}

          {/* Active Tab: Products */}
          {activeTab === "products" && (
            <div className="bg-[#0C1224] border border-slate-800/80 rounded-3xl p-8 shadow-sm text-center py-16 space-y-6">
              <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto text-indigo-400 text-3xl">
                📦
              </div>
              <div className="space-y-2 max-w-md mx-auto">
                <h3 className="text-xl font-bold text-white">Your Product Catalog is Empty</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Start adding products, service rates, or menus to show them to potential clients on VendorOS search.
                </p>
              </div>
              <div>
                <button 
                  onClick={() => alert("Product listing tools will be available in the next release.")}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/35 transition duration-300"
                >
                  + Add First Catalog Item
                </button>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
