# Client-Side HuggingFace Integration

## Security Considerations ⚠️

Before implementing client-side HuggingFace API calls, understand these critical points:

### ❌ DO NOT expose your HF_TOKEN in client-side code
- **Risk**: Token can be extracted from browser DevTools
- **Impact**: Anyone can use your token to make API calls
- **Cost**: You pay for unauthorized usage

## Three Implementation Approaches

### Option 1: Proxy Backend (Recommended) ✅

**Setup**: Create a backend endpoint that handles HF API calls

```javascript
// In index.html (Client-side - SAFE)
async function generateCode(prompt) {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
  return response.json();
}
```

```javascript
// api/generate.js (Backend - Server-side)
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = req.body;
  const token = process.env.HF_TOKEN; // Secret, not exposed

  try {
    const response = await fetch(
      'https://api-inference.huggingface.co/models/deepseek-ai/DeepSeek-Coder-V2-Lite-Instruct',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: prompt
          }],
          max_tokens: 4096
        })
      }
    );

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

### Option 2: Vercel Serverless (Production-Ready) 🚀

**File**: `api/generate.js`

```javascript
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, model = 'deepseek-ai/DeepSeek-Coder-V2-Lite-Instruct' } = req.body;

  // Security: Validate token exists
  if (!process.env.HF_TOKEN) {
    return res.status(500).json({ error: 'HF_TOKEN not configured' });
  }

  try {
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${model}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.HF_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'You are an elite code generation expert. Generate production-ready code only.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 4096,
          temperature: 0.7,
          stream: false
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return res.status(response.status).json(error);
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({ error: error.message });
  }
}
```

### Option 3: Client-Side (Testing Only) ⚠️

**NOT RECOMMENDED FOR PRODUCTION**

Only use this for local testing or development:

```html
<script>
// Add to index.html inside the React component

const generateWithHuggingFace = async (prompt, token) => {
  try {
    const response = await fetch(
      'https://api-inference.huggingface.co/models/deepseek-ai/DeepSeek-Coder-V2-Lite-Instruct',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: prompt
          }],
          max_tokens: 4096,
          stream: true  // For streaming
        })
      }
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    // Handle streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const text = decoder.decode(value);
      const lines = text.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data:')) {
          const jsonStr = line.substring(5).trim();
          if (jsonStr) {
            const chunk = JSON.parse(jsonStr);
            if (chunk.choices?.[0]?.delta?.content) {
              // Yield chunk to UI
              yield chunk.choices[0].delta.content;
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('HuggingFace error:', error);
    throw error;
  }
};

// In your generate button handler:
async function generate() {
  if (!prompt.trim()) {
    showToast('Enter a prompt', 'warning');
    return;
  }

  setLoading(true);
  let buffer = '';

  try {
    // Get token from localStorage (user inputs their own for testing)
    const token = localStorage.getItem('HF_TOKEN');
    
    if (!token) {
      showToast('Please set HF_TOKEN in localStorage for testing', 'warning');
      return;
    }

    for await (const chunk of generateWithHuggingFace(prompt, token)) {
      buffer += chunk;
      editorRef.current.setValue(cleanCode(buffer));
    }

    showToast('Code generated successfully!', 'success');
  } catch (error) {
    showToast('Generation failed: ' + error.message, 'error');
  }
  
  setLoading(false);
}
</script>
```

## Current Implementation (Puter.js)

Your `index.html` currently uses Puter.js which is **already secure**:

```javascript
if(!await puter.auth.isSignedIn()){
  await puter.auth.signIn({attempt_temp_user_creation:true});
}

const res = await puter.ai.chat([...], {
  model: "claude-sonnet-4-20250514",
  stream: true
});
```

**Advantages**:
- ✅ Secure - no token exposure
- ✅ Already integrated
- ✅ Works client-side
- ✅ User authentication handled

**To add HuggingFace as fallback**:

```javascript
async function generate() {
  try {
    // Try Puter first
    const result = await generateWithPuter(prompt);
    return result;
  } catch (puterError) {
    console.warn('Puter failed, trying HuggingFace...');
    // Fallback to HuggingFace API (via backend proxy)
    return await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    }).then(r => r.json());
  }
}
```

## Hybrid Approach (Recommended)

1. **Keep Puter.js** as primary (already working, secure)
2. **Add backend proxy** for HuggingFace as fallback
3. **Store HF_TOKEN** in `.env` (server-side only)
4. **Client calls** go through `/api/generate`

## Testing Client-Side (Unsafe)

If you want to test directly in browser console:

```javascript
// ⚠️ ONLY for testing, NEVER in production
localStorage.setItem('HF_TOKEN', 'hf_xxxxxxxxxxxx');

const token = localStorage.getItem('HF_TOKEN');
const response = await fetch(
  'https://api-inference.huggingface.co/models/deepseek-ai/DeepSeek-Coder-V2-Lite-Instruct',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messages: [{role: 'user', content: 'hello'}],
      max_tokens: 100
    })
  }
);
const data = await response.json();
console.log(data);
```

## Summary

| Method | Security | Client-side | Ease | Production |
|--------|----------|------------|------|------------|
| Puter.js (Current) | ✅ Excellent | ✅ Yes | ✅ Easy | ✅ Yes |
| Backend Proxy | ✅ Excellent | ✅ Via API | ⚠️ Medium | ✅ Yes |
| Client Direct | ❌ Risky | ✅ Yes | ✅ Easy | ❌ No |

## Next Steps

1. **Keep using Puter.js** for production
2. **Optional**: Set up Vercel API route for HF backup
3. **Never expose tokens** in client code
4. **Use environment variables** for secrets
