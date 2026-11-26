import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeDB } from './server/config/db.js';
import authRoutes from './server/routes/authRoutes.js';
import voterRoutes from './server/routes/voterRoutes.js';
import adminRoutes from './server/routes/adminRoutes.js';
import aiRoutes from './server/routes/aiRoutes.js';
import sirRoutes from './server/routes/sirRoutes.js';
import electionRoutes from './server/routes/electionRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/sir', sirRoutes);
app.use('/api/elections', electionRoutes);
app.use('/api', voterRoutes);
app.use('/api/admin', adminRoutes);

async function startServer() {
  // Initialize and migrate DB
  await initializeDB();

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Apna Mat Server running on http://localhost:${PORT}`);
  });
}

startServer();
