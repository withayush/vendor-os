import "dotenv/config";
import app from "./src/app.js";
import "./src/db/db.js"; // Yeh line database connection file ko trigger kar degi

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 