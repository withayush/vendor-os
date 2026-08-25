import { verifyAccessToken } from "../utils/token.js";
import { findAccountById } from "../repositories/auth.repository.js";

export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is missing or malformed.",
      });
    }

    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
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

    const account = await findAccountById(decoded.sub);
    if (!account) {
      return res.status(401).json({
        success: false,
        message: "Account associated with token no longer exists.",
      });
    }

    if (account.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: `Account is ${account.status.toLowerCase()}. Access denied.`,
      });
    }

    // Attach authenticated context
    req.user = {
      accountId: account.id,
      fullName: account.full_name,
      email: account.email,
      phone: account.phone,
      status: account.status,
    };

    next();
  } catch (error) {
    next(error);
  }
};