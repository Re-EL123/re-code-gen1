/**
 * HuggingFace DeepSeek-Coder-V2-Lite API Proxy
 * Vercel Serverless Function - Enhanced Version
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

    // Check for HF_TOKEN
    const hfToken = process.env.HF_TOKEN;
    
    if (!hfToken) {
      console.error('HF_TOKEN environment variable is not set');
      return res.status(500).json({ 
        error: 'HF_TOKEN not configured',
        help: 'Add HF_TOKEN to Vercel Environment Variables and redeploy'
      });
    }

    console.log('Making request to HuggingFace API...');

    // Call HuggingFace Inference API
    const response = await fetch(
      `https://router.huggingface.co/hf-inference/models/${model}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${hfToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: maxTokens,
            temperature: 0.7,
            top_p: 0.95,
            return_full_text: false
          }
        })
      }
    );

    console.log('HuggingFace Response Status:', response.status);

    // Handle errors
    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText };
      }

      console.error('HuggingFace API Error:', errorData);
      
      if (response.status === 429) {
        return res.status(429).json({ 
          error: 'Rate limit exceeded. Please wait a moment and try again.' 
        });
      }
      
      if (response.status === 401 || response.status === 403) {
        return res.status(401).json({ 
          error: 'Invalid HF_TOKEN. Please check your token at https://huggingface.co/settings/tokens' 
        });
      }
      
      if (response.status === 503) {
        return res.status(503).json({ 
          error: 'Model is currently loading. Please try again in a moment.' 
        });
      }
      
      return res.status(response.status).json({ 
        error: errorData.error || 'HuggingFace API error',
        details: errorData
      });
    }

    const data = await response.json();
    console.log('HuggingFace Response Data:', JSON.stringify(data).substring(0, 200));

    // Extract generated text from various response formats
    let generatedCode;
    
    if (Array.isArray(data)) {
      // Format: [{ generated_text: "..." }]
      generatedCode = data[0]?.generated_text || '';
    } else if (data.generated_text) {
      // Format: { generated_text: "..." }
      generatedCode = data.generated_text;
    } else if (typeof data === 'string') {
      // Format: "raw text"
      generatedCode = data;
    } else {
      // Unknown format, return as JSON string
      console.warn('Unexpected response format:', data);
      generatedCode = JSON.stringify(data, null, 2);
    }

    return res.status(200).json({
      code: generatedCode,
      model: model,
      usage: {
        prompt_tokens: prompt.length / 4, // Rough estimate
        completion_tokens: generatedCode.length / 4,
        total_tokens: (prompt.length + generatedCode.length) / 4
      }
    });

  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
