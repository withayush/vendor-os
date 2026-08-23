import { query } from "../db/db.js";

export const createBusiness = async (req, res) => {
  try {
    const userId = req.user.userId; // Auth middleware se milega
    const { name, business_type, phone, email, address } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: "Business name is required." });
    }

    // 1. Insert into businesses table
    const businessResult = await query(
      `INSERT INTO businesses (name, business_type, phone, email, address) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, business_type || "RETAIL", phone, email, address]
    );

    const business = businessResult.rows[0];

    // 2. Link user as OWNER in business_members table
    await query(
      `INSERT INTO business_members (user_id, business_id, role) VALUES ($1, $2, $3)`,
      [userId, business.id, "OWNER"]
    );

    return res.status(201).json({
      success: true,
      message: "Business created successfully and assigned as OWNER.",
      data: {
        business
      }
    });

  } catch (error) {
    console.error("Error in createBusiness:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};



// Get all businesses for the logged-in user
export const getUserBusinesses = async (req, res) => {
  try {
    const userId = req.user.userId; // Auth middleware se milega

    const result = await query(
      `SELECT b.*, bm.role, bm.status as membership_status 
       FROM businesses b 
       JOIN business_members bm ON b.id = bm.business_id 
       WHERE bm.user_id = $1`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      data: {
        businesses: result.rows
      }
    });

  } catch (error) {
    console.error("Error in getUserBusinesses:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};



// Add Member / Staff to Business
export const addBusinessMember = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { phone, role } = req.body; // role can be MANAGER, STAFF, ACCOUNTANT

    if (!phone || !role) {
      return res.status(400).json({ success: false, message: "Phone and role are required." });
    }

    // 1. Check if the user exists in the system
    let userResult = await query(`SELECT id FROM users WHERE phone = $1`, [phone]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User with this phone number not found. They must sign up first." });
    }

    const targetUserId = userResult.rows[0].id;

    // 2. Check if user is already a member of this business
    const existingMember = await query(
      `SELECT id FROM business_members WHERE user_id = $1 AND business_id = $2`,
      [targetUserId, businessId]
    );

    if (existingMember.rows.length > 0) {
      return res.status(400).json({ success: false, message: "User is already a member of this business." });
    }

    // 3. Insert into business_members
    const newMemberResult = await query(
      `INSERT INTO business_members (user_id, business_id, role) VALUES ($1, $2, $3) RETURNING *`,
      [targetUserId, businessId, role.toUpperCase()]
    );

    return res.status(201).json({
      success: true,
      message: "Staff member added successfully.",
      data: {
        member: newMemberResult.rows[0]
      }
    });

  } catch (error) {
    console.error("Error in addBusinessMember:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};