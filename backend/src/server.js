require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

require('./db');
const path = require('path');
const usersRouter = require('./routes/users');
const messagesRouter = require('./routes/messages');
const authRouter = require('./routes/auth');
const uploadRouter = require('./routes/upload');
const gifsRouter = require('./routes/gifs');
const groupsRouter = require('./routes/groups');
const pushRouter = require('./routes/push');
const { attach } = require('./socket');

const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:3000';

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/users', usersRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/auth', authRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/gifs', gifsRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/push', pushRouter);

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: CLIENT_ORIGIN },
});
app.set('io', io);

attach(io);

server.listen(PORT, () => {
  console.log(`Backend ${PORT}-portda ishga tushdi`);
});
