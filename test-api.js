
const http = require('http');

const data = JSON.stringify({
  mode: 'generate-distractors',
  cards: [
    {
      id: 'test-id',
      topic: 'Test Topic',
      question: 'What is HR?',
      answer: 'Human Resources'
    }
  ]
});

const options = {
  hostname: 'localhost',
  port: 5173,
  path: '/api/study-coach',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('Body:', body);
  });
});

req.on('error', (e) => {
  console.error(`Error: ${e.message}`);
});

req.write(data);
req.end();
