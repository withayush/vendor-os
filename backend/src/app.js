import express from 'express';
import authRoutes from './routes/auth.routes.js';
import businessRoutes from './routes/business.routes.js'; // Naya import\
import productRoutes from './routes/product.routes.js';

const app = express();

app.use(express.json());

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/businesses', businessRoutes); // Naya route register hua
app.use('/api/v1/products', productRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running and healthy!' });
});

export default app;