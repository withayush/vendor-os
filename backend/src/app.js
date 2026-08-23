import express from 'express';
import cors from 'cors'; // Naya import
import authRoutes from './routes/auth.routes.js';
import businessRoutes from './routes/business.routes.js'; // Naya import\
import productRoutes from './routes/product.routes.js';
import vendorRoutes from './routes/vendor.routes.js';

const app = express();

// CORS Enable karein taaki frontend (5173) backend (3000) se baat kar sake
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

app.use(express.json());

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/businesses', businessRoutes); // Naya route register hua
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/vendors', vendorRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running and healthy!' });
});

export default app;