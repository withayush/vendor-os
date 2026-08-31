import { query } from "../db/db.js";

export const findBusinessById = async (businessId) => {
  const res = await query(
    `SELECT * FROM businesses WHERE id = $1 LIMIT 1`,
    [businessId]
  );
  return res.rows[0] || null;
};

export const updateBusinessProfile = async (businessId, data) => {
  const res = await query(
    `UPDATE businesses SET
      business_name = COALESCE($1, business_name),
      business_type = COALESCE($2, business_type),
      category = COALESCE($3, category),
      description = COALESCE($4, description),
      business_email = COALESCE($5, business_email),
      business_phone = COALESCE($6, business_phone),
      whatsapp_number = COALESCE($7, whatsapp_number),
      website = COALESCE($8, website),
      address_line = COALESCE($9, address_line),
      city = COALESCE($10, city),
      state = COALESCE($11, state),
      pincode = COALESCE($12, pincode),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $13
    RETURNING *`,
    [
      data.businessName !== undefined ? data.businessName : null,
      data.businessType !== undefined ? data.businessType : null,
      data.category !== undefined ? data.category : null,
      data.description !== undefined ? data.description : null,
      data.businessEmail !== undefined ? data.businessEmail : null,
      data.businessPhone !== undefined ? data.businessPhone : null,
      data.whatsappNumber !== undefined ? data.whatsappNumber : null,
      data.website !== undefined ? data.website : null,
      data.addressLine !== undefined ? data.addressLine : null,
      data.city !== undefined ? data.city : null,
      data.state !== undefined ? data.state : null,
      data.pincode !== undefined ? data.pincode : null,
      businessId
    ]
  );
  return res.rows[0];
};

export const findVendorByAccountId = async (accountId, client = null) => {
  const executor = client || { query };
  const res = await executor.query(
    `SELECT id FROM vendors WHERE account_id = $1 LIMIT 1`,
    [accountId]
  );
  return res.rows[0] || null;
};

export const upsertBusinessRecord = async (vendorId, data, client = null) => {
  const executor = client || { query };
  const res = await executor.query(
    `INSERT INTO businesses (
      vendor_id, business_name, business_type, category, description,
      business_email, business_phone, whatsapp_number, website,
      address_line, city, state, pincode
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    ON CONFLICT (vendor_id) DO UPDATE SET
      business_name = EXCLUDED.business_name,
      business_type = EXCLUDED.business_type,
      category = EXCLUDED.category,
      description = EXCLUDED.description,
      business_email = EXCLUDED.business_email,
      business_phone = EXCLUDED.business_phone,
      whatsapp_number = EXCLUDED.whatsapp_number,
      website = EXCLUDED.website,
      address_line = EXCLUDED.address_line,
      city = EXCLUDED.city,
      state = EXCLUDED.state,
      pincode = EXCLUDED.pincode,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *`,
    [
      vendorId,
      data.businessName,
      data.businessType || "RETAIL",
      data.category || null,
      data.description || null,
      data.businessEmail || null,
      data.businessPhone || null,
      data.whatsappNumber || null,
      data.website || null,
      data.addressLine || null,
      data.city || null,
      data.state || null,
      data.pincode || null
    ]
  );
  return res.rows[0];
};

export const findBusinessMemberRecord = async (accountId, businessId, client = null) => {
  const executor = client || { query };
  const res = await executor.query(
    `SELECT id FROM business_members WHERE account_id = $1 AND business_id = $2 LIMIT 1`,
    [accountId, businessId]
  );
  return res.rows[0] || null;
};

export const createBusinessMemberRecord = async (accountId, businessId, role, client = null) => {
  const executor = client || { query };
  const res = await executor.query(
    `INSERT INTO business_members (account_id, business_id, role) 
     VALUES ($1, $2, $3)
     ON CONFLICT (business_id, account_id) DO NOTHING
     RETURNING *`,
    [accountId, businessId, role]
  );
  return res.rows[0];
};

export const updateVendorOnboardingStatus = async (vendorId, status, client = null) => {
  const executor = client || { query };
  const res = await executor.query(
    `UPDATE vendors SET onboarding_status = $1 WHERE id = $2 RETURNING *`,
    [status, vendorId]
  );
  return res.rows[0];
};

export const findBusinessByAccountId = async (accountId) => {
  const res = await query(
    `SELECT b.*, bm.role, bm.status as membership_status 
     FROM businesses b 
     JOIN business_members bm ON b.id = bm.business_id 
     WHERE bm.account_id = $1 LIMIT 1`,
    [accountId]
  );
  return res.rows[0] || null;
};

export const findAccountByPhone = async (phone) => {
  const res = await query(
    `SELECT id FROM accounts WHERE phone = $1 LIMIT 1`,
    [phone]
  );
  return res.rows[0] || null;
};