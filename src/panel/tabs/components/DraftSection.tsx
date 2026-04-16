type DraftSectionProps = {
  label: string
  text: string
  statusText: string
  onCopy: () => void
  onFill: () => void
  onFillAndSubmit: () => void
}

export function DraftSection({ label, text, statusText, onCopy, onFill, onFillAndSubmit }: DraftSectionProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold">{label}</div>
        <div className="flex items-center gap-1">
          {statusText && <span className="text-[10px] text-green-600">{statusText}</span>}
          <button
            className="rounded border px-2 py-1 text-xs bg-white hover:bg-slate-50 transition-colors"
            type="button"
            onClick={onCopy}
          >
            复制
          </button>
          <button
            className="rounded border px-2 py-1 text-xs bg-white hover:bg-slate-50 transition-colors"
            type="button"
            onClick={onFill}
          >
            填入
          </button>
          <button
            className="rounded border px-2 py-1 text-xs bg-slate-900 text-white hover:bg-slate-800 transition-colors"
            type="button"
            onClick={onFillAndSubmit}
          >
            填入并发表
          </button>
        </div>
      </div>
      <div className="whitespace-pre-wrap break-words text-xs text-slate-800 bg-white p-2 rounded border border-slate-200">
        {text}
      </div>
    </div>
  )
}
