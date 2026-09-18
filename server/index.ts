import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiRouter } from './routes.js';
import { initDB } from './db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001;

// Security & Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for dev flexibility and embedding fonts
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (!req.path.startsWith('/assets') && !req.path.endsWith('.js') && !req.path.endsWith('.css')) {
      console.log(`[HTTP] ${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
    }
  });
  next();
});

// API Routes
app.use('/api', apiRouter);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.resolve(__dirname, '../dist');
  app.use(express.static(clientDist));
  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.resolve(clientDist, 'index.html'));
  });
}

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Server Error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

// Initialize database then start server
async function startServer() {
  try {
    await initDB();
    app.listen(PORT, () => {
      console.log(`🚀 Smart Household Finance Advisor Server running on port ${PORT}`);
      console.log(`📡 API available at http://localhost:${PORT}/api`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
