import { useEffect, useMemo, useState } from "react"
import type { ProviderConfig, ProviderId } from "../../shared/types"
import type { ProviderTestResult } from "../../shared/messages"
import { sendToBackground } from "../../shared/messages"
import { getProviderConfig, setProviderConfig } from "../../shared/storage"

const providerModels: Record<ProviderId, string[]> = {
  openai: [
    "gpt-5.4-pro",
    "gpt-5.4",
    "gpt-5.4-mini",
    "gpt-5.4-nano",
    "gpt-5.3-chat",
    "gpt-5.3-codex",
    "gpt-5.2-pro",
    "gpt-5.2",
    "o3-deep-research",
    "o4-mini-deep-research"
  ],
  claude: [
    "claude-sonnet-4.6",
    "claude-opus-4.6",
    "claude-sonnet-4.5",
    "claude-opus-4.5",
    "claude-haiku-4.5",
    "claude-sonnet-4",
    "claude-opus-4",
    "claude-3-haiku"
  ],
  zhipu: [
    "glm-5.1",
    "glm-5",
    "glm-5-turbo",
    "glm-4.7",
    "glm-4.7-flash",
    "glm-4.6",
    "glm-4-32b",
    "glm-4-flash",
    "glm-4",
  ],
  deepseek: ["deepseek-chat", "deepseek-reasoner"],
  qwen: [
    "qwen3.6-plus",
    "qwen3.6-plus-preview",
    "qwen3.5-9b",
    "qwen3.5-35b-a3b",
    "qwen3.5-27b",
    "qwen3.5-122b-a10b",
    "qwen3.5-flash-02-23",
    "qwen3.5-plus-02-15",
    "qwen3.5-397b-a17b",
    "qwen3-max-thinking",
    "qwen3-coder-next",
    "qwen3-max"
  ],
  minimax: [
    "minimax-m2.7",
    "minimax-m2.5",
    "minimax-m2-her",
    "minimax-m2.1",
    "minimax-m2",
    "minimax-m1",
    "minimax-01"
  ],
  moonshot: [
    "kimi-k2.5",
    "kimi-k2-thinking",
    "kimi-k2-0905",
    "kimi-k2",
    "kimi-dev-72b",
    "moonlight-16b-a3b-instruct"
  ],
  openrouter: [
    "openai/gpt-5.4-mini",
    "openai/gpt-5.4-nano",
    "anthropic/claude-sonnet-4.6",
    "z-ai/glm-4.7",
    "qwen/qwen3.6-plus",
    "deepseek/deepseek-chat",
    "moonshotai/kimi-k2",
    "minimax/minimax-m2.5",
  ],
}

export function SettingsTab() {
  const [provider, setProvider] = useState<ProviderId>("openai")
  const [apiKey, setApiKey] = useState("")
  const [model, setModel] = useState(providerModels.openai[0]!)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [baseUrl, setBaseUrl] = useState("")
  const [maxTokens, setMaxTokens] = useState<number>(800)
  const [temperature, setTemperature] = useState<number>(0.7)
  const [status, setStatus] = useState<string>("")

  const models = useMemo(() => providerModels[provider], [provider])
  const baseUrlPlaceholder = useMemo(() => {
    if (provider === "zhipu")
      return "中国区：https://open.bigmodel.cn/api/paas/v4  国际区：https://api.z.ai/api/paas/v4  OpenRouter：https://openrouter.ai/api/v1"
    if (provider === "openai") return "https://api.openai.com"
    if (provider === "claude") return "https://api.anthropic.com"
    if (provider === "qwen") return "https://dashscope.aliyuncs.com/compatible-mode/v1"
    if (provider === "minimax") return "https://api.minimax.chat/v1"
    if (provider === "moonshot") return "https://api.moonshot.cn/v1"
    if (provider === "openrouter") return "https://openrouter.ai/api/v1"
    return "https://api.deepseek.com"
  }, [provider])

  useEffect(() => {
    void (async () => {
      const cfg = await getProviderConfig()
      if (!cfg) return
      setProvider(cfg.provider)
      setApiKey(cfg.apiKey)
      setModel(cfg.model)
      setBaseUrl(cfg.baseUrl ?? "")
      setMaxTokens(cfg.maxTokens ?? 800)
      setTemperature(cfg.temperature ?? 0.7)
    })()
  }, [])

  async function onSave() {
    const cfg: ProviderConfig = {
      provider,
      apiKey: apiKey.trim(),
      model: model.trim(),
      baseUrl: baseUrl.trim() || undefined,
      maxTokens,
      temperature,
    }
    await setProviderConfig(cfg)
    setStatus("已保存")
  }

  async function onTest() {
    setStatus("测试中…")
    const cfg: ProviderConfig = {
      provider,
      apiKey: apiKey.trim(),
      model: model.trim(),
      baseUrl: baseUrl.trim() || undefined,
      maxTokens,
      temperature,
    }
    try {
      const resp = (await sendToBackground({
        type: "PROVIDER_TEST",
        payload: { providerConfig: cfg },
      })) as ProviderTestResult
      if (resp.payload.ok) setStatus("连接成功")
      else setStatus(`连接失败：${resp.payload.errorMessage ?? "unknown"}`)
    } catch (e) {
      setStatus(`连接失败：${e instanceof Error ? e.message : "unknown"}`)
    }
  }

  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold">AI设置</div>

      <label className="block space-y-1">
        <div className="text-xs text-slate-600">大模型厂商</div>
        <select
          className="w-full rounded border px-2 py-1 text-sm"
          value={provider}
          onChange={(e) => {
            const newProvider = e.target.value as ProviderId
            setProvider(newProvider)
            setModel(providerModels[newProvider][0]!)
          }}
        >
          <option value="openai">OpenAI</option>
          <option value="claude">Claude</option>
          <option value="zhipu">智谱</option>
          <option value="deepseek">DeepSeek</option>
          <option value="qwen">Qwen (通义千问)</option>
          <option value="minimax">MiniMax</option>
          <option value="moonshot">Kimi (Moonshot)</option>
          <option value="openrouter">OpenRouter</option>
        </select>
      </label>

      <label className="block space-y-1">
        <div className="text-xs text-slate-600">API Key</div>
        <input
          className="w-full rounded border px-2 py-1 text-sm"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="仅存本地 storage"
        />
      </label>

      <label className="block space-y-1">
        <div className="text-xs text-slate-600">模型</div>
        <select
          className="w-full rounded border px-2 py-1 text-sm"
          value={model}
          onChange={(e) => setModel(e.target.value)}
        >
          {models.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </label>

      <button
        className="w-full rounded bg-slate-900 px-2 py-2 text-sm text-white"
        type="button"
        onClick={onTest}
      >
        测试连接
      </button>

      <button className="w-full rounded border px-2 py-2 text-sm" type="button" onClick={onSave}>
        保存
      </button>

      <button
        className="text-xs text-slate-700 underline"
        type="button"
        onClick={() => setAdvancedOpen((v) => !v)}
      >
        {advancedOpen ? "收起高级参数" : "展开高级参数"}
      </button>

      {advancedOpen ? (
        <div className="space-y-2 rounded border bg-slate-50 p-2">
          <label className="block space-y-1">
            <div className="text-xs text-slate-600">Base URL</div>
            <input
              className="w-full rounded border px-2 py-1 text-sm"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder={baseUrlPlaceholder}
            />
          </label>
          <label className="block space-y-1">
            <div className="text-xs text-slate-600">maxTokens</div>
            <input
              className="w-full rounded border px-2 py-1 text-sm"
              type="number"
              value={maxTokens}
              onChange={(e) => setMaxTokens(Number(e.target.value))}
            />
          </label>
          <label className="block space-y-1">
            <div className="text-xs text-slate-600">temperature</div>
            <input
              className="w-full rounded border px-2 py-1 text-sm"
              type="number"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
            />
          </label>
        </div>
      ) : null}

      {status ? <div className="text-xs text-slate-700">{status}</div> : null}
    </div>
  )
}
