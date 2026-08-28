import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createBusiness } from "../../services/business.api";

export default function BusinessOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
    businessName: "",
    businessType: "",
    category: "",
    description: "",
    businessEmail: "",
    businessPhone: "",
    whatsappNumber: "",
    website: "",
    addressLine: "",
    city: "",
    state: "",
    pincode: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const nextStep = () => setStep((prev) => prev + 1);
  const prevStep = () => setStep((prev) => prev - 1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await createBusiness(formData);
      console.log("Business Created Successfully:", response);
      alert("Business profile created successfully!");
      
      // Seedha dashboard par bhej do
      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error("Onboarding Error:", err);
      setError(
        err.response?.data?.message || "Failed to create business profile. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "500px", margin: "40px auto", padding: "20px", border: "1px solid #ddd", borderRadius: "8px", background: "#fff", fontFamily: "sans-serif" }}>
      <h2>VendorOS - Business Onboarding</h2>
      <p style={{ fontSize: "14px", color: "#666" }}>Step {step} of 5</p>

      <div style={{ width: "100%", background: "#e0e0e0", height: "8px", borderRadius: "4px", marginBottom: "20px" }}>
        <div style={{ width: `${(step / 5) * 100}%`, background: "#4caf50", height: "100%", borderRadius: "4px", transition: "width 0.3s ease" }}></div>
      </div>

      {error && <p style={{ color: "red", fontSize: "14px", fontWeight: "bold" }}>{error}</p>}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        
        {step === 1 && (
          <div>
            <h3>1. Basic Information</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
              <input name="businessName" placeholder="Business Name (e.g. Sharma Sweets)" value={formData.businessName} onChange={handleChange} required />
              <input name="businessType" placeholder="Business Type (e.g. Retail, Food)" value={formData.businessType} onChange={handleChange} required />
              <input name="category" placeholder="Category (e.g. Sweet Shop, Bakery)" value={formData.category} onChange={handleChange} />
              <textarea name="description" placeholder="Short description about your business..." value={formData.description} onChange={handleChange} rows={3} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h3>2. Contact Information</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
              <input name="businessEmail" type="email" placeholder="Business Email" value={formData.businessEmail} onChange={handleChange} />
              <input name="businessPhone" placeholder="Business Phone Number" value={formData.businessPhone} onChange={handleChange} required />
              <input name="whatsappNumber" placeholder="WhatsApp Number" value={formData.whatsappNumber} onChange={handleChange} />
              <input name="website" placeholder="Website URL (Optional)" value={formData.website} onChange={handleChange} />
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h3>3. Business Address</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
              <input name="addressLine" placeholder="Street Address / Address Line" value={formData.addressLine} onChange={handleChange} required />
              <input name="city" placeholder="City" value={formData.city} onChange={handleChange} required />
              <input name="state" placeholder="State" value={formData.state} onChange={handleChange} required />
              <input name="pincode" placeholder="Pincode" value={formData.pincode} onChange={handleChange} required />
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h3>4. Additional Details</h3>
            <p style={{ fontSize: "13px", color: "#666" }}>You can add legal documents or extra info later.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
              <input placeholder="GSTIN (Optional)" disabled style={{ background: "#f1f1f1" }} />
              <input placeholder="PAN Number (Optional)" disabled style={{ background: "#f1f1f1" }} />
            </div>
          </div>
        )}

        {step === 5 && (
          <div>
            <h3>5. Review Your Details</h3>
            <div style={{ background: "#f9f9f9", padding: "10px", borderRadius: "5px", fontSize: "14px", marginTop: "10px" }}>
              <p><strong>Name:</strong> {formData.businessName}</p>
              <p><strong>Type:</strong> {formData.businessType} ({formData.category || "General"})</p>
              <p><strong>Phone:</strong> {formData.businessPhone}</p>
              <p><strong>Address:</strong> {formData.addressLine}, {formData.city}, {formData.state} - {formData.pincode}</p>
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "20px" }}>
          {step > 1 && (
            <button type="button" onClick={prevStep} style={{ padding: "8px 15px", cursor: "pointer" }}>
              Back
            </button>
          )}

          {step < 5 ? (
            <button type="button" onClick={nextStep} style={{ padding: "8px 15px", cursor: "pointer", background: "#007bff", color: "white", border: "none", borderRadius: "4px" }}>
              Next
            </button>
          ) : (
            <button type="submit" disabled={loading} style={{ padding: "8px 15px", cursor: "pointer", background: "#28a745", color: "white", border: "none", borderRadius: "4px" }}>
              {loading ? "Saving..." : "Submit & Complete"}
            </button>
          )}
        </div>

      </form>
    </div>
  );
}