const { OpenAI } = require("openai");

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, model = 'deepseek-ai/DeepSeek-V3.2:fireworks-ai', maxTokens = 4096 } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'prompt is required' });
    }

    const hfToken = process.env.HF_TOKEN;
    
    if (!hfToken) {
      return res.status(500).json({ 
        error: 'HF_TOKEN not configured'
      });
    }

    console.log('Creating OpenAI client...');
    const client = new OpenAI({
      baseURL: "https://router.huggingface.co/v1",
      apiKey: hfToken,
    });

    console.log('Calling model:', model);
    const chatCompletion = await client.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: "you are an elite coding assistant who generates production-ready code: complete, no placeholders/TODOs, with error handling, best practices, and comments. Make it efficient and maintainable.Code only." },
        { role: "user", content: prompt }
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
    });

    console.log('Response received successfully');
    return res.status(200).json({
      code: chatCompletion.choices[0].message.content,
      model: chatCompletion.model,
      usage: chatCompletion.usage
    });

  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
};
