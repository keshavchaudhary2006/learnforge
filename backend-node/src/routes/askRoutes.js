import express from 'express';
import axios from 'axios';
import { AI_SERVICE_URL } from '../config/env.js';
import { optionalAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * POST /api/ask
 * Main proxy route from Frontend to FastAPI Socratic RAG service (/chat).
 */
router.post('/ask', optionalAuth, async (req, res) => {
  try {
    const { question, query, topic, chat_history } = req.body;
    const studentQuestion = question || query;

    if (!studentQuestion || typeof studentQuestion !== 'string' || !studentQuestion.trim()) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'A non-empty question or query string is required.'
      });
    }

    const payload = {
      question: studentQuestion.trim(),
      topic: topic || 'General Inquiry',
      chat_history: Array.isArray(chat_history) ? chat_history : []
    };

    console.log(`[Proxy -> AI Service] Forwarding question to ${AI_SERVICE_URL}/chat: "${payload.question.slice(0, 60)}..."`);

    // Call FastAPI RAG endpoint
    const response = await axios.post(`${AI_SERVICE_URL}/chat`, payload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30s timeout for LLM generation
    });

    // Attach student user info if authenticated
    const studentInfo = req.user
      ? { studentId: req.user.id, studentName: req.user.name }
      : { studentId: 'anonymous', studentName: 'Guest Student' };

    return res.json({
      success: true,
      data: response.data,
      metadata: {
        student: studentInfo,
        proxyTimestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[Proxy Error] Failed to communicate with FastAPI /chat:', error.message);

    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        error: 'AI Service Unavailable',
        message: `Could not connect to FastAPI at ${AI_SERVICE_URL}. Is the backend-ai service running?`,
        hint: 'Start the AI service with: cd backend-ai && uvicorn main:app --reload --port 8000'
      });
    }

    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({
        error: 'Gateway Timeout',
        message: 'The AI service took too long to generate a Socratic response.'
      });
    }

    const status = error.response?.status || 502;
    return res.status(status).json({
      error: 'Upstream AI Error',
      message: error.response?.data?.detail || error.message
    });
  }
});

// Alias routes for frontend backwards compatibility
router.post('/chat', (req, res, next) => {
  req.url = '/ask';
  router.handle(req, res, next);
});

router.post('/learn/ask', (req, res, next) => {
  req.url = '/ask';
  router.handle(req, res, next);
});

export default router;
