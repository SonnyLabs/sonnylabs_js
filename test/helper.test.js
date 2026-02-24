// Tests for helper.js
const { ScanVerdict, RagScanResult, ToolCallScanResult, scanText, scanMessages, scanRagChunks, scanToolCall } = require('../lib/helper');
const { describe, it } = require('node:test');
const assert = require('node:assert');

class MockClient {
  async analyzeText(text, scanType = 'input', tag = null) {
    // Simulate prompt injection detection
    if (text.includes('inject')) {
      return {
        success: true,
        tag: tag || 'mock_tag',
        analysis: [{ type: 'score', name: 'prompt_injection', result: 0.9 }]
      };
    }
    // Simulate safe text
    return {
      success: true,
      tag: tag || 'mock_tag',
      analysis: [{ type: 'score', name: 'prompt_injection', result: 0.1 }]
    };
  }
}

const client = new MockClient();

describe('ScanVerdict', () => {
  it('should return SAFE for isSafe true', () => {
    console.log('Test: ScanVerdict should return SAFE for isSafe true');
    const verdict = new ScanVerdict({ isSafe: true, score: 0.1, scanType: 'input', tag: 't1' });
    assert.ok(verdict.toString().includes('SAFE'));
  });
  it('should return INJECTION DETECTED for isSafe false', () => {
    console.log('Test: ScanVerdict should return INJECTION DETECTED for isSafe false');
    const verdict = new ScanVerdict({ isSafe: false, score: 0.9, scanType: 'input', tag: 't2' });
    assert.ok(verdict.toString().includes('INJECTION DETECTED'));
  });
  it('should store meta and rawAnalysis', () => {
    console.log('Test: ScanVerdict should store meta and rawAnalysis');
    const verdict = new ScanVerdict({ isSafe: true, score: 0.1, scanType: 'input', tag: 't3', meta: { foo: 'bar' }, rawAnalysis: [{ a: 1 }] });
    assert.strictEqual(verdict.meta.foo, 'bar');
    assert.strictEqual(verdict.rawAnalysis[0].a, 1);
  });
});

describe('scanText', () => {
  it('should detect safe text', async () => {
    console.log('Test: scanText should detect safe text');
    const verdict = await scanText('hello world', client);
    assert.strictEqual(verdict.isSafe, true);
    assert.ok(verdict.score < 0.65);
  });
  it('should detect injection text', async () => {
    console.log('Test: scanText should detect injection text');
    const verdict = await scanText('please inject', client);
    assert.strictEqual(verdict.isSafe, false);
    assert.ok(verdict.score > 0.65);
  });
  it('should handle empty text', async () => {
    console.log('Test: scanText should handle empty text');
    const verdict = await scanText('', client);
    assert.strictEqual(verdict.isSafe, true);
    assert.strictEqual(verdict.tag, 'empty_input');
  });
  it('should handle error in client', async () => {
    console.log('Test: scanText should handle error in client');
    const badClient = { analyzeText: () => { throw new Error('fail'); } };
    const verdict = await scanText('test', badClient);
    assert.strictEqual(verdict.isSafe, false);
    assert.strictEqual(verdict.tag, 'error');
  });
  it('should respect threshold', async () => {
    console.log('Test: scanText should respect threshold');
    const verdict = await scanText('please inject', client, 'input', { threshold: 0.95 });
    assert.strictEqual(verdict.isSafe, true);
  });
});

describe('scanMessages', () => {
  it('should detect safe messages', async () => {
    console.log('Test: scanMessages should detect safe messages');
    const verdict = await scanMessages([{ role: 'user', content: 'hello' }], client);
    assert.strictEqual(verdict.isSafe, true);
  });
  it('should detect injection in messages', async () => {
    console.log('Test: scanMessages should detect injection in messages');
    const verdict = await scanMessages([{ role: 'user', content: 'inject' }], client);
    assert.strictEqual(verdict.isSafe, false);
  });
  it('should handle empty messages', async () => {
    console.log('Test: scanMessages should handle empty messages');
    const verdict = await scanMessages([], client);
    assert.strictEqual(verdict.isSafe, true);
    assert.strictEqual(verdict.tag, 'empty_messages');
  });
  it('should handle error in client', async () => {
    console.log('Test: scanMessages should handle error in client');
    const badClient = { analyzeText: () => { throw new Error('fail'); } };
    const verdict = await scanMessages([{ role: 'user', content: 'test' }], badClient);
    assert.strictEqual(verdict.isSafe, false);
    assert.strictEqual(verdict.tag, 'error');
  });
  it('should respect threshold', async () => {
    console.log('Test: scanMessages should respect threshold');
    const verdict = await scanMessages([{ role: 'user', content: 'inject' }], client, 'input', { threshold: 0.95 });
    assert.strictEqual(verdict.isSafe, true);
  });
});

describe('scanRagChunks', () => {
  it('should detect safe chunks', async () => {
    console.log('Test: scanRagChunks should detect safe chunks');
    const result = await scanRagChunks('query', ['hello', 'world'], client);
    assert.strictEqual(result.isSafe, true);
    assert.strictEqual(result.safeChunks.length, 2);
    assert.strictEqual(result.flaggedChunks.length, 0);
  });
  it('should detect flagged chunks', async () => {
    console.log('Test: scanRagChunks should detect flagged chunks');
    const result = await scanRagChunks('query', ['inject', 'safe'], client);
    assert.strictEqual(result.isSafe, false);
    assert.strictEqual(result.flaggedChunks.length, 1);
  });
  it('should handle empty chunks', async () => {
    console.log('Test: scanRagChunks should handle empty chunks');
    const result = await scanRagChunks('query', [], client);
    assert.strictEqual(result.isSafe, true);
    assert.strictEqual(result.totalChunks, 0);
  });
  it('should respect max_chunks_to_scan', async () => {
    console.log('Test: scanRagChunks should respect max_chunks_to_scan');
    const result = await scanRagChunks('query', ['inject', 'inject', 'safe'], client, { max_chunks_to_scan: 2 });
    assert.strictEqual(result.flaggedChunks.length, 2);
    assert.strictEqual(result.safeChunks.length, 0);
  });
  it('should handle chunk objects', async () => {
    console.log('Test: scanRagChunks should handle chunk objects');
    const result = await scanRagChunks('query', [{ text: 'inject' }, { content: 'safe' }], client);
    assert.strictEqual(result.flaggedChunks.length, 1);
    assert.strictEqual(result.safeChunks.length, 1);
  });
});

describe('scanToolCall', () => {
  it('should detect safe tool call', async () => {
    console.log('Test: scanToolCall should detect safe tool call');
    const result = await scanToolCall('hello', 'tool', { arg: 'safe' }, client);
    assert.strictEqual(result.isSafe, true);
    assert.strictEqual(result.recommendation, 'proceed');
  });
  it('should detect unsafe tool call', async () => {
    console.log('Test: scanToolCall should detect unsafe tool call');
    const result = await scanToolCall('inject', 'tool', { arg: 'inject' }, client);
    assert.strictEqual(result.isSafe, false);
    assert.ok(['block', 'review'].includes(result.recommendation));
  });
  it('should handle error in client', async () => {
    console.log('Test: scanToolCall should handle error in client');
    const badClient = { analyzeText: () => { throw new Error('fail'); } };
    const result = await scanToolCall('test', 'tool', { arg: 'fail' }, badClient);
    assert.strictEqual(result.isSafe, false);
    assert.strictEqual(result.recommendation, 'block');
  });
  it('should respect threshold', async () => {
    console.log('Test: scanToolCall should respect threshold');
    const result = await scanToolCall('inject', 'tool', { arg: 'inject' }, client, null, { threshold: 0.95 });
    assert.strictEqual(result.isSafe, true);
    assert.strictEqual(result.recommendation, 'proceed');
  });
  it('should handle toolSchema', async () => {
    console.log('Test: scanToolCall should handle toolSchema');
    const result = await scanToolCall('hello', 'tool', { arg: 'safe' }, client, 'desc');
    assert.strictEqual(result.isSafe, true);
    assert.notStrictEqual(result.toolContextVerdict, undefined);
  });
});
