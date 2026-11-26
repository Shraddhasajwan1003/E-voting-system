import express from 'express';
import {
  getResults,
  getStats,
  getVoters,
  updateVoter,
  getComplaints,
  updateComplaint,
  getCandidates,
  addCandidate,
  updateCandidate,
  deleteCandidate,
  getElections,
  createElection,
  updateElection,
  getSirRequests,
  updateSirRequest,
  getBloOfficers,
  addBloOfficer,
  deleteBloOfficer,
  getAnnouncements,
  addAnnouncement,
  deleteAnnouncement,
  getAuditLogs,
  exportData,
  updateTimeline
} from '../controllers/adminController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requireAdmin);

// Overview & Analytics
router.get('/stats', getStats);
router.get('/results', getResults);
router.put('/settings/timeline', updateTimeline);

// Voters & Priority Queue
router.get('/voters', getVoters);
router.put('/voters/:id', updateVoter);

// Complaints & Grievances
router.get('/complaints', getComplaints);
router.put('/complaints/:id', updateComplaint);

// Candidates Management
router.get('/candidates', getCandidates);
router.post('/candidates', addCandidate);
router.put('/candidates/:id', updateCandidate);
router.delete('/candidates/:id', deleteCandidate);

// Elections Management
router.get('/elections', getElections);
router.post('/elections', createElection);
router.put('/elections/:id', updateElection);

// SIR Revision Requests & Verification
router.get('/sir-requests', getSirRequests);
router.put('/sir-requests/:id', updateSirRequest);

// BLO Officers
router.get('/blo-officers', getBloOfficers);
router.post('/blo-officers', addBloOfficer);
router.delete('/blo-officers/:id', deleteBloOfficer);

// Announcements
router.get('/announcements', getAnnouncements);
router.post('/announcements', addAnnouncement);
router.delete('/announcements/:id', deleteAnnouncement);

// Security Audit & CSV Exports
router.get('/audit-logs', getAuditLogs);
router.get('/export/:type', exportData);

export default router;
