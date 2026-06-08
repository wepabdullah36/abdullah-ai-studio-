require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const cors = require('cors');

const User = require('./models/User');
const Chat = require('./models/Chat');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Database Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB Connected Successfully'))
    .catch(err => console.error('Database Connection Error:', err));

// Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Access Denied' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid Token' });
        req.user = user;
        next();
    });
};

// --- AUTH ROUTES ---
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, email, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, user: { username: user.username, email: user.email, tier: user.tier } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- CHAT ROUTES ---
app.get('/api/chats', authenticateToken, async (req, res) => {
    try {
        const chats = await Chat.find({ userId: req.user.id }).sort({ updatedAt: -1 });
        res.json(chats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/chats/new', authenticateToken, async (req, res) => {
    try {
        const newChat = new Chat({ userId: req.user.id, messages: [] });
        await newChat.save();
        res.json(newChat);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/chats/:id/message', authenticateToken, async (req, res) => {
    try {
        const { text } = req.body;
        const chat = await Chat.findById(req.params.id);
        if (!chat) return res.status(404).json({ message: 'Chat not found' });

        // Add User Message
        chat.messages.push({ sender: 'user', text });
        
        // Mock AI Framework (Connects to external translation/AI API seamlessly)
        // Auto detects if English or Urdu elements are expected
        let aiResponse = `This is a simulated intelligent response from Abdullah AI Studio to your query: "${text}". Setup your API key in production to process advanced responses.`;
        if (text.match(/[\u0600-\u06FF]/)) {
            aiResponse = `عبداللہ آئی اسٹوڈیو کی طرف سے آپ کے سوال کا جواب: "${text}"`;
        }

        chat.messages.push({ sender: 'ai', text: aiResponse });
        chat.updatedAt = Date.now();
        if(chat.messages.length === 2) {
            chat.title = text.substring(0, 25) + '...';
        }
        await chat.save();
        res.json(chat);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/chats/:id', authenticateToken, async (req, res) => {
    try {
        await Chat.deleteOne({ _id: req.params.id, userId: req.user.id });
        res.json({ message: 'Chat deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- ADMIN SYSTEM ROUTE ---
app.get('/api/admin/stats', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    try {
        const totalUsers = await User.countDocuments();
        const totalChats = await Chat.countDocuments();
        res.json({ totalUsers, totalChats });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Page Routings
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));