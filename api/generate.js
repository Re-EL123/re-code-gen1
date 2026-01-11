import { OpenAI } from "openai";

/**
 * HuggingFace DeepSeek API Proxy
 * Vercel Serverless Function - OpenAI-compatible Version
 */
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      prompt, 
      model = 'deepseek-ai/DeepSeek-V3:free', 
      maxTokens = 4096 
    } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'prompt is required' });
    }

    // Check for HF_TOKEN
    const hfToken = process.env.HF_TOKEN;
    
    if (!hfToken) {
      console.error('HF_TOKEN environment variable is not set');
      return res.status(500).json({ 
        error: 'HF_TOKEN not configured',
        help: 'Add HF_TOKEN to Vercel Environment Variables and redeploy'
      });
    }

    console.log('Initializing OpenAI client for HuggingFace...');

    // Initialize OpenAI client with HuggingFace router endpoint
    const client = new OpenAI({
      baseURL: "https://router.huggingface.co/v1",
      apiKey: hfToken,
    });

    console.log('Making request to HuggingFace API...');
    console.log('Model:', model);
    console.log('Max tokens:', maxTokens);

    // Call the API using OpenAI-compatible interface
    const chatCompletion = await client.chat.completions.create({
      model: model,
      messages: [
        {
          role: "system",
          content: "You are an elite code generation expert. Generate production-ready, fully functional code with these requirements:
- Write complete, working code with NO placeholders or TODOs
- Include proper error handling and edge cases
- Use best practices and clean code principles
- Add helpful comments for complex logic
- Ensure code is optimized and efficient
- Make it maintainable and scalable
- Return ONLY code - no markdown, no explanations, no text outside code
- Complete all functions, classes, and statements fully"
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
      top_p: 0.95,
    });

    console.log('HuggingFace Response received successfully');
    console.log('Completion ID:', chatCompletion.id);

    const generatedCode = chatCompletion.choices[0].message.content;

    return res.status(200).json({
      code: generatedCode,
      model: chatCompletion.model,
      usage: {
        prompt_tokens: chatCompletion.usage?.prompt_tokens || 0,
        completion_tokens: chatCompletion.usage?.completion_tokens || 0,
        total_tokens: chatCompletion.usage?.total_tokens || 0
      },
      id: chatCompletion.id,
      created: chatCompletion.created
    });

  } catch (error) {
    console.error('Server Error:', error);
    console.error('Error details:', error.message);
    
    // Handle specific OpenAI/HuggingFace API errors
    if (error.status === 401 || error.status === 403) {
      return res.status(401).json({ 
        error: 'Invalid HF_TOKEN',
        help: 'Check your token at https://huggingface.co/settings/tokens',
        details: error.message
      });
    }
    
    if (error.status === 429) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded',
        help: 'Please wait a moment and try again',
        details: error.message
      });
    }

    if (error.status === 503) {
      return res.status(503).json({ 
        error: 'Model is loading or unavailable',
        help: 'Try again in a few moments or switch to a different model',
        details: error.message
      });
    }

    if (error.status === 400) {
      return res.status(400).json({ 
        error: 'Bad request',
        help: 'Check your prompt or model parameters',
        details: error.message
      });
    }

    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
