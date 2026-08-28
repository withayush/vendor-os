import { verifyAccessToken } from "../utils/token.js";
import { findAccountById } from "../repositories/auth.repository.js";

export const verifyToken = async (req, res, next) => {
  try {
    // ==========================================
    // 1. Get Authorization Header
    // ==========================================

    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is required.",
      });
    }

    // ==========================================
    // 2. Check Bearer Format
    // ==========================================

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is malformed.",
      });
    }

    // ==========================================
    // 3. Extract Token
    // ==========================================

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is missing.",
      });
    }

    // ==========================================
    // 4. Verify JWT
    // ==========================================

    let decoded;

    try {
      decoded = verifyAccessToken(token);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          code: "TOKEN_EXPIRED",
          message: "Access token has expired.",
        });
      }

      return res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
    }

    // ==========================================
    // 5. Find Account
    // ==========================================

    const account = await findAccountById(decoded.sub);

    if (!account) {
      return res.status(401).json({
        success: false,
        message: "Account associated with token no longer exists.",
      });
    }

    // ==========================================
    // 6. Check Account Status
    // ==========================================

    if (account.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: `Account is ${account.status.toLowerCase()}. Access denied.`,
      });
    }

    // ==========================================
    // 7. Attach User
    // ==========================================

    req.user = {
      accountId: account.id,
      fullName: account.full_name,
      email: account.email,
      phone: account.phone,
      status: account.status,
    };

    // ==========================================
    // 8. Continue
    // ==========================================

    next();
  } catch (error) {
    next(error);
  }
};

export default verifyToken;