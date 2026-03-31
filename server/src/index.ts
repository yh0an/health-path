import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';

import authRoutes from './routes/auth';
import weightRoutes from './routes/weight';
import nutritionRoutes from './routes/nutrition';
import waterRoutes from './routes/water';
import photosRoutes from './routes/photos';
import calendarRoutes from './routes/calendar';
import settingsRoutes from './routes/settings';
import pushRoutes from './routes/push';
import { authMiddleware } from './middleware/auth';
import { initWebPush, startCronJobs } from './services/push.service';

// Les autres routes seront ajoutées au fur et à mesure des tasks suivantes
// Pour l'instant, on crée des placeholders qui seront remplacés

const app = express();
const PORT = process.env.PORT || 4800;

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());

// Route publique auth
app.use('/api/auth', authRoutes);
app.use('/api/weight', authMiddleware, weightRoutes);
app.use('/api/nutrition', authMiddleware, nutritionRoutes);
app.use('/api/water', authMiddleware, waterRoutes);
app.use('/api/photos', authMiddleware, photosRoutes);
app.use('/api/calendar', authMiddleware, calendarRoutes);
app.use('/api/settings', authMiddleware, settingsRoutes);
app.use('/api/push', authMiddleware, pushRoutes);

// Fichiers uploadés (protégés)
app.use('/api/uploads', authMiddleware, express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  initWebPush();
  startCronJobs();
});

export default app;
