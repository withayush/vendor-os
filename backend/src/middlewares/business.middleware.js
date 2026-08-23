import { query } from "../db/db.js";

export const verifyBusinessAccess = (requiredRoles = []) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.userId;
      // Business ID request headers ya params se aayegi
      const businessId = req.headers["x-business-id"] || req.params.businessId;

      if (!businessId) {
        return res.status(400).json({ success: false, message: "Business ID is required in headers (x-business-id)." });
      }

      // Check membership in business_members table
      const memberResult = await query(
        `SELECT * FROM business_members WHERE user_id = $1 AND business_id = $2 AND status = 'ACTIVE'`,
        [userId, businessId]
      );

      if (memberResult.rows.length === 0) {
        return res.status(403).json({ success: false, message: "Access denied. You do not belong to this business." });
      }

      const membership = memberResult.rows[0];

      // If specific roles are required, check them
      if (requiredRoles.length > 0 && !requiredRoles.includes(membership.role)) {
        return res.status(403).json({ 
          success: false, 
          message: `Access denied. Requires one of the following roles: ${requiredRoles.join(", ")}` 
        });
      }

      // Attach membership info to request for further controllers
      req.businessMembership = membership;
      next();
    } catch (error) {
      console.error("Error in verifyBusinessAccess middleware:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  };
};