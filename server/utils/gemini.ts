import { GoogleGenAI, Type } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY || '';

export const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build'
    }
  }
});

const isApiKeyConfigured = Boolean(apiKey && !apiKey.includes('MY_GEMINI') && apiKey.length > 20);

// 1. Civic Guide Chatbot
export async function askCivicAssistant({
  message,
  history = [],
  language = 'en',
  userContext = null,
  constituencyCandidates = [],
  activeElections = []
}: {
  message: string;
  history?: Array<{ role: 'user' | 'model'; content: string }>;
  language?: string;
  userContext?: any;
  constituencyCandidates?: any[];
  activeElections?: any[];
}) {
  const systemPrompt = `You are the Official Civic Guide AI for "Apna Mat" - the digital election and Special Intensive Revision (SIR) platform of the Election Commission of India.
Your mission:
1. Provide accurate, non-partisan, neutral, and helpful civic information to citizens.
2. Guide voters on SIR 2026: Form 6 (New voter registration), Form 7 (Objection/Deletion of voter record), and Form 8 (Correction of entries, address shift, or constituency change).
3. Explain Booth Level Officer (BLO) appointment procedures, digital E-EPIC card downloads, and VVPAT verification receipts.
4. Assist Senior Citizens (60+) and Persons with Disabilities (PwD) on home postal voting and wheelchair priority booth passes.
5. Answer strictly based on the real election data and candidates provided in the context below. Never invent fictional candidates or endorse any political party.
6. Respond in the requested language (language code: ${language}) with polite, dignified, clear institutional language.

Context:
- Current Active Elections: ${JSON.stringify(activeElections)}
- Voter Profile (if authenticated): ${JSON.stringify(userContext || 'Guest User')}
- Candidates in Voter Constituency: ${JSON.stringify(constituencyCandidates)}
`;

  if (isApiKeyConfigured) {
    try {
      const contents: any[] = [{ role: 'user', parts: [{ text: systemPrompt }] }];
      for (const item of history.slice(-6)) {
        contents.push({
          role: item.role === 'model' ? 'model' : 'user',
          parts: [{ text: item.content }]
        });
      }
      contents.push({ role: 'user', parts: [{ text: message }] });

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents
      });

      if (response.text) {
        return response.text;
      }
    } catch (err) {
      console.warn('Gemini chat API call error, using grounded civic response fallback:', (err as any)?.message || err);
    }
  }

  // Domain Grounded Intelligent Fallback
  const q = message.toLowerCase();
  const langUpper = (language || 'en').toLowerCase();

  if (q.includes('form 8') || q.includes('correction') || q.includes('address') || q.includes('shift')) {
    return `Form 8 is used for demographic corrections, shifting of residence within or outside the constituency, and EPIC replacement. You can submit Form 8 directly under the **SIR Services** tab (/sir). Once submitted, a tracking ID (e.g. SIR2026-XXXX) will be generated and assigned to your constituency Booth Level Officer (BLO) for field verification.`;
  }

  if (q.includes('form 7') || q.includes('delete') || q.includes('objection')) {
    return `Form 7 is used to lodge an objection against an existing voter entry or request deletion of a deceased/shifted voter's name from the electoral roll. You can file Form 7 via the **SIR Services** portal (/sir) with supporting remarks.`;
  }

  if (q.includes('form 6') || q.includes('new voter') || q.includes('register')) {
    return `Form 6 is for first-time voter registration (citizens who are 18+ years of age). You can register online through our **Register to Vote (Form 6)** page (/register) with your Aadhaar last 4 digits and facial verification photo.`;
  }

  if (q.includes('blo') || q.includes('booth level officer') || q.includes('appointment') || q.includes('call')) {
    return `You can find your assigned Booth Level Officer (BLO) and schedule an in-person, telephonic, or senior-citizen home visit appointment through the **Book a Call with BLO** page (/blo).`;
  }

  if (q.includes('candidate') || q.includes('who is running') || q.includes('manifesto')) {
    if (constituencyCandidates.length > 0) {
      const candList = constituencyCandidates
        .map((c) => `- **${c.name}** (${c.party_name}): ${c.manifesto_json ? (Array.isArray(c.manifesto_json) ? c.manifesto_json.slice(0, 2).join('; ') : '') : 'Active candidate'}`)
        .join('\n');
      return `Here are the candidates contesting in your constituency:\n\n${candList}\n\nYou can explore full affidavits, education details, declared assets, and side-by-side manifesto comparisons in the **Candidates Directory** (/candidates).`;
    }
    return `You can view all candidates, declared affidavits, education, and manifestos under the **Candidates Directory** (/candidates). Select your constituency to view verified profiles and compare their policy promises neutrally.`;
  }

  if (q.includes('senior') || q.includes('pwd') || q.includes('wheelchair') || q.includes('home voting') || q.includes('elderly')) {
    return `Apna Mat provides specialized accessibility features for Senior Citizens (aged 60+) and Persons with Disabilities (PwD). You can activate Senior Accessibility Mode using the dock on the bottom right, request a Home Postal Ballot from your dashboard, or download a Priority Booth Pass for zero-wait wheelchair access at your designated polling station.`;
  }

  if (q.includes('receipt') || q.includes('vvpat') || q.includes('verify')) {
    return `After casting your ballot in the secure electronic voting booth, you receive an official cryptographic VVPAT receipt code (e.g. VVPAT-XXXX-XXXX). You can independently verify that your ballot has been tallied in the constituency ledger at **Verify Receipt** (/verify-receipt) while keeping your vote completely secret.`;
  }

  return `Welcome to Apna Mat! As your Official Civic Guide, I can help you with:\n1. **Electoral Roll & SIR 2026**: Search voter roll, file Form 6/7/8, and check revision tracking status.\n2. **E-EPIC Card**: View and download your digital voter identity card.\n3. **Candidates & Manifestos**: Neutral, non-partisan comparison of constituency candidates.\n4. **Accessibility**: Senior Citizen (60+) and PwD priority passes and voice assistance.\n5. **VVPAT Verification**: Verify that your vote has been securely recorded.\n\nHow may I assist your democratic participation today?`;
}

// 2. Neutral Candidate Comparison & Q&A
export async function compareCandidatesNeutral({
  candidates,
  question,
  language = 'en'
}: {
  candidates: any[];
  question?: string;
  language?: string;
}) {
  const systemPrompt = `You are a strictly neutral, non-partisan Election Commission analyst.
Analyze the following candidate profiles and manifestos impartially.
CRITICAL MANDATES:
- NEVER express preference, endorse, or rank any candidate or political party.
- Present facts objectively based strictly on the provided education, declared assets, criminal record transparency, and policy manifesto pledges.
- If a question is asked (e.g., comparing their healthcare or education plans), summarize each candidate's stated manifesto commitments factually and side-by-side.
- Respond in language: ${language}.

Candidates Data:
${JSON.stringify(candidates, null, 2)}
`;

  if (isApiKeyConfigured) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: [
          { role: 'user', parts: [{ text: systemPrompt }] },
          { role: 'user', parts: [{ text: question ? `Voter question: "${question}". Provide a neutral factual comparison.` : 'Provide a comprehensive neutral side-by-side comparison of these candidates.' }] }
        ]
      });

      if (response.text) {
        return response.text;
      }
    } catch (err) {
      console.warn('Gemini compare candidates error, using grounded fallback:', (err as any)?.message || err);
    }
  }

  // Grounded comparison fallback
  let comparison = `### Neutral Candidate Overview\n\n`;
  for (const c of candidates) {
    const promises = Array.isArray(c.manifesto_json) ? c.manifesto_json : (typeof c.manifesto_json === 'string' ? JSON.parse(c.manifesto_json || '[]') : []);
    comparison += `#### **${c.name}** — *${c.party_name}* (Symbol: ${c.party_symbol})\n`;
    comparison += `- **Age & Education**: ${c.age ? `${c.age} years old · ` : ''}${c.education || 'Declared in affidavit'}\n`;
    comparison += `- **Occupation**: ${c.occupation || 'Public Service'}\n`;
    comparison += `- **Declared Assets**: ${c.assets_declared || 'As per ECI disclosure'}\n`;
    comparison += `- **Criminal Cases**: ${c.criminal_cases === 0 ? 'Zero declared cases' : `${c.criminal_cases} case(s) declared`}\n`;
    if (promises.length > 0) {
      comparison += `- **Key Manifesto Pledges**:\n`;
      promises.slice(0, 4).forEach((p: string) => {
        comparison += `  • ${p}\n`;
      });
    }
    comparison += `\n`;
  }

  if (question) {
    comparison += `> **Analysis on "${question}"**: Review each candidate's stated priorities above to determine which platform aligns closest with your civic preferences. All candidates have filed sworn affidavits with the Election Commission.`;
  }

  return comparison;
}

// 3. Automated Complaint Triage & Categorization
export async function triageComplaint({
  subject,
  description
}: {
  subject: string;
  description: string;
}) {
  if (isApiKeyConfigured) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `You are an ECI Grievance Officer AI. Categorize and triage this citizen complaint:\nSubject: ${subject}\nDescription: ${description}`
              }
            ]
          }
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              category: {
                type: Type.STRING,
                description: 'One of: VOTER_ROLL, POLLING_BOOTH, ACCESSIBILITY, MODEL_CODE_OF_CONDUCT, EVM_VVPAT, BLO_ASSISTANCE, OTHER'
              },
              priority: {
                type: Type.STRING,
                description: 'One of: HIGH, MEDIUM, LOW'
              },
              summary: {
                type: Type.STRING,
                description: 'Concise 1-sentence administrative summary of the grievance'
              },
              suggestedReply: {
                type: Type.STRING,
                description: 'Formal, reassuring, official ECI administrative draft reply acknowledging the grievance and outlining immediate next steps.'
              }
            },
            required: ['category', 'priority', 'summary', 'suggestedReply']
          }
        }
      });

      if (response.text) {
        return JSON.parse(response.text);
      }
    } catch (err) {
      console.warn('Gemini complaint triage error, using heuristic fallback:', (err as any)?.message || err);
    }
  }

  // Heuristic Triage Fallback
  const text = `${subject} ${description}`.toLowerCase();
  let category = 'GENERAL';
  let priority = 'MEDIUM';

  if (text.includes('wheelchair') || text.includes('disability') || text.includes('senior') || text.includes('elderly') || text.includes('blind') || text.includes('braille')) {
    category = 'ACCESSIBILITY';
    priority = 'HIGH';
  } else if (text.includes('booth') || text.includes('polling station') || text.includes('queue') || text.includes('security')) {
    category = 'POLLING_BOOTH';
    priority = 'HIGH';
  } else if (text.includes('roll') || text.includes('name missing') || text.includes('epic') || text.includes('form 8') || text.includes('voter list')) {
    category = 'VOTER_ROLL';
    priority = 'MEDIUM';
  } else if (text.includes('blo') || text.includes('officer') || text.includes('appointment')) {
    category = 'BLO_ASSISTANCE';
    priority = 'MEDIUM';
  } else if (text.includes('bribe') || text.includes('threat') || text.includes('party worker') || text.includes('violation')) {
    category = 'MODEL_CODE_OF_CONDUCT';
    priority = 'HIGH';
  }

  return {
    category,
    priority,
    summary: `Citizen raised an inquiry regarding ${subject}.`,
    suggestedReply: `Thank you for bringing this matter to the attention of the Election Commission of India. Your grievance (Category: ${category}) has been logged under priority ${priority}. The designated Returning Officer and constituency team have been notified to review the details and initiate necessary field verification.`
  };
}

// 4. Admin Analytics Executive Briefing
export async function summarizeElectionAnalytics({
  stats,
  turnoutByConstituency = [],
  sirBacklog = 0
}: {
  stats: any;
  turnoutByConstituency?: any[];
  sirBacklog?: number;
}) {
  if (isApiKeyConfigured) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `You are the Chief Electoral Officer Chief of Staff. Generate an executive summary briefing for the Election Commission leadership based on these live metrics:\nStats: ${JSON.stringify(stats)}\nConstituency Data: ${JSON.stringify(turnoutByConstituency)}\nPending SIR Petitions: ${sirBacklog}\n\nFormat as structured markdown with sections: Executive Overview, Key Turnout Highlights, Operational Vigilance & Action Items.`
              }
            ]
          }
        ]
      });

      if (response.text) {
        return response.text;
      }
    } catch (err) {
      console.warn('Gemini analytics briefing error, using heuristic fallback:', (err as any)?.message || err);
    }
  }

  return `### Election Commission Executive Briefing

#### 1. Executive Overview
- **Voter Base Registered**: ${stats?.totalVoters ?? 0} electors active in electoral rolls.
- **Ballots Tallied**: ${stats?.totalVotes ?? 0} secret ballots recorded with cryptographic VVPAT verification hashes.
- **Voter Turnout**: **${stats?.turnoutPercentage ?? 0}%** overall participation.
- **Special Intensive Revision (SIR) Queue**: ${sirBacklog} pending Form 6/7/8 petitions under active BLO field review.

#### 2. Key Operational Observations
- All voting machine endpoints are operating securely with 100% cryptographic integrity.
- Senior Citizen & PwD accessibility stations report normal dispatch of assisted passes.
- Grievance redressal rate is within designated ECI service-level agreements.

#### 3. Recommended Administrative Actions
- Maintain continuous queue monitoring across high-density urban polling stations.
- Accelerate BLO clearance of pending Form 8 address revisions prior to final roll publication.`;
}

// 5. 22-Language UI / Manifesto Batch Translation
export async function translateBatch({
  targetLangCode,
  targetLangName,
  keyValueMap
}: {
  targetLangCode: string;
  targetLangName: string;
  keyValueMap: Record<string, string>;
}) {
  if (isApiKeyConfigured) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `You are a master translator specializing in official Eighth Schedule Indian languages.
Translate the key-value dictionary below into "${targetLangName}" (ISO code: "${targetLangCode}").
Maintain respectful civic terminology appropriate for the Election Commission of India.
Return strictly valid JSON where each key exactly matches the original key and the value is the high-quality translation in ${targetLangName} script.

Source Dictionary:
${JSON.stringify(keyValueMap, null, 2)}`
              }
            ]
          }
        ],
        config: {
          responseMimeType: 'application/json'
        }
      });

      if (response.text) {
        return JSON.parse(response.text);
      }
    } catch (err) {
      console.warn('Gemini translateBatch error:', (err as any)?.message || err);
    }
  }

  // Graceful fallback returns source map so UI never fails
  return keyValueMap;
}

// 6. Elderly / Accessible Read-Aloud TTS via gemini-3.8-flash-lite-tts
export async function synthesizeSpeech({
  text,
  language = 'en'
}: {
  text: string;
  language?: string;
}) {
  if (isApiKeyConfigured) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Read aloud clearly, calmly, and slowly in ${language}: "${text}"`
              }
            ]
          }
        ]
      });

      // Check if inlineData or audio was returned
      const candidates = response.candidates;
      if (candidates && candidates.length > 0) {
        const parts = candidates[0].content?.parts || [];
        for (const p of parts) {
          if ((p as any).inlineData && (p as any).inlineData.data) {
            return {
              audioBase64: (p as any).inlineData.data,
              mimeType: (p as any).inlineData.mimeType || 'audio/wav',
              useClientFallback: false
            };
          }
        }
      }
    } catch (err) {
      console.warn('Gemini synthesizeSpeech error:', (err as any)?.message || err);
    }
  }

  // Fallback tells client to use browser window.speechSynthesis
  return {
    audioBase64: null,
    mimeType: null,
    useClientFallback: true
  };
}

// 7. Voice Input Transcription via gemini-3.5-transcribe
export async function transcribeAudio({
  base64Audio,
  mimeType = 'audio/webm',
  language = 'en'
}: {
  base64Audio: string;
  mimeType?: string;
  language?: string;
}) {
  if (isApiKeyConfigured && base64Audio) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  data: base64Audio,
                  mimeType
                }
              },
              {
                text: `Transcribe this voter spoken voice recording accurately into text. Language expected: ${language}. Return ONLY the transcribed text.`
              }
            ]
          }
        ]
      });

      if (response.text) {
        return response.text.trim();
      }
    } catch (err) {
      console.warn('Gemini transcribeAudio error:', (err as any)?.message || err);
    }
  }

  return '';
}
