# SonnyLabs Node.js Client

A simple Node.js client for the SonnyLabs Security API.

## Installation

```bash
npm install sonnylabs-node
```

## Usage

### Initializing the client

```javascript
const { SonnyLabsClient } = require('sonnylabs-node');

const client = new SonnyLabsClient({
  apiToken: 'your-api-token',
  baseUrl: 'https://api.sonnylabs.ai',
  analysisId: 'your-analysis-id'
});
```

### Analyzing text for security concerns

```javascript
// Analyze user input
async function analyzeUserInput(userInput) {
  const result = await client.analyzeText(userInput, 'input');
  
  // Check for prompt injections
  const injectionResult = client.getPromptInjections(result);
  if (injectionResult && injectionResult.score > 0.7) {
    console.log(`Potential prompt injection detected with score ${injectionResult.score}`);
    return {
      safe: false,
      message: "Potential security concern detected in your input."
    };
  }
  
  // Check for PII (Personally Identifiable Information)
  const piiResults = client.getPII(result);
  if (piiResults.length > 0) {
    console.log(`PII detected: ${piiResults.map(p => p.label).join(', ')}`);
    return {
      safe: false,
      message: "Please avoid sharing personal information."
    };
  }
  
  return { safe: true };
}

// Analyze AI output
async function analyzeAIResponse(aiResponse) {
  const result = await client.analyzeText(aiResponse, 'output');
  
  // Process result...
  
  return { safe: true };
}
```

## API Reference

### `SonnyLabsClient`

#### Constructor

```javascript
new SonnyLabsClient({
  apiToken,    // Your SonnyLabs API token
  baseUrl,     // Base URL for the SonnyLabs API
  analysisId,  // The analysis ID associated with this chatbot
  timeout      // Request timeout in milliseconds (default: 5000)
})
```

#### Methods

##### `analyzeText(text, scanType = 'input')`

Analyzes text for security concerns.

- `text`: Text to analyze (from chatbot)
- `scanType`: Either "input" or "output"

Returns a Promise that resolves to an object with analysis results:

```javascript
{
  success: true,
  tag: "unique_tag_for_this_analysis",
  analysis: [
    // Array of analysis results from the API
  ]
}
```

##### `getPromptInjections(analysisResult)`

Extracts prompt injection issues from analysis results.

- `analysisResult`: The result object from analyzeText

Returns an object with prompt injection score or null if no issue:

```javascript
{
  score: 0.85,
  tag: "unique_tag_for_this_analysis"
}
```

##### `getPII(analysisResult)`

Extracts PII issues from analysis results.

- `analysisResult`: The result object from analyzeText

Returns an array of PII items found or empty array if none:

```javascript
[
  {
    label: "EMAIL",
    text: "example@example.com",
    tag: "unique_tag_for_this_analysis"
  },
  {
    label: "PHONE_NUMBER",
    text: "123-456-7890",
    tag: "unique_tag_for_this_analysis"
  }
]
```

## License

MIT
