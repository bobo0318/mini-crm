// 仪表盘统计接口（D10）
// 对应后端 /api/stats/*

import request from '@/utils/request'

// =====================================================
// 类型定义
// =====================================================

// /overview 返回的 4 个核心指标
export interface OverviewStats {
  totalCustomers: number
  newCustomersThisMonth: number
  activeDeals: number
  weightedExpectedAmount: number
}

// /customer-trend 返回每天一条
export interface CustomerTrendItem {
  date: string  // 'YYYY-MM-DD' 格式
  count: number
}

// /deal-funnel 返回 4 个 stage 各一条（lead/contact/quote/won，固定顺序）
export interface FunnelItem {
  stage: 'lead' | 'contact' | 'quote' | 'won'
  count: number
}

// /sales-rank 返回 Top 10
export interface SalesRankItem {
  ownerName: string | null
  totalAmount: number
}

// =====================================================
// 接口函数
// =====================================================

export async function getOverview(): Promise<OverviewStats> {
  const res = await request.get<OverviewStats>('/stats/overview')
  return res.data
}

export async function getCustomerTrend(): Promise<{ data: CustomerTrendItem[] }> {
  const res = await request.get<{ data: CustomerTrendItem[] }>('/stats/customer-trend')
  return res.data
}

export async function getDealFunnel(): Promise<{ data: FunnelItem[] }> {
  const res = await request.get<{ data: FunnelItem[] }>('/stats/deal-funnel')
  return res.data
}

export async function getSalesRank(): Promise<{ data: SalesRankItem[] }> {
  const res = await request.get<{ data: SalesRankItem[] }>('/stats/sales-rank')
  return res.data
}
