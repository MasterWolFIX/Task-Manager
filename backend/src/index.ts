import express from 'express';
import cors from 'cors';
import http from 'http';
import cookieParser from 'cookie-parser';
import { Server } from 'socket.io';
import 'dotenv/config';
import path from 'path';

import authRoutes from './routes/auth.routes';
import tasksRoutes from './routes/tasks.routes';
import submissionsRoutes from './routes/submissions.routes';
import classesRoutes from './routes/classes.routes';
import settingsRoutes from './routes/settings.routes';

const app = express();
const server = http.createServer(app);

// Konfiguracja CORS (Frontend jest na localhost:3000)
const corsOptions = {
  origin: [process.env.FRONTEND_URL || 'http://localhost:3000', 'http://localhost:3001'],
  credentials: true, // Wymagane dla ciasteczek z JWT
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Rejestracja routerów
app.use('/api/auth', authRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/submissions', submissionsRoutes);
app.use('/api/classes', classesRoutes);
app.use('/api/settings', settingsRoutes);

// Prosty endpoint health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Socket.io
export const io = new Server(server, {
  cors: corsOptions,
});

io.on('connection', (socket) => {
  console.log('Nowe połączenie Socket.io:', socket.id);

  socket.on('joinRoom', (roomId: string) => {
    socket.join(roomId);
    console.log(`Socket ${socket.id} dołączył do pokoju: ${roomId}`);
  });

  socket.on('disconnect', () => {
    console.log('Rozłączono Socket.io:', socket.id);
  });
});

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`Serwer backend nasłuchuje na porcie ${PORT}`);
});
