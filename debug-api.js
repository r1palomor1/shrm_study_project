
const fs = require('fs');
const path = require('path');

try {
  const envPath = path.join(__dirname, '.env.local');
  const env = fs.readFileSync(envPath, 'utf8');
  const match = env.match(/GEMINI_API_KEY="(.+?)"/);
  
  if (!match) {
    console.error('API Key not found in .env.local');
    process.exit(1);
  }

  process.env.GEMINI_API_KEY = match[1];
  console.log('API Key loaded (length):', process.env.GEMINI_API_KEY.length);

  const studyCoach = require('./api/study-coach');
  const mockReq = {
    method: 'POST',
    body: {
      mode: 'generate-distractors',
      cards: [
        { id: 'test', topic: 'Test', question: 'Q', answer: 'A' }
      ]
    }
  };

  const mockRes = {
    status: function(c) {
      this.statusCode = c;
      return this;
    },
    json: function(d) {
      console.log('Status:', this.statusCode);
      console.log('Data:', JSON.stringify(d, null, 2));
    }
  };

  studyCoach(mockReq, mockRes);
} catch (err) {
  console.error('Error during debug:', err);
}
