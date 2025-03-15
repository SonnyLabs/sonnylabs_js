# SonnyLabs Node.js Client

Detect prompt injections and PII in real-time in your AI applications using the SonnyLabs REST API.

## Table of Contents

- [About](#about)  
- [Security Risks in AI Applications](#security-risks-in-ai-applications)
- [Installation](#installation)
- [Pre-requisites](#pre-requisites)
- [Prompt to Integrate SonnyLabs to your AI application](#prompt-to-integrate-sonnylabs-to-your-ai-application)
- [Example](#example)
- [API Reference](#api-reference)
- [License](#license)

## About

SonnyLabs.ai is a cybersecurity REST API that provides security protection for AI applications. It can be used to detect the risk of prompt injection and PII in prompts and LLM responses, especially useful for securing AI applications and AI agents.

This package is a simple Node.js client for the SonnyLabs REST API. There are 10,000 free requests to the REST API per month.

## Security Risks in AI Applications 

### Prompt Injection
Prompt injections are malicious inputs to AI applications that were designed by the user to manipulate an LLM into ignoring its original instructions or safety controls.

Risks associated with prompt injections:
- Bypassing content filters and safety mechanisms
- Extracting confidential system instructions
- Causing the LLM to perform unauthorized actions
- Compromising application security

### PII
PII (Personally Identifiable Information) refers to any information that can be used to identify an individual, such as their name, email address, phone number, or social security number.

Risks associated with PII:
- Unauthorized access to personal information
- Data breaches and identity theft
- Unauthorized disclosure of sensitive information
- Unauthorized modification of personal data

The SonnyLabs REST API provides a way to detect prompt injections and PII in real-time in your AI applications.

## REST API output example

```json 
{
  "analysis": [
    {
      "type": "score",
      "name": "prompt_injection",
      "result": 0.99
    },    {
      "type": "PII",
      "result": [
        {"label": "EMAIL", "text": "example@email.com"},
        {"label": "PHONE", "text": "123-456-7890"}
      ]
    }
  ],
  "tag": "unique-request-identifier"
}
```

## Installation
The package will soon be available on NPM, but you can now install it on your system directly from GitHub:

```bash
npm install git+https://github.com/SonnyLabs/sonnylabs_js
```

Alternatively, you can clone the repository and install locally:
```bash
git clone https://github.com/SonnyLabs/sonnylabs_js
cd sonnylabs_js
npm install -e .
```

## Pre-requisites 
These are the pre-requisites for this package and to use the SonnyLabs REST API.

- Node.js 12 or higher
- An AI application/AI agent to integrate SonnyLabs with
- [A Sonnylabs account](https://sonnylabs-service.onrender.com)
- [A SonnyLabs API token](https://sonnylabs-service.onrender.com/analysis/api-keys)
- [A SonnyLabs analysis ID](https://sonnylabs-service.onrender.com/analysis)   
- Environment variables or a configuration file to store your API token and analysis ID

### To register to SonnyLabs

1. Go to https://sonnylabs-service.onrender.com and register. 
2. Confirm your email address, and login to your new SonnyLabs account [here](https://sonnylabs-service.onrender.com).

### To get a SonnyLabs API token:
1. Go to [API Keys](https://sonnylabs-service.onrender.com/analysis/api-keys).
2. Select + Generate New API Key.
3. Copy the generated API key.
4. Store the API key in your environment variables or configuration file as SONNYLABS_API_TOKEN.

### To get a SonnyLabs analysis ID:
1. Go to [Analysis](https://sonnylabs-service.onrender.com/analysis).
2. Create a new analysis and name it after the AI application/AI agent you will be protecting.
3. After you press Submit, you will be brought to the empty analysis page.
4. The analysis ID is the last part of the URL, like https://sonnylabs-service.onrender.com/analysis/{analysis_id}. Note that the analysis ID can also be found in the [SonnyLabs analysis dashboard](https://sonnylabs-service.onrender.com/analysis).
5. Store the analysis ID in your environment variables or configuration file as SONNYLABS_ANALYSIS_ID.

### Setting up environment variables
You can use the `dotenv` package to load environment variables from a `.env` file:

```bash
npm install dotenv
```

Create a `.env` file in your project root directory:
```
SONNYLABS_API_TOKEN=your_api_token_here
SONNYLABS_ANALYSIS_ID=your_analysis_id_here
```

Load these in your Node.js application:
```javascript
require('dotenv').config();
```

## Prompt to Integrate SonnyLabs to your AI application
Here is an example prompt to give to your IDE's LLM (Cursor, VSCode, Windsurf etc) to integrate the Sonnylabs REST API to your AI application.

```
As an expert AI developer, help me integrate SonnyLabs security features into my existing JavaScript/Node.js AI application.

I need to implement the following security measures:
1. Block prompt injections in both user inputs and AI outputs
2. Detect (but not block) PII in both user inputs and AI outputs
3. Link user prompts with AI responses in the SonnyLabs dashboard for monitoring

I've already installed the SonnyLabs Node.js SDK using npm and have my API token and analysis ID from the SonnyLabs dashboard.

Please provide a step-by-step implementation guide including:
- How to initialize the SonnyLabs client
- How to analyze user inputs before passing them to my LLM
- How to block requests if prompt injections are detected
- How to detect and log PII in user inputs (without blocking)
- How to analyze AI outputs before sending them to users
- How to block AI responses if they contain prompt injections
- How to detect and log PII in AI outputs (without blocking)
- How to properly use the 'tag' parameter to link prompts with their responses in the SonnyLabs dashboard
```

## Example

### Quick Start
```javascript
const { SonnyLabsClient } = require('sonnylabs-node');
require('dotenv').config();

// Initialize the client
const client = new SonnyLabsClient({
  apiToken: process.env.SONNYLABS_API_TOKEN,
  baseUrl: "https://sonnylabs-service.onrender.com",
  analysisId: process.env.SONNYLABS_ANALYSIS_ID
});

// Analyze text for security issues (input)
async function example() {
  try {
    const result = await client.analyzeText("Hello, my name is John Doe", "input");
    console.log(result);

    // If you want to link an input with its corresponding output, reuse the tag:
    const tag = result.tag;
    const response = "I'm an AI assistant, nice to meet you John!";
    const outputResult = await client.analyzeText(response, "output", tag);
    console.log(outputResult);
  } catch (error) {
    console.error("Error:", error);
  }
}

example();
```

### Integrating with a Chatbot
Here's how to integrate the SDK into a Node.js chatbot to detect prompt injections and PII:

### Set up the client
```javascript
const { SonnyLabsClient } = require('sonnylabs-node');
require('dotenv').config();

// Initialize the SonnyLabs client
const sonnylabsClient = new SonnyLabsClient({
  apiToken: process.env.SONNYLABS_API_TOKEN,  // Your API token from .env
  baseUrl: "https://sonnylabs-service.onrender.com",  // SonnyLabs API endpoint
  analysisId: process.env.SONNYLABS_ANALYSIS_ID  // Your analysis ID from .env
});
```

### Implement message handling with security checks

```javascript
async function handleUserMessage(userMessage) {
  try {
    // Step 1: Analyze the incoming message for security issues
    const analysisResult = await sonnylabsClient.analyzeText(userMessage, "input");
    
    // Step 2: Check for prompt injections
    if (sonnylabsClient.isPromptInjection(analysisResult)) {
      return "I detected potential prompt injection in your message. Please try again.";
    }
    
    // Step 3: Check for PII
    const piiItems = sonnylabsClient.getPII(analysisResult);
    if (piiItems.length > 0) {
      const piiTypes = piiItems.map(item => item.label);
      return `I detected personal information (${piiTypes.join(', ')}) in your message. Please don't share sensitive data.`;
    }
    
    // Step 4: If no security issues are found, process the message normally
    const botResponse = generateBotResponse(userMessage);
    
    // Step 5: Scan the outgoing message using the same tag to link it with the input
    const tag = analysisResult.tag;  // Reuse the tag from the input analysis
    const outputAnalysis = await sonnylabsClient.analyzeText(botResponse, "output", tag);
    // Apply additional checks to botResponse if needed
    
    return botResponse;
  } catch (error) {
    console.error("Error handling message:", error);
    return "Sorry, there was an error processing your message.";
  }
}

function generateBotResponse(userMessage) {
  // Your existing chatbot logic here
  // This could be a call to an LLM API or other response generation logic
  return "This is the chatbot's response";
}
```

### Integrate with a web framework (e.g., Express)

```javascript
const express = require('express');
const app = express();

app.use(express.json());

app.post("/chat", async (req, res) => {
  try {
    const userMessage = req.body.message || "";
    const response = await handleUserMessage(userMessage);
    res.json({ response });
  } catch (error) {
    console.error("Error in chat endpoint:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## API Reference

### SonnyLabsClient

```javascript
new SonnyLabsClient({
  apiToken,    // Your SonnyLabs API token
  baseUrl,     // Base URL for the SonnyLabs API
  analysisId,  // The analysis ID associated with this chatbot
  timeout      // Request timeout in milliseconds (default: 5000)
})
```

### Methods

#### analyzeText

```javascript
async analyzeText(text, scanType = 'input', tag = null)
```

Parameters:

- `text` (string): Text to analyze
- `scanType` (string, optional): "input" or "output" (default: "input")
- `tag` (string, optional): Custom tag for linking prompts with their responses (default: null)

Returns:

- Promise that resolves to an object with analysis results, including the tag used

### Linking Prompts and Responses

To properly link prompts with their corresponding responses in the SonnyLabs dashboard, use the same tag for both analyses, but ensure to update the scan_type to be either input (by the user) or output (by the LLM):

```javascript
// Analyze the user input (prompt)
const inputResult = await sonnylabsClient.analyzeText(userMessage, "input");

// Extract the tag from the input analysis
const tag = inputResult.tag;

// Generate your response
const botResponse = generateBotResponse(userMessage);

// Analyze the output using the same tag
const outputResult = await sonnylabsClient.analyzeText(botResponse, "output", tag);
```

This ensures that prompts and their responses are linked in the SonnyLabs dashboard and analytics.

#### getPromptInjections

```javascript
getPromptInjections(analysisResult, threshold = 0.65)
```

Parameters:

- `analysisResult` (object): Analysis results from analyzeText
- `threshold` (number, optional): The confidence threshold above which to consider a prompt injection detected (default: 0.65)

Returns:

- Object with prompt injection score and detection status, or null if no issue

#### isPromptInjection

```javascript
isPromptInjection(analysisResult)
```

Parameters:

- `analysisResult` (object): Analysis results from analyzeText

Returns:

- Boolean: True if prompt injection was detected, False otherwise

#### getPII

```javascript
getPII(analysisResult)
```

Parameters:

- `analysisResult` (object): Analysis results from analyzeText

Returns:

- Array of PII items found or empty array if none

## License

MIT
