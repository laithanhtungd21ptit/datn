import 'dotenv/config';
import axios from 'axios';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('❌ GEMINI_API_KEY not found');
  process.exit(1);
}

console.log('Testing different Gemini models...\n');
console.log('API Key:', apiKey.substring(0, 10) + '...\n');

const models = [
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-pro'
];

for (const model of models) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
  try {
    const res = await axios.post(
      url,
      { contents: [{ parts: [{ text: 'Hi' }] }] },
      { timeout: 10000 }
    );
    
    console.log(`✅ ${model}: WORKING!`);
    console.log(`   Response: ${res.data.candidates?.[0]?.content?.parts?.[0]?.text?.substring(0, 50) || 'No text'}\n`);
    break; // Found working model
  } catch (err) {
    if (err.response?.status === 404) {
      console.log(`❌ ${model}: Not found (404)`);
    } else if (err.response?.status === 429) {
      const errorMsg = err.response?.data?.error?.message || '';
      if (errorMsg.includes('limit: 0')) {
        console.log(`❌ ${model}: Quota limit is 0 (Free tier not activated)`);
      } else {
        console.log(`❌ ${model}: Quota exceeded (429)`);
      }
    } else {
      console.log(`❌ ${model}: ${err.response?.status || err.message}`);
    }
  }
}

console.log('\n📋 IMPORTANT:');
console.log('If all models show "limit: 0", you need to:');
console.log('1. Go to: https://console.cloud.google.com/');
console.log('2. Create or select a Google Cloud Project');
console.log('3. Enable "Generative Language API"');
console.log('4. Link a billing account (even for free tier)');
console.log('5. Wait a few minutes for quota to activate');
console.log('\nMore info: https://ai.google.dev/gemini-api/docs/rate-limits');

