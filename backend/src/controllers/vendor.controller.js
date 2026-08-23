import { query } from "../db/db.js";

// 1. Create Vendor Profile
export const createVendorProfile = async (req, res) => {
  try {
    const userId = req.user.userId; // Auth middleware se aayega
    const {
      businessName,
      businessType,
      description,
      email,
      contactPhone,
      addressLine,
      city,
      state,
      pincode
    } = req.body;

    if (!businessName || !contactPhone || !addressLine || !city || !state || !pincode) {
      return res.status(400).json({
        success: false,
        message: "Required fields are missing (businessName, contactPhone, addressLine, city, state, pincode)."
      });
    }

    // Check if vendor profile already exists for this user (user_id UNIQUE enforcement)
    const existingVendor = await query(`SELECT id FROM vendors WHERE user_id = $1`, [userId]);
    if (existingVendor.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Vendor profile already exists for this user."
      });
    }

    // Insert new vendor profile
    const result = await query(
      `INSERT INTO vendors (
        user_id, business_name, business_type, description, email, 
        contact_phone, address_line, city, state, pincode
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        userId,
        businessName,
        businessType || "CATERING",
        description,
        email,
        contactPhone,
        addressLine,
        city,
        state,
        pincode
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Vendor profile created successfully.",
      data: {
        vendor: result.rows[0]
      }
    });
  } catch (error) {
    console.error("Error in createVendorProfile:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// 2. Get Vendor Profile
export const getVendorProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await query(`SELECT * FROM vendors WHERE user_id = $1`, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Vendor profile not found."
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        vendor: result.rows[0]
      }
    });
  } catch (error) {
    console.error("Error in getVendorProfile:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// 3. Update Vendor Profile
export const updateVendorProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      businessName,
      businessType,
      description,
      email,
      contactPhone,
      addressLine,
      city,
      state,
      pincode
    } = req.body;

    const existingVendor = await query(`SELECT * FROM vendors WHERE user_id = $1`, [userId]);
    if (existingVendor.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Vendor profile not found."
      });
    }

    const current = existingVendor.rows[0];

    const updatedName = businessName || current.business_name;
    const updatedType = businessType || current.business_type;
    const updatedDesc = description !== undefined ? description : current.description;
    const updatedEmail = email !== undefined ? email : current.email;
    const updatedPhone = contactPhone || current.contact_phone;
    const updatedAddress = addressLine || current.address_line;
    const updatedCity = city || current.city;
    const updatedState = state || current.state;
    const updatedPincode = pincode || current.pincode;

    const result = await query(
      `UPDATE vendors SET 
        business_name = $1, business_type = $2, description = $3, email = $4, 
        contact_phone = $5, address_line = $6, city = $7, state = $8, pincode = $9, 
        updated_at = CURRENT_TIMESTAMP 
       WHERE user_id = $10 RETURNING *`,
      [
        updatedName,
        updatedType,
        updatedDesc,
        updatedEmail,
        updatedPhone,
        updatedAddress,
        updatedCity,
        updatedState,
        updatedPincode,
        userId
      ]
    );

    return res.status(200).json({
      success: true,
      message: "Vendor profile updated successfully.",
      data: {
        vendor: result.rows[0]
      }
    });
  } catch (error) {
    console.error("Error in updateVendorProfile:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};