import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { SCHEDULED_LANGUAGES, getLanguageByCode } from './data/languages';
import { API_BASE_URL } from './api';

export const baseEnResources = {
  app_name: 'Apna Mat',
  home_title: 'Secure Digital Election & Civic Portal',
  home_subtitle: 'Exercise your constitutional franchise with privacy-preserving electronic voting, Special Intensive Revision (SIR) 2026, and verifiable secret ballot receipts.',
  register_btn: 'Register as Voter (Form 6)',
  login_btn: 'Voter Login',
  services_title: 'Voter & Electoral Services',
  search_voter: 'Search Electoral Roll',
  download_epic: 'Download Digital E-EPIC',
  book_blo: 'Book a Call / Visit with BLO',
  download_roll: 'Download Constituency Roll',
  register_complaint: 'Grievance & Complaint Redressal',
  chatbot: 'Civic Guide AI Assistant',
  candidates_nav: 'Candidates & Manifestos',
  history_nav: 'Election History',
  sir_nav: 'SIR 2026 Hub',
  results_nav: 'Official Results',
  verify_receipt_nav: 'Verify VVPAT Receipt',
  sir_title: 'Special Intensive Revision (SIR) 2026',
  sir_desc: 'The Election Commission of India has initiated the nationwide Special Intensive Revision of Electoral Rolls. Ensure your name is listed, check your polling station part, and update any demographic discrepancies before voting commences.',
  check_revision: 'Check SIR Tracking Status',
  login: 'Login',
  logout: 'Logout',
  my_dashboard: 'My Dashboard',
  admin_dashboard: 'ECI Command Center',
  email_address: 'Email or EPIC Number',
  password: 'Password',
  secure_login: 'Secure Voter Login',
  login_desc: 'Access your voter profile, track revision petitions, or enter the ballot booth.',
  login_securely: 'Login Securely',
  no_account: "Don't have an account?",
  register_form6: 'Register to Vote (Form 6)',
  form6_title: 'Form 6 - New Voter Inclusion',
  form6_desc: 'Application for inclusion of name in the electoral roll for first-time or unregistered electors.',
  full_name: 'Full Name (As per Aadhaar)',
  mobile_number: 'Mobile Number',
  aadhaar_last4: 'Aadhaar (Last 4 Digits)',
  confirm_password: 'Confirm Password',
  face_auth_setup: 'Face Verification Setup',
  face_auth_desc: 'For ballot booth security, capture your facial photo. This ensures only you can unlock your ballot on election day.',
  start_camera: 'Start Camera',
  submit_registration: 'Submit Registration (Form 6)',
  voting_details: 'Designated Polling Station',
  constituency: 'Constituency',
  polling_station: 'Polling Station & Booth',
  voting_status: 'Voting Status',
  vote_cast_success: 'Vote Cast Successfully',
  thank_you_voting: 'Thank you for participating in the democratic process.',
  download_receipt: 'Download VVPAT Slip',
  pending_vote: 'Ballot Pending',
  pending_vote_desc: 'You have not cast your vote for the active election yet. Enter the secure electronic booth.',
  enter_voting_booth: 'Enter Voting Booth',
  form8_title: 'Form 8 - Demographic Correction',
  form8_desc: 'Update address, correct name spelling, or shift constituency in the electoral roll.',
  download_epic_desc: 'Official printable digital voter identity card with secure QR code verification.',
  form7_title: 'Form 7 - Deletion & Objection',
  form7_desc: 'Lodge an objection to a voter entry or request removal of shifted/deceased name.',
  secure_evm: 'Secure Electronic Voting Machine',
  face_auth_req: 'Biometric Face Verification',
  face_auth_req_desc: 'Verify your face live against your registered voter descriptor to unlock the official electronic ballot.',
  start_face_scan: 'Capture & Verify Face',
  identity_verified: 'Identity Cryptographically Verified',
  secret_vote: 'Your ballot is anonymous and encrypted end-to-end.',
  cast_vote: 'Cast Secret Vote',
  return_dashboard: 'Return to Dashboard',
  senior_assistance: 'Senior Citizen & PwD Assistance',
  senior_assistance_desc: 'Request wheelchair priority passes, audio ballot guidance, or home postal voting.',
  welcome: 'Welcome',
  compare_candidates: 'Compare Manifestos Side-by-Side',
  listen_tts: 'Read Aloud (TTS)',
  stop_tts: 'Stop Audio',
  vvpat_receipt_title: 'VVPAT Cryptographic Receipt'
};

export const baseHiResources = {
  app_name: 'अपना मत',
  home_title: 'सुरक्षित डिजिटल चुनाव एवं नागरिक पोर्टल',
  home_subtitle: 'गोपनीय इलेक्ट्रॉनिक मतदान, विशेष संक्षिप्त पुनरीक्षण (एसआईआर) 2026 और सत्यापन योग्य गुप्त मतपत्र रसीदों के साथ अपने संवैधानिक मताधिकार का प्रयोग करें।',
  register_btn: 'मतदाता के रूप में पंजीकरण करें (फॉर्म 6)',
  login_btn: 'मतदाता लॉगिन',
  services_title: 'मतदाता एवं निर्वाचन सेवाएं',
  search_voter: 'मतदाता सूची में अपना नाम खोजें',
  download_epic: 'डिजिटल ई-ईपीआईसी डाउनलोड',
  book_blo: 'बीएलओ के साथ कॉल / भेंट बुक करें',
  download_roll: 'निर्वाचन क्षेत्र की मतदाता सूची डाउनलोड करें',
  register_complaint: 'शिकायत एवं निवारण',
  chatbot: 'नागरिक मार्गदर्शक एआई सहायक',
  candidates_nav: 'उम्मीदवार एवं घोषणापत्र',
  history_nav: 'चुनाव इतिहास',
  sir_nav: 'एसआईआर 2026 केंद्र',
  results_nav: 'आधिकारिक परिणाम',
  verify_receipt_nav: 'वीवीपीएटी रसीद सत्यापित करें',
  sir_title: 'विशेष संक्षिप्त पुनरीक्षण (एसआईआर) 2026',
  sir_desc: 'भारत निर्वाचन आयोग ने मतदाता सूचियों के राष्ट्रव्यापी विशेष संक्षिप्त पुनरीक्षण की घोषणा की है। सुनिश्चित करें कि आपका नाम सूची में है और आगामी चुनावों से पहले विवरण सही हैं।',
  check_revision: 'पुनरीक्षण स्थिति जांचें',
  login: 'लॉगिन',
  logout: 'लॉगआउट',
  my_dashboard: 'मेरा डैशबोर्ड',
  admin_dashboard: 'ईसीआई कमान केंद्र',
  email_address: 'ईमेल या ईपीआईसी नंबर',
  password: 'पासवर्ड',
  secure_login: 'सुरक्षित मतदाता लॉगिन',
  login_desc: 'अपने डैशबोर्ड तक पहुंचें, पुनरीक्षण आवेदन ट्रैक करें, या मतदान केंद्र में प्रवेश करें।',
  login_securely: 'सुरक्षित रूप से लॉगिन करें',
  no_account: 'क्या आपके पास खाता नहीं है?',
  register_form6: 'मतदान के लिए पंजीकरण करें (फॉर्म 6)',
  form6_title: 'फॉर्म 6 - नया मतदाता पंजीकरण',
  form6_desc: 'पहली बार या गैर-पंजीकृत मतदाताओं के लिए मतदाता सूची में नाम शामिल करने का आवेदन।',
  full_name: 'पूरा नाम (आधार के अनुसार)',
  mobile_number: 'मोबाइल नंबर',
  aadhaar_last4: 'आधार (अंतिम 4 अंक)',
  confirm_password: 'पासवर्ड की पुष्टि करें',
  face_auth_setup: 'फेस सत्यापन सेटअप',
  face_auth_desc: 'सुरक्षित मतदान के लिए अपना चेहरा कैप्चर करें। यह मतदान के दिन आपकी पहचान सत्यापित करेगा।',
  start_camera: 'कैमरा शुरू करें',
  submit_registration: 'पंजीकरण जमा करें (फॉर्म 6)',
  voting_details: 'निर्धारित मतदान केंद्र',
  constituency: 'निर्वाचन क्षेत्र',
  polling_station: 'मतदान केंद्र एवं बूथ',
  voting_status: 'मतदान की स्थिति',
  vote_cast_success: 'वोट सफलतापूर्वक डाला गया',
  thank_you_voting: 'लोकतांत्रिक प्रक्रिया में भाग लेने के लिए धन्यवाद।',
  download_receipt: 'वीवीपीएटी पर्ची डाउनलोड करें',
  pending_vote: 'लंबित वोट',
  pending_vote_desc: 'आपने अभी तक सक्रिय चुनाव के लिए अपना वोट नहीं डाला है।',
  enter_voting_booth: 'मतदान केंद्र में प्रवेश करें',
  form8_title: 'फॉर्म 8 - प्रविष्टि सुधार',
  form8_desc: 'पते में बदलाव, वर्तनी सुधार या निर्वाचन क्षेत्र स्थानांतरण के लिए आवेदन करें।',
  download_epic_desc: 'सुरक्षित क्यूआर सत्यापन के साथ डिजिटल वोटर आईडी कार्ड।',
  form7_title: 'फॉर्म 7 - विलोपन एवं आपत्ति',
  form7_desc: 'मतदाता सूची से नाम हटाने या आपत्ति दर्ज करने के लिए आवेदन।',
  secure_evm: 'सुरक्षित इलेक्ट्रॉनिक वोटिंग मशीन',
  face_auth_req: 'फेस ऑथेंटिकेशन आवश्यक',
  face_auth_req_desc: 'मतपत्र तक पहुंचने से पहले चेहरे की पहचान का उपयोग करके पहचान सत्यापित करें।',
  start_face_scan: 'फेस स्कैन शुरू करें',
  identity_verified: 'पहचान सफलतापूर्वक सत्यापित',
  secret_vote: 'आपका वोट पूरी तरह से गुप्त और सुरक्षित है।',
  cast_vote: 'गुप्त वोट डालें',
  return_dashboard: 'डैशबोर्ड पर लौटें',
  senior_assistance: 'वरिष्ठ नागरिक एवं दिव्यांग सहायता',
  senior_assistance_desc: 'व्हीलचेयर प्राथमिकता पास, ऑडियो मार्गदर्शन या डाक मतपत्र का अनुरोध करें।',
  welcome: 'स्वागत है',
  compare_candidates: 'उम्मीदवारों की तुलना करें',
  listen_tts: 'बोलकर सुनें (टीटीएस)',
  stop_tts: 'ऑडियो रोकें',
  vvpat_receipt_title: 'वीवीपीएटी सत्यापन रसीद'
};

export const baseTaResources = {
  app_name: 'அப்னா மத்',
  home_title: 'பாதுகாப்பான டிஜிட்டல் தேர்தல் மற்றும் குடிமக்கள் தளம்',
  home_subtitle: 'ரகசிய வாக்கெடுப்பு, சிறப்பு தீவிர திருத்தம் (SIR) 2026 மற்றும் சரிபார்க்கக்கூடிய VVPAT ரசீதுகளுடன் உங்கள் வாக்களிக்கும் உரிமையைப் பயன்படுத்துங்கள்.',
  register_btn: 'வாக்காளராக பதிவு செய்க (படிவம் 6)',
  login_btn: 'வாக்காளர் உள்நுழைவு',
  services_title: 'வாக்காளர் மற்றும் தேர்தல் சேவைகள்',
  search_voter: 'வாக்காளர் பட்டியலில் தேடுங்கள்',
  download_epic: 'டிஜிட்டல் இ-எபிக் பதிவிறக்கம்',
  book_blo: 'பிஎல்ஓ சந்திப்பை பதிவு செய்க',
  download_roll: 'வாக்காளர் பட்டியலை பதிவிறக்குக',
  register_complaint: 'புகார் பதிவு மற்றும் தீர்வு',
  chatbot: 'குடிமக்கள் வழிகாட்டி AI உதவியாளர்',
  candidates_nav: 'வேட்பாளர்கள் மற்றும் தேர்தல் அறிக்கைகள்',
  history_nav: 'தேர்தல் வரலாறு',
  sir_nav: 'SIR 2026 மையம்',
  results_nav: 'அதிகாரப்பூர்வ முடிவுகள்',
  verify_receipt_nav: 'VVPAT ரசீதை சரிபார்க்கவும்',
  sir_title: 'சிறப்பு சுருக்க திருத்தம் (SIR) 2026',
  sir_desc: 'இந்திய தேர்தல் ஆணையம் வாக்காளர் பட்டியல்களின் சிறப்பு சுருக்க திருத்தத்தை அறிவித்துள்ளது.',
  check_revision: 'திருத்த நிலையை சரிபார்க்கவும்',
  login: 'உள்நுழைக',
  logout: 'வெளியேறு',
  my_dashboard: 'என் டாஷ்போர்டு',
  admin_dashboard: 'நிர்வாகி கமாண்ட் சென்டர்',
  email_address: 'மின்னஞ்சல் அல்லது EPIC எண்',
  password: 'கடவுச்சொல்',
  secure_login: 'பாதுகாப்பான வாக்காளர் உள்நுழைவு',
  login_desc: 'உங்கள் டாஷ்போர்டை அணுகி உங்கள் வாக்கை செலுத்துங்கள்.',
  login_securely: 'பாதுகாப்பாக உள்நுழைக',
  no_account: 'கணக்கு இல்லையா?',
  register_form6: 'வாக்களிக்க பதிவு செய்க (படிவம் 6)',
  form6_title: 'படிவம் 6 - புதிய வாக்காளர் பதிவு',
  form6_desc: 'வாக்காளர் பட்டியலில் பெயரை சேர்ப்பதற்கான விண்ணப்பம்.',
  full_name: 'முழு பெயர் (ஆதார் படி)',
  mobile_number: 'கைபேசி எண்',
  aadhaar_last4: 'ஆதார் (கடைசி 4 எண்கள்)',
  confirm_password: 'கடவுச்சொல்லை உறுதிப்படுத்தவும்',
  face_auth_setup: 'முக அங்கீகார அமைப்பு',
  face_auth_desc: 'பாதுகாப்பான வாக்களிப்பிற்கு, உங்கள் முகத்தை படம்பிடிக்க வேண்டும்.',
  start_camera: 'கேமராவைத் தொடங்கவும்',
  submit_registration: 'பதிவை சமர்ப்பிக்கவும்',
  voting_details: 'ஒதுக்கப்பட்ட வாக்குச்சாவடி',
  constituency: 'தொகுதி',
  polling_station: 'வாக்குச்சாவடி மையம்',
  voting_status: 'வாக்களிப்பு நிலை',
  vote_cast_success: 'வாக்கு வெற்றிகரமாக செலுத்தப்பட்டது',
  thank_you_voting: 'ஜனநாயக செயல்பாட்டில் பங்கேற்றதற்கு நன்றி.',
  download_receipt: 'VVPAT ரசீதை பதிவிறக்கம் செய்க',
  pending_vote: 'நிலுவையில் உள்ள வாக்கு',
  pending_vote_desc: 'நீங்கள் இன்னும் உங்கள் வாக்கை செலுத்தவில்லை.',
  enter_voting_booth: 'வாக்குச்சாவடிக்குள் நுழையவும்',
  form8_title: 'படிவம் 8 - திருத்தம்',
  form8_desc: 'முகவரி மற்றும் விவரங்களை திருத்துவதற்கு விண்ணப்பிக்கவும்.',
  download_epic_desc: 'டிஜிட்டல் வாக்காளர் அடையாள அட்டை.',
  form7_title: 'படிவம் 7 - நீக்கம்',
  form7_desc: 'வாக்காளர் பட்டியலில் இருந்து பெயரை நீக்க விண்ணப்பிக்கவும்.',
  secure_evm: 'பாதுகாப்பான மின்னணு வாக்குப்பதிவு இயந்திரம்',
  face_auth_req: 'முக அங்கீகாரம் தேவை',
  face_auth_req_desc: 'வாக்குச்சீட்டை அணுகுவதற்கு முன் உங்கள் அடையாளத்தை சரிபார்க்கவும்.',
  start_face_scan: 'முக ஸ்கேன் தொடங்கவும்',
  identity_verified: 'அடையாளம் வெற்றிகரமாக சரிபார்க்கப்பட்டது',
  secret_vote: 'உங்கள் வாக்கு ரகசியமானது மற்றும் பாதுகாப்பானது.',
  cast_vote: 'வாக்களிக்கவும்',
  return_dashboard: 'டாஷ்போர்டுக்கு திரும்பவும்',
  senior_assistance: 'முதியோர் மற்றும் மாற்றுத்திறனாளி உதவி',
  senior_assistance_desc: 'முன்னுரிமை பாஸ் மற்றும் உதவிகளை பெறவும்.',
  welcome: 'வணக்கம்',
  compare_candidates: 'வேட்பாளர்களை ஒப்பிடுக',
  listen_tts: 'கேட்க (TTS)',
  stop_tts: 'நிறுத்து',
  vvpat_receipt_title: 'VVPAT சரிபார்ப்பு ரசீது'
};

const resources = {
  en: { translation: baseEnResources },
  hi: { translation: baseHiResources },
  ta: { translation: baseTaResources }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

// Dynamic Loader for all 23 languages
export async function setApplicationLanguage(langCode: string): Promise<void> {
  const lang = getLanguageByCode(langCode);
  const normalizedCode = lang.code;

  // Set RTL or LTR
  document.documentElement.dir = lang.rtl ? 'rtl' : 'ltr';
  document.documentElement.lang = normalizedCode;

  // If already loaded in i18n
  if (i18n.hasResourceBundle(normalizedCode, 'translation')) {
    await i18n.changeLanguage(normalizedCode);
    localStorage.setItem('apnamat_lang', normalizedCode);
    return;
  }

  // Check localStorage cache
  const localCached = localStorage.getItem(`apnamat_i18n_${normalizedCode}`);
  if (localCached) {
    try {
      const bundle = JSON.parse(localCached);
      i18n.addResourceBundle(normalizedCode, 'translation', bundle, true, true);
      await i18n.changeLanguage(normalizedCode);
      localStorage.setItem('apnamat_lang', normalizedCode);
      return;
    } catch (e) {
      // Fall through to fetch
    }
  }

  // Fetch translated bundle from server AI translation API (which caches in MySQL)
  try {
    const res = await fetch(`${API_BASE_URL}/api/ai/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetLangCode: normalizedCode,
        targetLangName: lang.name,
        keyValueMap: baseEnResources
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.translated) {
        localStorage.setItem(`apnamat_i18n_${normalizedCode}`, JSON.stringify(data.translated));
        i18n.addResourceBundle(normalizedCode, 'translation', data.translated, true, true);
        await i18n.changeLanguage(normalizedCode);
        localStorage.setItem('apnamat_lang', normalizedCode);
        return;
      }
    }
  } catch (err) {
    console.warn(`Could not fetch dynamic translation for ${normalizedCode}:`, err);
  }

  // Default fallback to English
  await i18n.changeLanguage('en');
}

export default i18n;
