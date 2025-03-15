'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const { SonnyLabsClient } = require('../index');

// Example configuration for SonnyLabs client
const sonnyLabsClient = new SonnyLabsClient({
  apiToken: process.env.SONNYLABS_API_TOKEN || 'your-api-token',
  baseUrl: process.env.SONNYLABS_BASE_URL || 'https://sonnylabs-service.onrender.com',
  analysisId: process.env.SONNYLABS_ANALYSIS_ID || 'your-analysis-id'
});

// Mock LLM API client (replace with your actual LLM integration)
const mockLLMClient = {
  generateResponse: async (prompt) => {
    console.log('Generating LLM response for prompt:', prompt);
    return `This is a mock response to: "${prompt}"`;
  }
};

// Create Express app
const app = express();
app.use(bodyParser.json());

// Chatbot endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, conversationId } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Step 1: Analyze user input with SonnyLabs
    console.log(`[${conversationId}] Analyzing user input with SonnyLabs...`);
    const analysisResult = await sonnyLabsClient.analyzeText(message, 'input');
    
    // Step 2: Check for prompt injections
    if (sonnyLabsClient.isPromptInjection(analysisResult)) {
      console.log(`[${conversationId}] Prompt injection detected`);
      return res.status(403).json({
        error: 'Security check failed',
        message: 'Your input contains potentially harmful content.'
      });
    }
    
    // Step 3: Check for PII
    const piiResults = sonnyLabsClient.getPII(analysisResult);
    if (piiResults.length > 0) {
      const piiTypes = piiResults.map(p => p.label).join(', ');
      console.log(`[${conversationId}] PII detected: ${piiTypes}`);
      return res.status(403).json({
        error: 'Privacy check failed',
        message: 'Please avoid sharing personal information like ' + piiTypes.toLowerCase()
      });
    }
    
    // Step 4: Generate AI response (safe input)
    console.log(`[${conversationId}] Input is safe, generating AI response...`);
    const aiResponse = await mockLLMClient.generateResponse(message);
    
    // Step 5: Analyze AI output with SonnyLabs
    console.log(`[${conversationId}] Analyzing AI output with SonnyLabs...`);
    // Reuse the tag from input analysis to link them in the dashboard
    const outputAnalysisResult = await sonnyLabsClient.analyzeText(aiResponse, 'output', analysisResult.tag);
    
    // If AI output analysis identifies issues, you could modify the response here
    // For this example, we'll just proceed with the original response
    
    // Step 6: Return safe response to user
    console.log(`[${conversationId}] Chat response sent successfully`);
    return res.json({
      response: aiResponse,
      conversationId,
      metadata: {
        inputAnalysisTag: analysisResult.tag,
        outputAnalysisTag: outputAnalysisResult.tag
      }
    });
    
  } catch (error) {
    console.error('Chat API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred while processing your request'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Chatbot server running on port ${PORT}`);
  console.log(`SonnyLabs security analysis enabled (Analysis ID: ${sonnyLabsClient.analysisId})`);
});

module.exports = app; // For testing purposes
