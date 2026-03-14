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
        const result = await model.generateContent("Say 'Hello, I am working!'");
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

    console.log("Starting Gemini API Diagnostics...");
    // Common models to check
    const models = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-2.5-flash", "gemini-3-flash"];
    
    for (const m of models) {
        await testModel(m, key);
    }
}

runTests();
