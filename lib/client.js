'use strict';

const axios = require('axios');

class SonnyLabsClient {
  /**
   * Initialize a SonnyLabs API client for a specific chatbot application
   * 
   * @param {Object} config Configuration object
   * @param {string} config.apiToken Your SonnyLabs API token
   * @param {string} config.baseUrl Base URL for the SonnyLabs API
   * @param {string} config.analysisId The analysis ID associated with this chatbot (from website UI)
   * @param {number} [config.timeout=5000] Request timeout in milliseconds (default: 5000)
   */
  constructor({ apiToken, baseUrl, analysisId, timeout = 5000 }) {
    this.apiToken = apiToken;
    this.baseUrl = baseUrl;
    this.analysisId = analysisId;
    this.timeout = timeout;
    
    // Configure axios instance
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'text/plain'
      }
    });
  }

  /**
   * Generate a unique tag with analysis_id, datetime, and random integers
   * @private
   * @returns {string} Unique tag
   */
  _generateTag() {
    const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '');
    const randomSuffix = Array.from({ length: 4 }, () => Math.floor(Math.random() * 10)).join('');
    return `${this.analysisId}_${timestamp}_${randomSuffix}`;
  }

  /**
   * Analyze text for security concerns
   * 
   * @param {string} text Text to analyze (from chatbot)
   * @param {string} [scanType='input'] Either "input" or "output"
   * @param {string} [tag=null] Optional tag to use for this analysis. If provided, this exact tag will be used instead of generating a new one. Useful for linking prompts with their responses.
   * @returns {Promise<Object>} Promise resolving to dictionary with analysis results
   */
  async analyzeText(text, scanType = 'input', tag = null) {
    // Use provided tag or generate a new one if none provided
    if (tag === null) {
      tag = this._generateTag();
    }
    
    console.log(`Analyzing ${scanType} content with tag '${tag}'`);
    
    try {
      const url = `/v1/analysis/${this.analysisId}`;
      const params = {
        tag,
        scan_type: scanType
      };
      
      console.log(`Making request to ${this.baseUrl}${url} with params:`, params);
      
      const response = await this.client.post(url, text, { params });
      
      console.log(`Response status: ${response.status}`);
      console.log(`Response data:`, response.data);
      
      // Handle case where success response is being treated as an error
      if (response.status === 200) {
        if (!response.data.analysis && response.data.message) {
          // Check if this is actually a success response (e.g. "confirmation_sent_at" or "200 OK")
          if (response.data.message.includes("200 OK") || response.data.message.includes("confirmation_sent_at")) {
            console.log("Detected successful response with unexpected format");
            return {
              success: true,
              tag,
              analysis: [] // Empty analysis since we don't have actual data
            };
          }
        }
      }
      
      return {
        success: true,
        tag,
        analysis: response.data.analysis || []
      };
    } catch (error) {
      console.error(`Error analyzing text: ${error.message}`);
      
      // Add detailed error logging
      if (error.response) {
        console.error(`Response status: ${error.response.status}`);
        console.error(`Response data:`, error.response.data);
        
        // Check if this is actually a success response being treated as an error
        if (error.response.status === 200 || 
            (error.response.data && 
             (error.response.data.message?.includes("200 OK") || 
              error.response.data.message?.includes("confirmation_sent_at")))) {
          console.log("Detected successful response being treated as an error");
          return {
            success: true,
            tag,
            analysis: [] // Empty analysis since we don't have actual data
          };
        }
        
        return {
          success: false,
          tag,
          error: `API error: ${error.response.status}`,
          analysis: []
        };
      }
      
      // Network or other error
      return {
        success: false,
        tag,
        error: error.message,
        analysis: []
      };
    }
  }

  /**
   * Extract prompt injection issues from analysis results
   * 
   * @param {Object} analysisResult The result object from analyzeText
   * @returns {Object|null} Dictionary with prompt injection score and detection status or null if no issue
   */
  getPromptInjections(analysisResult) {
    if (!analysisResult.success) {
      return null;
    }
    
    const item = analysisResult.analysis.find(
      item => item.type === 'score' && item.name === 'prompt_injection'
    );
    
    if (item) {
      // Always use 0.65 as the default threshold
      const threshold = 0.65;
      return {
        score: item.result,
        tag: analysisResult.tag,
        detected: item.result > threshold,
        threshold: threshold
      };
    }
    
    return null;
  }

  /**
   * Directly check if prompt injection was detected in analysis results
   * 
   * @param {Object} analysisResult The result object from analyzeText
   * @returns {boolean} True if prompt injection was detected, False otherwise
   */
  isPromptInjection(analysisResult) {
    const injectionInfo = this.getPromptInjections(analysisResult);
    if (injectionInfo === null) {
      return false;
    }
    return injectionInfo.detected;
  }

  /**
   * Extract PII issues from analysis results
   * 
   * @param {Object} analysisResult The result object from analyzeText
   * @returns {Array} List of PII items found or empty array if none
   */
  getPII(analysisResult) {
    if (!analysisResult.success) {
      return [];
    }
    
    const item = analysisResult.analysis.find(item => item.type === 'PII');
    
    if (item) {
      return item.result.map(piiItem => ({
        label: piiItem.label,
        text: piiItem.text,
        tag: analysisResult.tag
      }));
    }
    
    return [];
  }
}

module.exports = SonnyLabsClient;
