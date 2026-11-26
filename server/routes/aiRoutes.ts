import express from 'express';
import crypto from 'crypto';
import { pool } from '../config/db.js';
import {
  askCivicAssistant,
  compareCandidatesNeutral,
  triageComplaint,
  summarizeElectionAnalytics,
  translateBatch,
  synthesizeSpeech,
  transcribeAudio
} from '../utils/gemini.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// 1. AI Civic Assistant Chat
router.post('/chat', async (req: any, res: any) => {
  const { message, history, language, constituency } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    let constituencyCandidates: any[] = [];
    if (constituency) {
      const [cands]: any = await pool.query(
        'SELECT id, name, party_name, party_symbol, education, occupation, assets_declared, criminal_cases, manifesto_json FROM candidates WHERE constituency = ?',
        [constituency]
      );
      constituencyCandidates = cands;
    }

    const [activeElections]: any = await pool.query(
      "SELECT id, title, election_type, start_time, end_time FROM elections WHERE status = 'ACTIVE' LIMIT 2"
    );

    const reply = await askCivicAssistant({
      message,
      history: history || [],
      language: language || 'en',
      userContext: req.user || null,
      constituencyCandidates,
      activeElections
    });

    res.json({ reply });
  } catch (error: any) {
    console.error('AI chat error:', error);
    res.status(500).json({ error: 'Failed to process AI chat request' });
  }
});

// 2. Neutral Candidate Comparison
router.post('/compare-candidates', async (req: any, res: any) => {
  const { candidateIds, question, language } = req.body;

  try {
    let candidates: any[] = [];
    if (Array.isArray(candidateIds) && candidateIds.length > 0) {
      const placeholders = candidateIds.map(() => '?').join(',');
      const [rows]: any = await pool.query(
        `SELECT id, name, party_name, party_symbol, constituency, age, education, occupation, assets_declared, criminal_cases, bio, manifesto_json 
         FROM candidates WHERE id IN (${placeholders})`,
        candidateIds
      );
      candidates = rows;
    } else {
      // Default to candidates from active election
      const [rows]: any = await pool.query(
        `SELECT id, name, party_name, party_symbol, constituency, age, education, occupation, assets_declared, criminal_cases, bio, manifesto_json 
         FROM candidates LIMIT 4`
      );
      candidates = rows;
    }

    const comparison = await compareCandidatesNeutral({
      candidates,
      question,
      language: language || 'en'
    });

    res.json({ comparison, candidates });
  } catch (error: any) {
    console.error('Candidate comparison error:', error);
    res.status(500).json({ error: 'Failed to compare candidates' });
  }
});

// 3. Elderly / Accessible Text-to-Speech
router.post('/tts', async (req: any, res: any) => {
  const { text, language } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Text is required for TTS' });
  }

  try {
    const result = await synthesizeSpeech({
      text,
      language: language || 'en'
    });
    res.json(result);
  } catch (error: any) {
    console.error('TTS error:', error);
    res.json({ audioBase64: null, mimeType: null, useClientFallback: true });
  }
});

// 4. Voice Transcription
router.post('/transcribe', async (req: any, res: any) => {
  const { base64Audio, mimeType, language } = req.body;
  if (!base64Audio) {
    return res.status(400).json({ error: 'base64Audio is required' });
  }

  try {
    const text = await transcribeAudio({
      base64Audio,
      mimeType: mimeType || 'audio/webm',
      language: language || 'en'
    });
    res.json({ text });
  } catch (error: any) {
    console.error('Transcribe error:', error);
    res.status(500).json({ error: 'Failed to transcribe audio' });
  }
});

// 5. 22-Language UI Translation with MySQL Cache
router.post('/translate', async (req: any, res: any) => {
  const { targetLangCode, targetLangName, keyValueMap } = req.body;

  if (!targetLangCode || !keyValueMap) {
    return res.status(400).json({ error: 'targetLangCode and keyValueMap are required' });
  }

  try {
    const sourceString = JSON.stringify(keyValueMap);
    const sourceHash = crypto.createHash('sha256').update(sourceString).digest('hex');

    // Check MySQL cache
    const [cached]: any = await pool.query(
      'SELECT translated_json FROM translations_cache WHERE lang_code = ? AND source_hash = ? LIMIT 1',
      [targetLangCode, sourceHash]
    );

    if (cached.length > 0 && cached[0].translated_json) {
      const parsed = JSON.parse(cached[0].translated_json);
      return res.json({ translated: parsed, source: 'cache' });
    }

    // Call Gemini translation
    const translated = await translateBatch({
      targetLangCode,
      targetLangName: targetLangName || targetLangCode,
      keyValueMap
    });

    // Save in cache
    try {
      await pool.query(
        'INSERT INTO translations_cache (lang_code, source_hash, translated_json) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE translated_json = VALUES(translated_json)',
        [targetLangCode, sourceHash, JSON.stringify(translated)]
      );
    } catch (cacheErr) {
      console.warn('Failed to save in translations_cache:', cacheErr);
    }

    res.json({ translated, source: 'gemini' });
  } catch (error: any) {
    console.error('Translation endpoint error:', error);
    // Return original so client never breaks
    res.json({ translated: keyValueMap, source: 'fallback' });
  }
});

// 6. Admin Executive Briefing
router.post('/admin-briefing', authenticateToken, async (req: any, res: any) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const [totalVoters]: any = await pool.query('SELECT COUNT(*) as count FROM voters');
    const [totalVotes]: any = await pool.query('SELECT COUNT(*) as count FROM votes');
    const [pendingComplaints]: any = await pool.query('SELECT COUNT(*) as count FROM complaints WHERE status = ?', ['pending']);
    const [pendingSir]: any = await pool.query("SELECT COUNT(*) as count FROM revision_requests WHERE status IN ('SUBMITTED', 'BLO_ASSIGNED', 'FIELD_VERIFIED')");

    const vCount = totalVoters[0].count;
    const voteCount = totalVotes[0].count;

    const stats = {
      totalVoters: vCount,
      totalVotes: voteCount,
      turnoutPercentage: vCount > 0 ? ((voteCount / vCount) * 100).toFixed(2) : 0,
      pendingComplaints: pendingComplaints[0].count
    };

    const [turnoutByConstituency]: any = await pool.query(`
      SELECT constituency, COUNT(*) as vote_count 
      FROM votes 
      WHERE constituency IS NOT NULL 
      GROUP BY constituency 
      ORDER BY vote_count DESC 
      LIMIT 5
    `);

    const briefing = await summarizeElectionAnalytics({
      stats,
      turnoutByConstituency,
      sirBacklog: pendingSir[0]?.count || 0
    });

    res.json({ briefing, stats });
  } catch (error: any) {
    console.error('Admin briefing error:', error);
    res.status(500).json({ error: 'Failed to generate admin briefing' });
  }
});

export default router;
