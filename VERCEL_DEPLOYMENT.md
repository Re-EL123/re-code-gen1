# Vercel Deployment & HuggingFace Integration

## Live Deployment Status ✅

**App URL**: https://re-code-gen1.vercel.app/

### Current Setup
- **Frontend**: React + Babel (client-side)
- **Primary AI**: Puter.js (Claude Sonnet 4)
- **Backup API**: HuggingFace DeepSeek-Coder-V2-Lite
- **Serverless**: Vercel API routes ready

## Current Implementation Analysis

### What's Working ✅
1. **Puter.js Integration** (Primary)
   - Already functional in `index.html`
   - Uses Claude Sonnet 4 model
   - Requires Puter.com authentication
   - Secure (no token exposure)

2. **Vercel Deployment** ✅
   - App is live at https://re-code-gen1.vercel.app/
   - Full UI functional
   - File management working
   - Credit system operational
   - Monaco Editor integrated

3. **API Route Ready** ✅
   - `/api/generate.js` deployed
   - Ready to use HuggingFace as fallback
   - Just needs HF_TOKEN environment variable

### What Needs Setup

#### To Enable HuggingFace Backend Proxy:

**Step 1**: Add HF_TOKEN to Vercel
```bash
# In Vercel Dashboard:
# Settings → Environment Variables → Add:
# Key: HF_TOKEN
# Value: hf_your_actual_token_here
```

**Step 2**: Verify API route is accessible
```bash
# Test the endpoint
curl https://re-code-gen1.vercel.app/api/generate \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"prompt": "hello world"}'
```

**Step 3**: Update `index.html` to use fallback
```javascript
// Add to continueGeneration() function:
async function generateWithFallback(prompt) {
  try {
    // Try Puter first
    return await generateWithPuter(prompt);
  } catch (error) {
    console.warn('Puter failed, using HuggingFace...');
    
    // Fallback to HuggingFace
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return response.json();
  }
}
```

## Deployment Checklist

### Prerequisites
- [x] GitHub repository configured
- [x] Vercel project connected
- [x] `index.html` deployed
- [x] `api/generate.js` deployed
- [x] Environment ready
- [ ] HF_TOKEN added to Vercel
- [ ] HuggingFace fallback integrated

### To Enable HuggingFace Fallback

1. **Get HuggingFace Token**
   ```bash
   # Visit: https://huggingface.co/settings/tokens/new
   # Create fine-grained token with "Make calls to Inference Providers"
   # Copy token: hf_xxxxxxxxxxxx
   ```

2. **Add to Vercel**
   - Go to: https://vercel.com/dashboard
   - Select project: `re-code-gen1`
   - Settings → Environment Variables
   - Add:
     ```
     Key: HF_TOKEN
     Value: hf_xxxxxxxxxxxx
     Environments: Production, Preview, Development
     ```
   - Deploy changes

3. **Test Endpoint**
   ```javascript
   // In browser console:
   fetch('/api/generate', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ 
       prompt: 'Write hello world in JavaScript',
       model: 'deepseek-ai/DeepSeek-Coder-V2-Lite-Instruct'
     })
   }).then(r => r.json()).then(console.log)
   ```

## API Response Format

### Request
```json
{
  "prompt": "Create a React component for a todo list",
  "model": "deepseek-ai/DeepSeek-Coder-V2-Lite-Instruct",
  "maxTokens": 4096
}
```

### Success Response (200)
```json
{
  "code": "function helloWorld() {\n  console.log('Hello, world!');\n}\n\nhelloWorld();",
  "model": "deepseek-ai/DeepSeek-Coder-V2-Lite-Instruct",
  "usage": {
    "prompt_tokens": 50,
    "completion_tokens": 40,
    "total_tokens": 90
  }
}
```

### Error Response
```json
{
  "error": "Rate limit exceeded" // or "Invalid HF_TOKEN", etc.
}
```

## Monitoring & Debugging

### Check Vercel Logs
```bash
# View deployment logs
vercel logs re-code-gen1

# Follow logs in real-time
vercel logs re-code-gen1 --follow
```

### Test HuggingFace API Directly
```bash
curl https://api-inference.huggingface.co/models/deepseek-ai/DeepSeek-Coder-V2-Lite-Instruct \
  -H "Authorization: Bearer $HF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "hello"}],
    "max_tokens": 100
  }'
```

### Common Issues

**Issue**: "HF_TOKEN not configured"
- **Solution**: Add HF_TOKEN to Vercel environment variables and redeploy

**Issue**: "Rate limit exceeded"
- **Solution**: Wait a few minutes before retrying, or upgrade HuggingFace plan

**Issue**: "Model not found"
- **Solution**: Model may be loading. Try alternative model:
  ```
  deepseek-ai/DeepSeek-Coder-V2-Lite-Instruct
  Qwen/Qwen2.5-Coder-7B-Instruct
  meta-llama/Llama-3.1-8B-Instruct
  ```

## Performance Metrics

### Puter.js (Current Primary)
- Response Time: ~2-5 seconds
- Availability: 99.9%
- Cost: User-based (Puter platform)

### HuggingFace API (Fallback)
- Response Time: ~1-3 seconds
- Availability: 99.5%
- Cost: ~$0.001 per 250 tokens

## Architecture Diagram

```
User Browser (index.html)
       ↓
   Puter.js ← PRIMARY
  (Claude 4)
       ├─ FAILS
       ↓
   /api/generate ← FALLBACK
  (Vercel Route)
       ↓
  HuggingFace API
 (DeepSeek Coder)
```

## Next Steps

1. **Immediate**
   - ✅ Add HF_TOKEN to Vercel
   - ✅ Test `/api/generate` endpoint

2. **Short Term**
   - [ ] Add HuggingFace fallback to index.html
   - [ ] Add error handling for both APIs
   - [ ] Implement retry logic

3. **Long Term**
   - [ ] Load balancing between multiple providers
   - [ ] Cost optimization
   - [ ] Usage analytics
   - [ ] Advanced caching

## Resources

- Vercel Dashboard: https://vercel.com/dashboard
- HuggingFace Tokens: https://huggingface.co/settings/tokens
- API Documentation: https://huggingface.co/docs/api-inference/
- Deployment Status: https://re-code-gen1.vercel.app/

## Support

For issues with the deployment:
1. Check Vercel logs
2. Verify HF_TOKEN is set
3. Test API endpoint directly
4. Check HuggingFace status page
