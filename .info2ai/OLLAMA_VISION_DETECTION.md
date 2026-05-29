# Ollama Vision Capability Detection

This document explains how the Sarvam Dashboard detects whether an Ollama model supports vision (multimodal) capabilities using the **native Ollama API**.

---

## Native API Detection Method

**Function:** `fetchOllamaModelCapabilities(url: string, modelName: string)`
**Location:** `lib/ollama-api.ts`

### How It Works

```typescript
export async function fetchOllamaModelCapabilities(url: string, modelName: string): Promise<OllamaCapabilities> {
  if (!modelName) return { vision: false, thinking: false };
  const baseUrl = (url ?? "http://localhost:11434").replace(/\/$/, "");
  try {
    const response = await fetch(`${baseUrl}/api/show`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: modelName }),
    });
    if (response.ok) {
      const data = await response.json();
      if (data.capabilities) {
        return {
          vision: data.capabilities.includes("vision"),
          thinking: data.capabilities.includes("thinking"),
        };
      }
    }
  } catch (e) {
    console.warn("Failed to fetch capabilities from Ollama API");
  }
  return { vision: false, thinking: false };
}
```

### Process

1. **API Call:** `POST {ollamaUrl}/api/show` with `{ name: modelName }`
2. **Response Check:** Look for `data.capabilities` array in the response
3. **Vision Detection:** Check if the string `"vision"` exists in the capabilities array
4. **Error Handling:** If API fails, returns `{ vision: false, thinking: false }`

### Example Response

```json
{
  "capabilities": ["vision", "thinking"],
  "modelfile": "...",
  "parameters": "...",
  "template": "..."
}
```

### Capabilities Array

The Ollama API returns a `capabilities` array that can contain:
- `"vision"` — Model supports image inputs
- `"thinking"` — Model supports internal reasoning/thinking mode

**Note:** If the `capabilities` field is missing or the API call fails, the function returns `{ vision: false, thinking: false }` as a safe default.

---

## Integration Points

### 1. Model Selection (ModelSettings.tsx)

When the user selects a model, capabilities are fetched:

```typescript
useEffect(() => {
  if (config.provider === "ollama" && config.model) {
    fetchOllamaModelCapabilities(config.ollamaUrl ?? "http://localhost:11434", config.model)
      .then(setOllamaCaps);
  } else {
    setOllamaCaps({ vision: false, thinking: false });
  }
}, [config.provider, config.model, config.ollamaUrl]);
```

### 2. Playground Page (playground/page.tsx)

Capabilities are tracked at the page level:

```typescript
const [ollamaCaps, setOllamaCaps] = useState<OllamaCapabilities>({
  vision: false,
  thinking: false
});

useEffect(() => {
  if (config.provider === "ollama" && config.model) {
    fetchOllamaModelCapabilities(config.ollamaUrl, config.model).then(setOllamaCaps);
  }
}, [config.provider, config.model, config.ollamaUrl]);
```

### 3. UI Conditional Rendering

**Image Attachments (PromptBar):**
```typescript
allowAttachments={config.provider === "ollama" && ollamaCaps.vision}
```

**Thinking Toggle (ModelSettings):**
```typescript
{ollamaCaps.thinking && (
  <div className="flex items-center justify-between">
    <span>Thinking</span>
    <button onClick={() => onChange({ ...config, ollamaThinking: !config.ollamaThinking })}>
      Toggle
    </button>
  </div>
)}
```

---

## Detection Flow Diagram

```
User selects Ollama model
         ↓
fetchOllamaModelCapabilities()
         ↓
POST /api/show { name: modelName }
         ↓
    ┌────────────┐
    │ Response?  │
    └────────────┘
         ↓
    ┌─────────────────────┐
    │ Has capabilities[]? │
    └─────────────────────┘
         ↓
    YES ──→ vision = capabilities.includes("vision")
         ↓
    NO ───→ Return { vision: false, thinking: false }
         ↓
    Return { vision: bool, thinking: bool }
         ↓
    setOllamaCaps(result)
         ↓
    UI updates:
    - Show/hide image attachment button
    - Show/hide thinking toggle
```

---

## Example Scenarios

### Scenario 1: Vision Model with Capabilities

```
Model: llava:13b
API Response: { capabilities: ["vision"] }
Result: { vision: true, thinking: false }
UI: Image attachment button enabled
```

### Scenario 2: Model Without Capabilities Field

```
Model: llava:13b
API Response: { capabilities: undefined }
Result: { vision: false, thinking: false }
UI: Image attachment button hidden
```

### Scenario 3: Text-Only Model

```
Model: llama3.1:8b
API Response: { capabilities: [] }
Result: { vision: false, thinking: false }
UI: Image attachment button hidden
```

### Scenario 4: Network Error

```
Model: qwen2-vl:7b
API Call: Failed (CORS/network error)
Result: { vision: false, thinking: false }
UI: Image attachment button hidden
```

---

## Type Definition

```typescript
export interface OllamaCapabilities {
  vision: boolean;
  thinking: boolean;
}
```

---

## Key Takeaways

1. **Native API Only:** Uses Ollama's official `/api/show` endpoint
2. **Graceful Degradation:** Returns safe defaults if API fails
3. **Real-time Updates:** Capabilities refresh whenever model changes
4. **UI-Driven:** Detection directly controls feature availability in the UI
5. **No Guesswork:** Only trusts the official capabilities array from Ollama

---

## Future Improvements

- Cache capabilities per model to reduce API calls
- Add user override option in settings for manual capability configuration
- Display warning when capabilities field is missing from API response
- Retry logic for transient network failures
