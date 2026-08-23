import jwt from "jsonwebtoken";


export const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Access denied. No token provided." });
    }

    const token = authHeader.split(" ")[1];
    
    // Yahan print karke dekho ki token sahi aa raha hai ya nahi
    console.log("EXTRACTED TOKEN:", token); 

    const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey_vendor_os";
    const decoded = jwt.verify(token, JWT_SECRET);
    
    req.user = decoded;
    next();
  } catch (error) {
    console.error("Token verification failed::", error.message);
    return res.status(401).json({ success: false, message: "Invalid or expired token." });
  }
};