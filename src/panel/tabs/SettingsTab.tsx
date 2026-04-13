import { useEffect, useMemo, useState } from "react"
import type { ProviderConfig, ProviderId } from "../../shared/types"
import type { ProviderTestResult } from "../../shared/messages"
import { sendToBackground } from "../../shared/messages"
import { getProviderConfig, setProviderConfig } from "../../shared/storage"

const providerModels: Record<ProviderId, string[]> = {
  openai: ["gpt-4o-mini", "gpt-4.1-mini"],
  claude: ["claude-3-5-sonnet-latest", "claude-3-5-haiku-latest"],
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

  useEffect(() => {
    setModel(models[0]!)
  }, [provider, models])

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
      <div className="text-sm font-semibold">设置</div>

      <label className="block space-y-1">
        <div className="text-xs text-slate-600">厂商</div>
        <select
          className="w-full rounded border px-2 py-1 text-sm"
          value={provider}
          onChange={(e) => setProvider(e.target.value as ProviderId)}
        >
          <option value="openai">OpenAI</option>
          <option value="claude">Claude</option>
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
