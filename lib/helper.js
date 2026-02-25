// sonnylabs_js/lib/helper.js
// Helper functions for SonnyLabsClient, similar to sonnylabs_py/sonnylabs/helper.py

/**
 * ScanVerdict - Safety verdict for scanned text
 */
class ScanVerdict {
  constructor({ isSafe, score, scanType, tag, meta = {}, rawAnalysis = [] }) {
    this.isSafe = isSafe;
    this.score = score;
    this.scanType = scanType;
    this.tag = tag;
    this.meta = meta;
    this.rawAnalysis = rawAnalysis;
  }
  toString() {
    return `${this.isSafe ? "SAFE" : "INJECTION DETECTED"} (score: ${this.score.toFixed(2)})`;
  }
}

/**
 * RagScanResult - Result from scanning RAG chunks
 */
class RagScanResult {
  constructor({
    query,
    totalChunks,
    safeChunks,
    flaggedChunks,
    isSafe,
    verdictPerChunk = [],
  }) {
    this.query = query;
    this.totalChunks = totalChunks;
    this.safeChunks = safeChunks;
    this.flaggedChunks = flaggedChunks;
    this.isSafe = isSafe;
    this.verdictPerChunk = verdictPerChunk;
  }
}

/**
 * ToolCallScanResult - Result from scanning tool call before execution
 */
class ToolCallScanResult {
  constructor({
    isSafe,
    toolName,
    userIntentSafe,
    toolArgsSafe,
    userContextScore,
    toolContextScore,
    userMessageVerdict,
    toolContextVerdict = null,
  }) {
    this.isSafe = isSafe;
    this.toolName = toolName;
    this.userIntentSafe = userIntentSafe;
    this.toolArgsSafe = toolArgsSafe;
    this.userContextScore = userContextScore;
    this.toolContextScore = toolContextScore;
    this.userMessageVerdict = userMessageVerdict;
    this.toolContextVerdict = toolContextVerdict;
  }
}

/**
 * Global threshold for blocking unsafe content
 */
const _BLOCK_THRESHOLD = 0.65;

/**
 * Scan text for prompt injection. Returns ScanVerdict with isSafe and score.
 */
async function scanText(
  text,
  client,
  scanType = "input",
  policy = {},
  meta = {},
) {
  if (!text) {
    return new ScanVerdict({
      isSafe: true,
      score: 0.0,
      scanType,
      tag: "empty_input",
      meta,
    });
  }
  const threshold =
    policy.threshold !== undefined ? policy.threshold : _BLOCK_THRESHOLD;
  try {
    const result = await client.analyzeText(text, scanType);
    if (!result.success) {
      return new ScanVerdict({
        isSafe: false,
        score: 1.0,
        scanType,
        tag: result.tag || "unknown",
        meta,
      });
    }
    const scoreItem = (result.analysis || []).find(
      (item) => item.type === "score" && item.name === "prompt_injection",
    );
    const score = scoreItem ? scoreItem.result : 0.0;
    return new ScanVerdict({
      isSafe: score < threshold,
      score,
      scanType,
      tag: result.tag || "",
      meta,
      rawAnalysis: result.analysis || [],
    });
  } catch (e) {
    return new ScanVerdict({
      isSafe: false,
      score: 1.0,
      scanType,
      tag: "error",
      meta,
    });
  }
}

/**
 * Scan a list of chat messages for prompt injection.
 */
async function scanMessages(
  messages,
  client,
  scanType = "input",
  policy = {},
  meta = {},
) {
  if (!messages || messages.length === 0) {
    return new ScanVerdict({
      isSafe: true,
      score: 0.0,
      scanType,
      tag: "empty_messages",
      meta,
    });
  }
  const threshold =
    policy.threshold !== undefined ? policy.threshold : _BLOCK_THRESHOLD;
  const textedContent = messages
    .map((msg) => `[${msg.role || "unknown"}]: ${msg.content || ""}`)
    .join("\n");
  try {
    const result = await client.analyzeText(textedContent, scanType);
    if (!result.success) {
      return new ScanVerdict({
        isSafe: false,
        score: 1.0,
        scanType,
        tag: result.tag || "unknown",
        meta,
      });
    }
    const scoreItem = (result.analysis || []).find(
      (item) => item.type === "score" && item.name === "prompt_injection",
    );
    const score = scoreItem ? scoreItem.result : 0.0;
    return new ScanVerdict({
      isSafe: score < threshold,
      score,
      scanType,
      tag: result.tag || "",
      meta,
      rawAnalysis: result.analysis || [],
    });
  } catch (e) {
    return new ScanVerdict({
      isSafe: false,
      score: 1.0,
      scanType,
      tag: "error",
      meta,
    });
  }
}

/**
 * Scan RAG chunks for prompt injection.
 */
async function scanRagChunks(query, chunks, client, policy = {}, meta = {}) {
  if (!chunks || chunks.length === 0) {
    return new RagScanResult({
      query,
      totalChunks: 0,
      safeChunks: [],
      flaggedChunks: [],
      isSafe: true,
    });
  }
  const threshold =
    policy.threshold !== undefined ? policy.threshold : _BLOCK_THRESHOLD;
  const limit =
    policy.max_chunks_to_scan !== undefined
      ? policy.max_chunks_to_scan
      : chunks.length;
  const safeChunks = [];
  const flaggedChunks = [];
  const verdicts = [];
  for (let i = 0; i < Math.min(limit, chunks.length); i++) {
    const chunk = chunks[i];
    let chunkText;
    if (typeof chunk === "string") {
      chunkText = chunk;
    } else {
      chunkText = chunk.text || chunk.content || String(chunk);
    }
    const verdict = await scanText(
      chunkText,
      client,
      "input",
      { threshold },
      { ...meta, chunk_index: i },
    );
    verdicts.push(verdict);
    const chunkData = {
      text: chunkText,
      index: i,
      score: verdict.score,
      original: chunk,
    };
    if (verdict.isSafe) {
      safeChunks.push(chunkData);
    } else {
      flaggedChunks.push({ ...chunkData, reason: "flagged" });
    }
  }
  const queryVerdict = await scanText(query, client, "input", { threshold });
  const allVerdicts = [queryVerdict, ...verdicts];
  return new RagScanResult({
    query,
    totalChunks: chunks.length,
    safeChunks,
    flaggedChunks,
    isSafe: queryVerdict.isSafe && flaggedChunks.length === 0,
    verdictPerChunk: allVerdicts,
  });
}

/**
 * Scan a tool call before execution to prevent injection-based attacks.
 */
async function scanToolCall(
  userMessage,
  toolName,
  toolArgs,
  client,
  toolSchema = null,
  policy = {},
  meta = {},
) {
  const threshold =
    policy.threshold !== undefined ? policy.threshold : _BLOCK_THRESHOLD;
  const toolContextParts = [`Tool: ${toolName}`];
  if (toolSchema) {
    toolContextParts.push(
      `${typeof toolSchema === "string" ? "Description" : "Schema"}: ${toolSchema}`,
    );
  }
  toolContextParts.push(`Arguments: ${JSON.stringify(toolArgs)}`);
  const toolContext = toolContextParts.join("\n");
  try {
    const userVerdict = await scanText(
      userMessage,
      client,
      "input",
      { threshold },
      { ...meta, component: "tool_call_user_intent" },
    );
    const toolContextVerdict = await scanText(
      toolContext,
      client,
      "input",
      { threshold },
      { ...meta, tool: toolName, component: "tool_context" },
    );
    const isSafe = userVerdict.isSafe && toolContextVerdict.isSafe;
    return new ToolCallScanResult({
      isSafe,
      toolName,
      userIntentSafe: userVerdict.isSafe,
      toolArgsSafe: toolContextVerdict.isSafe,
      userContextScore: userVerdict.score,
      toolContextScore: toolContextVerdict.score,
      userMessageVerdict: userVerdict,
      toolContextVerdict,
    });
  } catch (e) {
    return new ToolCallScanResult({
      isSafe: false,
      toolName,
      userIntentSafe: false,
      toolArgsSafe: false,
      userContextScore: 1.0,
      toolContextScore: 1.0,
      userMessageVerdict: new ScanVerdict({
        isSafe: false,
        score: 1.0,
        scanType: "input",
        tag: "error",
      }),
      toolContextVerdict: null,
    });
  }
}

module.exports = {
  ScanVerdict,
  RagScanResult,
  ToolCallScanResult,
  scanText,
  scanMessages,
  scanRagChunks,
  scanToolCall,
};
