// 销售商机接口封装
// 对应后端 /api/deals/*
//
// 用途：
//   - D7-D8 销售漏斗看板（DealBoard.vue）
//   - D10 仪表盘的"销售漏斗转化率"图表也会复用

import request from '@/utils/request'

// =====================================================
// 类型定义
// =====================================================
//
// DealStage：销售阶段 5 个枚举
// 前 4 个对应看板 4 列；'lost' 是隐藏状态（标记丢失后从看板消失）
// 抽成单独 type 后面 stageMap / Select 都能复用
export type DealStage = 'lead' | 'contact' | 'quote' | 'won' | 'lost'

// Deal：商机数据结构，跟后端 db/schema.ts 里的 deals 表对齐
// 注意：
//   - createdAt / expectedCloseAt 经 JSON 序列化后都是 ISO 字符串（如 '2026-09-30T00:00:00.000Z'）
//   - amount / probability / expectedCloseAt 都是 nullable（后端字段可空）
export interface Deal {
  id: number
  customerId: number
  title: string
  amount: number | null
  stage: DealStage
  probability: number | null
  expectedCloseAt: string | null
  ownerId: number
  createdAt: string
}

// 列表 query 参数
// stage 可选：不传 = 看板视图（后端默认排除 lost）；传 = 筛指定 stage
export interface DealListParams {
  stage?: DealStage
}

// 列表返回结构（不分页，所以没有 total/page）
export interface DealListResponse {
  data: Deal[]
}

// 新增 / 编辑共用的入参
// 不含 id / ownerId / createdAt —— 这些后端自己处理
// Partial<...> 让所有字段可选；新增时后端校验 customerId 和 title 必填
//
// 注意 expectedCloseAt 这里类型用 string —— a-date-picker 取出来一般是 dayjs 对象，
// 调接口前要 .toISOString() 转字符串再传
export type DealFormData = Partial<{
  customerId: number
  title: string
  amount: number | null
  stage: DealStage
  probability: number | null
  expectedCloseAt: string | null
}>

// =====================================================
// 接口函数
// =====================================================

/**
 * 获取商机列表
 * GET /api/deals
 *
 * 不传 stage → 看板视图（返回所有非 lost）
 * 传 stage   → 只返回该 stage 的商机
 */
export async function getDealList(
  params: DealListParams = {},
): Promise<DealListResponse> {
  const query: Record<string, string> = {}
  if (params.stage) query.stage = params.stage

  const res = await request.get<DealListResponse>('/deals', { params: query })
  return res.data
}

/**
 * 获取商机详情
 * GET /api/deals/:id
 */
export async function getDealDetail(id: number): Promise<Deal> {
  const res = await request.get<Deal>(`/deals/${id}`)
  return res.data
}

/**
 * 新增商机
 * POST /api/deals
 */
export async function createDeal(data: DealFormData): Promise<Deal> {
  const res = await request.post<Deal>('/deals', data)
  return res.data
}

/**
 * 编辑商机（部分更新）
 * PUT /api/deals/:id
 *
 * ⭐ 拖拽改 stage 也走这个：updateDeal(id, { stage: 'quote' })
 * ⭐ 标记丢失也走这个：    updateDeal(id, { stage: 'lost' })
 */
export async function updateDeal(
  id: number,
  data: DealFormData,
): Promise<Deal> {
  const res = await request.put<Deal>(`/deals/${id}`, data)
  return res.data
}

/**
 * 删除商机
 * DELETE /api/deals/:id
 */
export async function deleteDeal(id: number): Promise<{ success: boolean }> {
  const res = await request.delete<{ success: boolean }>(`/deals/${id}`)
  return res.data
}
