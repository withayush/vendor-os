import { query, pool } from "../db/db.js";

// =========================================================
// 1. CREATE OR UPDATE BUSINESS (Idempotent Onboarding Wizard)
// =========================================================
export const createBusiness = async (req, res) => {
  const client = await pool.connect();
  try {
    const accountId = req.user.accountId; 

    const {
      businessName,
      businessType,
      category,
      description,
      businessEmail,
      businessPhone,
      whatsappNumber,
      website,
      addressLine,
      city,
      state,
      pincode
    } = req.body;

    if (!businessName) {
      return res.status(400).json({ success: false, message: "Business name is required." });
    }

    await client.query("BEGIN");

    // 1. Get associated vendor_id
    const vendorRes = await client.query(
      `SELECT id FROM vendors WHERE account_id = $1 LIMIT 1`,
      [accountId]
    );

    if (vendorRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Vendor profile not found for this account." });
    }

    const vendorId = vendorRes.rows[0].id;

    // 2. UPSERT: Agar vendor_id ki business pehle se hai toh update kar do, nahi toh insert karo
    const businessResult = await client.query(
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
        businessName,
        businessType || "RETAIL",
        category || null,
        description || null,
        businessEmail || null,
        businessPhone || null,
        whatsappNumber || null,
        website || null,
        addressLine || null,
        city || null,
        state || null,
        pincode || null
      ]
    );

    const business = businessResult.rows[0];

    // 3. Map OWNER role in business_members
    await client.query(
      `INSERT INTO business_members (account_id, business_id, role) VALUES ($1, $2, $3)
       ON CONFLICT (business_id, account_id) DO NOTHING`,
      [accountId, business.id, "OWNER"]
    );

    // 4. Update vendor onboarding status
    await client.query(
      `UPDATE vendors SET onboarding_status = 'COMPLETED' WHERE id = $1`,
      [vendorId]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Business profile saved successfully.",
      data: { business }
    });

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error in createBusiness:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  } finally {
    client.release();
  }
};

// =========================================================
// 2. GET USER BUSINESS (For Dashboard Check)
// =========================================================
export const getUserBusinesses = async (req, res) => {
  try {
    const accountId = req.user.accountId;

    const result = await query(
      `SELECT b.*, bm.role, bm.status as membership_status 
       FROM businesses b 
       JOIN business_members bm ON b.id = bm.business_id 
       WHERE bm.account_id = $1 LIMIT 1`,
      [accountId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No business found for this account."
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        business: result.rows[0] // 👉 Ensure kiya ki 'business' key ke andar object ho
      }
    });

  } catch (error) {
    console.error("Error in getUserBusinesses:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};


// =========================================================
// 3. ADD MEMBER / STAFF TO BUSINESS
// =========================================================
export const addBusinessMember = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { phone, role } = req.body; 

    if (!phone || !role) {
      return res.status(400).json({ success: false, message: "Phone and role are required." });
    }

    let accountResult = await query(`SELECT id FROM accounts WHERE phone = $1`, [phone]);
    
    if (accountResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User with this phone number not found." });
    }

    const targetAccountId = accountResult.rows[0].id;

    const existingMember = await query(
      `SELECT id FROM business_members WHERE account_id = $1 AND business_id = $2`,
      [targetAccountId, businessId]
    );

    if (existingMember.rows.length > 0) {
      return res.status(400).json({ success: false, message: "User is already a member of this business." });
    }

    const newMemberResult = await query(
      `INSERT INTO business_members (account_id, business_id, role) VALUES ($1, $2, $3) RETURNING *`,
      [targetAccountId, businessId, role.toUpperCase()]
    );

    return res.status(201).json({
      success: true,
      message: "Staff member added successfully.",
      data: { member: newMemberResult.rows[0] }
    });

  } catch (error) {
    console.error("Error in addBusinessMember:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};