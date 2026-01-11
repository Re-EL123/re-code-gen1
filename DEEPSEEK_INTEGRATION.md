# DeepSeek-Coder-V2-Lite-Instruct Integration Guide

## Overview

This guide covers integrating **DeepSeek-Coder-V2-Lite-Instruct** into Re-Code Gen1 via HuggingFace Inference API. DeepSeek is a powerful code generation model with:

- **128K token context window** (vs 4K for Qwen)
- **Advanced code understanding** - better at complex tasks
- **Strong performance** on multi-file code generation
- **Cost-effective** - competitive pricing via HuggingFace

## Model Specifications

| Feature | DeepSeek V2 Lite | Qwen 2.5 Coder | Llama 3.1 |
|---------|-----------------|----------------|----------|
| Parameters | 16B | 7B | 8B |
| Context Window | 128K | 32K | 131K |
| Coding Focus | Yes (Primary) | Yes (Primary) | General |
| Speed | Fast | Very Fast | Fast |
| Quality | Excellent | Good | Very Good |
| Context Handling | Excellent | Good | Excellent |

## Prerequisites

1. **HuggingFace Account**: https://huggingface.co/
2. **HuggingFace Token**: https://huggingface.co/settings/tokens/new
   - Create a fine-grained token with "Make calls to Inference Providers" permission
3. **Node.js 18+**: For running the JavaScript implementation
4. **npm or yarn**: Package manager

## Setup Steps

### Step 1: Get Your HuggingFace Token

```bash
# 1. Visit: https://huggingface.co/settings/tokens/new
# 2. Create a new token with:
#    - Type: Fine-grained
#    - Permissions: "Make calls to Inference Providers"
# 3. Copy the token (keep it secret!)
```

### Step 2: Create Your Local `.env` File

```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your actual token
# Change: HF_TOKEN=your_huggingface_token_here
# To: HF_TOKEN=hf_XXXXXXXXXXXXXXXXXXXX
```

### Step 3: Install Dependencies

```bash
npm install @huggingface/inference dotenv
```

## JavaScript Implementation

### Basic Setup

Create `lib/huggingface.js`:

```javascript
import { InferenceClient } from "@huggingface/inference";
import dotenv from "dotenv";

dotenv.config();

const client = new InferenceClient(process.env.HF_TOKEN);

const DEFAULT_MODEL = "deepseek-ai/DeepSeek-Coder-V2-Lite-Instruct";
const DEFAULT_CONFIG = {
  max_tokens: 4096,
  temperature: 0.7,
  top_p: 0.95,
  top_k: 40,
};

export async function generateCode(prompt, options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options };
  const model = options.model || DEFAULT_MODEL;

  try {
    const message = await client.chatCompletion({
      model,
      messages: [
        {
          role: "system",
          content: `You are an elite code generation expert. Generate production-ready code with:
- Complete, fully functional implementations
- No placeholders or TODO comments
- Proper error handling and edge cases
- Best practices and clean code
- Performance optimized
- Well-structured and maintainable
Return ONLY code with no explanations.`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      ...config,
    });

    return {
      code: message.choices[0].message.content,
      model,
      usage: message.usage,
    };
  } catch (error) {
    throw new Error(`Code generation failed: ${error.message}`);
  }
}

export async function* generateCodeStream(
  prompt,
  options = {}
) {
  const config = { ...DEFAULT_CONFIG, ...options };
  const model = options.model || DEFAULT_MODEL;

  try {
    const stream = await client.chatCompletion({
      model,
      messages: [
        {
          role: "system",
          content: `You are an elite code generation expert. Generate production-ready code...`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      stream: true,
      ...config,
    });

    for await (const chunk of stream) {
      if (chunk.choices[0].delta.content) {
        yield chunk.choices[0].delta.content;
      }
    }
  } catch (error) {
    throw new Error(`Streaming generation failed: ${error.message}`);
  }
}

export async function continueCode(existingCode, instruction, options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options };
  const model = options.model || DEFAULT_MODEL;

  try {
    const message = await client.chatCompletion({
      model,
      messages: [
        {
          role: "system",
          content: `You are an elite code continuation expert. Continue code exactly where it stops.`,
        },
        {
          role: "user",
          content: `Continue this code:
\`\`\`
${existingCode}
\`\`\`

Instruction: ${instruction}`,
        },
      ],
      ...config,
    });

    return {
      code: existingCode + message.choices[0].message.content,
      model,
    };
  } catch (error) {
    throw new Error(`Code continuation failed: ${error.message}`);
  }
}
```

### React Integration

Update your React component:

```javascript
import { generateCode, generateCodeStream } from "./lib/huggingface";

function App() {
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState("");

  async function handleGenerate() {
    if (!prompt.trim()) return;

    setLoading(true);
    try {
      // Use streaming for real-time display
      let buffer = "";
      for await (const chunk of generateCodeStream(prompt)) {
        buffer += chunk;
        editorRef.current.setValue(buffer);
      }

      // Detect language and update editor
      const lang = detectLanguage(buffer);
      monacoRef.current.editor.setModelLanguage(
        editorRef.current.getModel(),
        lang
      );
    } catch (error) {
      showToast("Generation failed: " + error.message, "error");
    }
    setLoading(false);
  }

  return (
    <>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe what code you want to generate..."
        disabled={loading}
      />
      <button onClick={handleGenerate} disabled={loading || !prompt.trim()}>
        {loading ? "Generating..." : "Generate Code"}
      </button>
    </>
  );
}
```

## Advanced Usage

### Custom Model Parameters

```javascript
// Lower temperature = more deterministic
const result = await generateCode(prompt, {
  temperature: 0.3,  // More consistent
  max_tokens: 2048,  // Shorter responses
});

// Higher temperature = more creative
const creative = await generateCode(prompt, {
  temperature: 0.9,  // More varied
  top_p: 0.99,       // More diversity
});
```

### Using Alternative Models

```javascript
// Switch to Qwen for faster processing
const fastResult = await generateCode(prompt, {
  model: "Qwen/Qwen2.5-Coder-7B-Instruct",
});

// Use Llama for general tasks
const generalResult = await generateCode(prompt, {
  model: "meta-llama/Llama-3.1-8B-Instruct",
});
```

### Error Handling

```javascript
try {
  const result = await generateCode(prompt);
} catch (error) {
  if (error.message.includes("rate limit")) {
    // Handle rate limiting - wait and retry
    await new Promise(resolve => setTimeout(resolve, 5000));
  } else if (error.message.includes("401")) {
    // Invalid token
    showToast("Invalid HuggingFace token", "error");
  } else if (error.message.includes("model not found")) {
    // Model unavailable
    showToast("Model unavailable, trying alternative...", "warning");
  }
}
```

## API Endpoint Reference

### Chat Completions

**Endpoint**: `https://api-inference.huggingface.co/models/{model_id}`

**Request**:
```json
{
  "messages": [
    {"role": "system", "content": "You are a code expert..."},
    {"role": "user", "content": "Write a function that..."}
  ],
  "max_tokens": 4096,
  "temperature": 0.7,
  "stream": false
}
```

**Headers**:
```
Authorization: Bearer {HF_TOKEN}
Content-Type: application/json
```

### Direct cURL Example

```bash
curl https://api-inference.huggingface.co/models/deepseek-ai/DeepSeek-Coder-V2-Lite-Instruct \
  -H "Authorization: Bearer $HF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Write a hello world function"}
    ],
    "max_tokens": 1024
  }'
```

## Performance Tips

1. **Use Streaming**: Better UX for long generations
2. **Cache Responses**: Store common code snippets
3. **Optimize Prompts**: Be specific and clear
4. **Batch Requests**: Group multiple generations
5. **Monitor Usage**: Track tokens used

## Troubleshooting

### Issue: "401 Unauthorized"

```bash
# Solution: Check your token
echo $HF_TOKEN
# Regenerate at: https://huggingface.co/settings/tokens/new
```

### Issue: "Model not found"

```bash
# Solution: Model may be loading
# Try again in a minute, or use alternative:
HF_MODEL=Qwen/Qwen2.5-Coder-7B-Instruct
```

### Issue: "Rate limit exceeded"

```javascript
// Add exponential backoff
async function retryWithBackoff(fn, maxAttempts = 3) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxAttempts - 1) throw error;
      const delay = Math.pow(2, i) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

## Cost Estimation

HuggingFace Inference API pricing (example rates):

- **Input tokens**: ~$0.001 per 1M tokens
- **Output tokens**: ~$0.003 per 1M tokens

For 1000 character generation (~250 tokens):
- Cost: ~$0.001

## Resources

- [HuggingFace Documentation](https://huggingface.co/docs/api-inference/)
- [DeepSeek Model Card](https://huggingface.co/deepseek-ai/DeepSeek-Coder-V2-Lite-Instruct)
- [Inference Providers](https://huggingface.co/docs/inference-providers/)
- [Token Guide](https://huggingface.co/docs/hub/security-tokens)

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review HuggingFace docs
3. Check model availability
4. Verify API token permissions
