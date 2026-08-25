import React, { useState } from "react";
import { createVendorProfileApi } from "../../services/vendor.api";
import { useNavigate } from "react-router-dom";

export default function OnboardingPage() {
  const [formData, setFormData] = useState({
    businessName: "",
    businessType: "CATERING",
    description: "",
    email: "",
    contactPhone: "",
    addressLine: "",
    city: "",
    state: "",
    pincode: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      setLoading(true);
      await createVendorProfileApi(formData);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create vendor profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F6FA] py-12 px-4 flex justify-center items-center">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-sm border border-[#E5E7EB] p-8">
        
        <div className="mb-6 border-b pb-4">
          <h1 className="text-2xl font-bold text-[#111827]">Setup Your Business Profile</h1>
          <p className="text-sm text-[#6B7280] mt-1">Tell us about your business to get started with VendorOS.</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Name *</label>
              <input
                type="text"
                name="businessName"
                placeholder="Sharma Caterers"
                value={formData.businessName}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#2842FF]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Type *</label>
              <select
                name="businessType"
                value={formData.businessType}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#2842FF]"
              >
                <option value="CATERING">Catering</option>
                <option value="HALWAI">Halwai</option>
                <option value="DECORATION">Decoration</option>
                <option value="PHOTOGRAPHY">Photography</option>
                <option value="VENUE">Venue</option>
                <option value="DJ">DJ & Sound</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              placeholder="Brief description about your services..."
              value={formData.description}
              onChange={handleChange}
              rows="2"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#2842FF]"
            ></textarea>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone *</label>
              <input
                type="text"
                name="contactPhone"
                placeholder="+919876543210"
                value={formData.contactPhone}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#2842FF]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Email</label>
              <input
                type="email"
                name="email"
                placeholder="business@example.com"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#2842FF]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address Line *</label>
            <input
              type="text"
              name="addressLine"
              placeholder="Shop No, Street Name"
              value={formData.addressLine}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#2842FF]"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
              <input
                type="text"
                name="city"
                placeholder="Jaipur"
                value={formData.city}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#2842FF]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
              <input
                type="text"
                name="state"
                placeholder="Rajasthan"
                value={formData.state}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#2842FF]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pincode *</label>
              <input
                type="text"
                name="pincode"
                placeholder="302001"
                value={formData.pincode}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#2842FF]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#2842FF] hover:bg-blue-700 text-white font-medium rounded-lg transition text-sm disabled:opacity-50 mt-6"
          >
            {loading ? "Creating Profile..." : "Complete Profile"}
          </button>
        </form>

      </div>
    </div>
  );
}