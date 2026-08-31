import { query } from "../db/db.js";

export const findVendorByAccountId = async (accountId) => {
  const res = await query(`SELECT * FROM vendors WHERE user_id = $1 LIMIT 1`, [accountId]);
  return res.rows[0] || null;
};

export const createVendorRecord = async (accountId, data) => {
  const res = await query(
    `INSERT INTO vendors (
      user_id, business_name, business_type, description, email, 
      contact_phone, address_line, city, state, pincode
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [
      accountId,
      data.businessName,
      data.businessType || "CATERING",
      data.description || null,
      data.email || null,
      data.contactPhone,
      data.addressLine,
      data.city,
      data.state,
      data.pincode
    ]
  );
  return res.rows[0];
};

export const updateVendorRecord = async (accountId, data) => {
  const res = await query(
    `UPDATE vendors SET 
      business_name = COALESCE($1, business_name), 
      business_type = COALESCE($2, business_type), 
      description = COALESCE($3, description), 
      email = COALESCE($4, email), 
      contact_phone = COALESCE($5, contact_phone), 
      address_line = COALESCE($6, address_line), 
      city = COALESCE($7, city), 
      state = COALESCE($8, state), 
      pincode = COALESCE($9, pincode), 
      updated_at = CURRENT_TIMESTAMP 
     WHERE user_id = $10 RETURNING *`,
    [
      data.businessName || null,
      data.businessType || null,
      data.description !== undefined ? data.description : null,
      data.email !== undefined ? data.email : null,
      data.contactPhone || null,
      data.addressLine || null,
      data.city || null,
      data.state || null,
      data.pincode || null,
      accountId
    ]
  );
  return res.rows[0];
};
