import { OpenAI } from "openai";

/**
 * HuggingFace DeepSeek API via OpenAI-compatible endpoint
 * Vercel Serverless Function
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
    const { prompt, maxTokens = 4096 } = req.body;
    
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

    // Initialize OpenAI client with HuggingFace endpoint
    const client = new OpenAI({
      baseURL: "https://router.huggingface.co/v1",
      apiKey: hfToken,
    });

    console.log('Making request to HuggingFace API...');

    // Call the API
    const chatCompletion = await client.chat.completions.create({
      model: "deepseek-ai/DeepSeek-V3:free",
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
    });

    console.log('HuggingFace Response received');

    const generatedCode = chatCompletion.choices[0].message.content;

    return res.status(200).json({
      code: generatedCode,
      model: chatCompletion.model,
      usage: chatCompletion.usage
    });

  } catch (error) {
    console.error('Server Error:', error);
    
    // Handle specific OpenAI/HuggingFace errors
    if (error.status === 401) {
      return res.status(401).json({ 
        error: 'Invalid HF_TOKEN',
        help: 'Check your token at https://huggingface.co/settings/tokens'
      });
    }
    
    if (error.status === 429) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded',
        help: 'Please wait a moment and try again'
      });
    }

    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      details: error.response?.data || undefined
    });
  }
}
