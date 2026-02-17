import dotenv from 'dotenv';
dotenv.config();

export const PORT = process.env.PORT || 5000;
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
export const JWT_SECRET = process.env.JWT_SECRET || 'learnforge_dev_secret_key';

// Parse allowed client origins for CORS
const defaultOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173'
];

export const CLIENT_ORIGINS = process.env.CLIENT_ORIGINS
  ? process.env.CLIENT_ORIGINS.split(',').map((o) => o.trim())
  : defaultOrigins;
