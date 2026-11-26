import express from 'express';
import {
  getCandidates,
  castVote,
  submitComplaint,
  updateProfile,
  getTimeline,
  getFaceImage,
  getEpicCard,
  getReceipt
} from '../controllers/voterController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/candidates', authenticateToken, getCandidates);
router.post('/vote', authenticateToken, castVote);
router.post('/complaints', authenticateToken, submitComplaint);
router.put('/users/profile', authenticateToken, updateProfile);
router.get('/users/face', authenticateToken, getFaceImage);
router.get('/users/epic-card', authenticateToken, getEpicCard);
router.get('/users/receipt/:electionId', authenticateToken, getReceipt);
router.get('/settings/timeline', getTimeline);

export default router;
