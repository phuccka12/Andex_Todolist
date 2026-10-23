import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db';
import { taskRouter } from './routes/task.routes';
import { emailRouter } from './routes/email.routes';
import { authRouter } from './routes/auth.routes';
import { journalRouter } from './routes/journal.routes';
import { uploadRouter } from './routes/upload.routes';
import { telegramRouter } from './routes/telegram.routes';
import { aiRouter } from './routes/ai.routes';
import { emailService } from './services/email.service';

const app = express();
const PORT = Number(process.env.PORT) || 5000;

// Connect to MongoDB Atlas Database
connectDB();

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

app.use('/api/auth', authRouter);
app.use('/api/tasks', taskRouter);
app.use('/api/email', emailRouter);
app.use('/api/telegram', telegramRouter);
app.use('/api/journals', journalRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/ai', aiRouter);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'UP',
    database: 'MongoDB Atlas 🍃',
    backend: 'Andex OS TypeScript Node.js Express',
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Andex OS Backend running at http://0.0.0.0:${PORT}`);
  // Start automated background schedule reminder worker
  emailService.startReminderScheduler();
});

