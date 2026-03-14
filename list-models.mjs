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

async function listModels() {
    const key = await getApiKey();
    if (!key) {
        console.error("❌ Error: Could not find API Key in .env.local");
        return;
    }

    try {
        // We Use fetch directly to avoid SDK version abstraction issues for listing
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.models) {
            console.log("--- Available Models for your API Key ---");
            data.models.forEach(m => {
                console.log(`- ${m.name.replace('models/', '')} (supports: ${m.supportedGenerationMethods.join(', ')})`);
            });
        } else {
            console.log("No models found or error in response:", data);
        }
    } catch (error) {
        console.error("❌ Error listing models:", error.message);
    }
}

listModels();
