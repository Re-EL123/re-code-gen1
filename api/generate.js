/**
 * HuggingFace DeepSeek-Coder-V2-Lite API Proxy
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
    const { prompt, model = 'deepseek-ai/DeepSeek-Coder-V2-Lite-Instruct', maxTokens = 4096 } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'prompt is required' });
    }

    const hfToken = process.env.HF_TOKEN;
    if (!hfToken) {
      return res.status(500).json({ error: 'HF_TOKEN not configured' });
    }

    const response = await fetch(
      `https://api-inference.huggingface.co/models/${model}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${hfToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'You are an elite code generation expert. Generate production-ready, fully functional code with no placeholders. Include proper error handling and best practices. Return ONLY code.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: maxTokens,
          temperature: 0.7,
          top_p: 0.95
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      if (response.status === 429) {
        return res.status(429).json({ error: 'Rate limit exceeded' });
      }
      if (response.status === 401) {
        return res.status(401).json({ error: 'Invalid HF_TOKEN' });
      }
      return res.status(response.status).json(error);
    }

    const data = await response.json();
    return res.status(200).json({
      code: data.choices[0].message.content,
      model,
      usage: data.usage
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
