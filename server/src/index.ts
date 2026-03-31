import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';

import authRoutes from './routes/auth';
import { authMiddleware } from './middleware/auth';

// Les autres routes seront ajoutées au fur et à mesure des tasks suivantes
// Pour l'instant, on crée des placeholders qui seront remplacés

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());

// Route publique auth
app.use('/api/auth', authRoutes);

// Fichiers uploadés (protégés) — activé quand les photos sont implémentées
// app.use('/api/uploads', authMiddleware, express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
