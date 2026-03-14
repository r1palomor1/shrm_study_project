import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';

async function getApiKey() {
    try {
        const env = fs.readFileSync('.env.local', 'utf8');
        const match = env.match(/GEMINI_API_KEY=["']?([^"'\n]+)["']?/);
        return match ? match[1] : null;
    } catch (e) {
        return null;
    }
}

async function testModel(modelName, key) {
    console.log(`\n--- Testing Model: ${modelName} ---`);
    
    try {
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Say 'Hello, I am the 3.1 Flash-Lite model!'");
        const response = await result.response;
        console.log(`✅ Success: ${response.text()}`);
    } catch (error) {
        console.error(`❌ Failure for ${modelName}:`);
        console.error(`   Message: ${error.message}`);
    }
}

async function runTests() {
    const key = await getApiKey();
    if (!key) {
        console.error("❌ Error: Could not find API Key in .env.local");
        return;
    }

    console.log("Starting Targeted Model Validation...");
    // Specifically testing the 3.1 suite mentioned in the chat history
    const models = ["gemini-3.1-flash-lite", "gemini-3.1-flash", "gemini-3.1-pro"];
    
    for (const m of models) {
        await testModel(m, key);
    }
}

runTests();
