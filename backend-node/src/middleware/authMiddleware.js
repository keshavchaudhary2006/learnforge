import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env.js';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer <TOKEN>"

  if (!token) {
    return res.status(401).json({
      error: 'Access denied',
      message: 'Authentication token is missing. Please log in.'
    });
  }

  // Support for development mock token format
  if (token.startsWith('mock-token-')) {
    req.user = {
      id: 'mock_usr_101',
      name: 'Alex Rivera',
      email: 'alex@learnforge.ai',
      role: 'student'
    };
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(403).json({
      error: 'Invalid or expired token',
      message: err.message
    });
  }
};

// Optional auth helper (attaches user if token present, but doesn't block if absent)
export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    if (token.startsWith('mock-token-')) {
      req.user = { id: 'mock_usr_101', name: 'Alex Rivera', email: 'alex@learnforge.ai' };
    } else {
      req.user = jwt.verify(token, JWT_SECRET);
    }
  } catch (err) {
    req.user = null;
  }
  return next();
};
