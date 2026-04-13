import { useMemo, useState } from "react"
import { DraftsTab } from "./tabs/DraftsTab"
import { OrdersTab } from "./tabs/OrdersTab"
import { SettingsTab } from "./tabs/SettingsTab"

type TabKey = "orders" | "drafts" | "settings"

export function App() {
  const [tab, setTab] = useState<TabKey>("orders")

  const content = useMemo(() => {
    if (tab === "orders") return <OrdersTab />
    if (tab === "drafts") return <DraftsTab />
    return <SettingsTab />
  }, [tab])

  return (
    <div className="h-screen w-full bg-white text-slate-900">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="text-sm font-semibold">Review Draft Assistant</div>
        <div className="flex gap-1">
          <button
            className={
              tab === "orders"
                ? "rounded bg-slate-900 px-2 py-1 text-xs text-white"
                : "rounded px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
            }
            onClick={() => setTab("orders")}
            type="button"
          >
            订单
          </button>
          <button
            className={
              tab === "drafts"
                ? "rounded bg-slate-900 px-2 py-1 text-xs text-white"
                : "rounded px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
            }
            onClick={() => setTab("drafts")}
            type="button"
          >
            草稿
          </button>
          <button
            className={
              tab === "settings"
                ? "rounded bg-slate-900 px-2 py-1 text-xs text-white"
                : "rounded px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
            }
            onClick={() => setTab("settings")}
            type="button"
          >
            设置
          </button>
        </div>
      </div>
      <div className="p-3">{content}</div>
    </div>
  )
}

