import express from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// In-memory mock user store for demonstration
const mockUsers = [
  {
    id: 'usr_socrates_01',
    name: 'Socratic Student',
    email: 'student@learnforge.ai',
    password: 'password123',
    role: 'student',
    joinedDate: '2026-01-15'
  }
];

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { name, email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const existingUser = mockUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    return res.status(409).json({ error: 'User with this email already exists' });
  }

  const newUser = {
    id: `usr_${Date.now()}`,
    name: name || email.split('@')[0],
    email,
    password, // In production, hash with bcrypt
    role: 'student',
    joinedDate: new Date().toISOString().split('T')[0]
  };
  mockUsers.push(newUser);

  // Generate JWT token
  const token = jwt.sign(
    { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  return res.status(201).json({
    message: 'User registered successfully',
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role
    },
    token
  });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // Find user or create mock session for any valid format
  let user = mockUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
  
  if (!user) {
    // Development convenience: auto-provision mock user if testing with any email
    user = {
      id: `usr_${Date.now()}`,
      name: email.split('@')[0],
      email,
      role: 'student'
    };
    mockUsers.push(user);
  }

  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  return res.json({
    message: 'Authentication successful',
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    },
    token
  });
});

// GET /api/auth/me (Protected Route)
router.get('/me', authenticateToken, (req, res) => {
  return res.json({
    user: req.user
  });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  return res.json({
    message: 'Successfully logged out'
  });
});

export default router;
