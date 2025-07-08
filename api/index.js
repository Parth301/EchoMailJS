// /api/index.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth');
const emailRoutes = require('./routes/email');
const pdfRoutes = require('./routes/pdf');
const analyticsRoutes = require('./routes/analytics');
const sendRoutes = require('./routes/send');
const analyticsRoutes = require('./routes/analytics');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/send', sendRoutes);
// Required for Vercel serverless
module.exports = app;