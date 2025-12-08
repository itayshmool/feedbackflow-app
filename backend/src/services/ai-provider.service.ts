/**
 * AI Provider Service
 * Abstracts AI generation between Claude (Anthropic) and Gemini (Google)
 * Toggle via AI_PROVIDER env variable: 'claude' | 'gemini'
 */

export type AIProvider = 'claude' | 'gemini';

export interface AIProviderConfig {
  provider: AIProvider;
  apiKey: string;
}

interface AIGenerationOptions {
  maxTokens?: number;
  temperature?: number;
}

interface AIResponse {
  text: string;
  provider: AIProvider;
}

/**
 * Get the configured AI provider and validate API key
 */
export function getAIConfig(): AIProviderConfig {
  const provider = (process.env.AI_PROVIDER?.toLowerCase() || 'claude') as AIProvider;
  
  if (provider === 'gemini') {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error('AI service not configured. Please add GOOGLE_AI_API_KEY to environment variables.');
    }
    return { provider: 'gemini', apiKey };
  }
  
  // Default to Claude
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('AI service not configured. Please add ANTHROPIC_API_KEY to environment variables.');
  }
  return { provider: 'claude', apiKey };
}

/**
 * Call Claude (Anthropic) API
 */
async function callClaude(
  prompt: string,
  apiKey: string,
  options: AIGenerationOptions = {}
): Promise<AIResponse> {
  const { maxTokens = 1024 } = options;
  
  console.log('🤖 Calling Claude API...');
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Claude API error:', errorText);
    throw new Error('Claude API error. Please try again.');
  }
  
  const data = await response.json();
  const text = data.content?.[0]?.text;
  
  if (!text) {
    throw new Error('No response from Claude API');
  }
  
  console.log('✅ Claude response received');
  return { text, provider: 'claude' };
}

/**
 * Call Gemini (Google AI) API
 */
async function callGemini(
  prompt: string,
  apiKey: string,
  options: AIGenerationOptions = {}
): Promise<AIResponse> {
  const { maxTokens = 1024 } = options;
  
  console.log('🤖 Calling Gemini API...');
  
  // Gemini API endpoint - using gemini-2.0-flash-exp for speed and cost efficiency
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: 0.7
      }
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API error:', errorText);
    throw new Error('Gemini API error. Please try again.');
  }
  
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!text) {
    throw new Error('No response from Gemini API');
  }
  
  console.log('✅ Gemini response received');
  return { text, provider: 'gemini' };
}

/**
 * Generate AI content using the configured provider
 */
export async function generateAIContent(
  prompt: string,
  options: AIGenerationOptions = {}
): Promise<AIResponse> {
  const config = getAIConfig();
  
  console.log(`🧠 Using AI provider: ${config.provider.toUpperCase()}`);
  
  if (config.provider === 'gemini') {
    return callGemini(prompt, config.apiKey, options);
  }
  
  return callClaude(prompt, config.apiKey, options);
}

/**
 * Parse JSON from AI response (handles markdown code blocks)
 */
export function parseAIJsonResponse(text: string): any {
  // AI models sometimes wrap JSON in markdown code blocks
  const cleanedResponse = text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();
  
  return JSON.parse(cleanedResponse);
}

