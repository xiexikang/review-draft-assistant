import type { Context, OrderItem, Platform, ProviderConfig } from "./types"

export const StorageKeys = {
  providerConfig: "providerConfig",
  ordersSnapshot: "ordersSnapshot",
  draftsByOrderKey: "draftsByOrderKey",
} as const

export async function getProviderConfig(): Promise<ProviderConfig | null> {
  const result = await chrome.storage.local.get(StorageKeys.providerConfig)
  return (result[StorageKeys.providerConfig] as ProviderConfig | undefined) ?? null
}

export async function setProviderConfig(config: ProviderConfig): Promise<void> {
  await chrome.storage.local.set({ [StorageKeys.providerConfig]: config })
}

export type OrdersSnapshot = { platform: Platform; context: Context; orders: OrderItem[] }

export async function getOrdersSnapshot(): Promise<OrdersSnapshot | null> {
  const result = await chrome.storage.local.get(StorageKeys.ordersSnapshot)
  return (result[StorageKeys.ordersSnapshot] as OrdersSnapshot | undefined) ?? null
}

export async function setOrdersSnapshot(snapshot: OrdersSnapshot): Promise<void> {
  await chrome.storage.local.set({ [StorageKeys.ordersSnapshot]: snapshot })
}
