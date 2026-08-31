import React, { useState, useEffect } from "react";
import api from "../services/api";
import { AlertTriangle } from "lucide-react";

export default function LowStockAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const businessId = localStorage.getItem("businessId");

  useEffect(() => {
    const fetchAlerts = async () => {
      if (!businessId) return;
      try {
        setLoading(true);
        const response = await api.get("/inventory/low-stock", {
          headers: { "x-business-id": businessId }
        });
        setAlerts(response.data.data.lowStockItems || []);
      } catch (error) {
        console.error("Error fetching low-stock alerts:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAlerts();
  }, [businessId]);

  if (loading || alerts.length === 0) return null;

  return (
    <div className="bg-destructive/10 border border-destructive/25 p-5 rounded-2xl relative overflow-hidden mb-6">
      <div className="absolute right-0 bottom-0 opacity-5 pointer-events-none">
        <AlertTriangle className="w-24 h-24 text-destructive" />
      </div>
      
      <div className="flex items-center gap-3 mb-4 relative z-10">
        <AlertTriangle className="w-5 h-5 text-destructive" />
        <h3 className="text-sm font-bold text-foreground">
          Low Stock Warning: {alerts.length} item(s) have breached their reorder limits!
        </h3>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 relative z-10">
        {alerts.map((item) => (
          <div key={item.id} className="bg-card/40 border border-border p-3 rounded-xl flex flex-col justify-between hover:border-destructive/35 transition-colors">
            <div>
              <p className="font-semibold text-foreground text-xs">{item.product_name}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">SKU: {item.sku || "N/A"}</p>
            </div>
            <div className="flex justify-between items-center mt-3 pt-2 border-t border-border/40 text-[11px]">
              <span className="text-destructive font-bold">Stock: {item.available_stock}</span>
              <span className="text-muted-foreground/60">Limit: {item.reorder_level}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
