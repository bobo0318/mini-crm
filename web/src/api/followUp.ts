// 跟进记录接口
// 追加 only：只有 GET / POST，没有 PUT/DELETE（业务约定）

import request from '@/utils/request'

// =====================================================
// 类型
// =====================================================
export interface FollowUp {
  id: number
  customerId: number
  userId: number
  type: 'call' | 'visit' | 'email' | 'wechat'
  content: string  // Markdown 文本
  nextAt: string | null  // ISO 字符串或 null
  createdAt: string
}

export type FollowUpFormData = {
  type: FollowUp['type']
  content: string
  nextAt?: string | null  // 前端选了 dayjs 对象，提交时转 ISO 字符串
}

// =====================================================
// 接口
// =====================================================

/** 列出某客户的跟进记录（按时间倒序，后端已经做了） */
export async function getFollowUpList(customerId: number): Promise<FollowUp[]> {
  const res = await request.get<FollowUp[]>(`/customers/${customerId}/follow-ups`)
  return res.data
}

/** 给某客户加一条跟进 */
export async function createFollowUp(
  customerId: number,
  data: FollowUpFormData,
): Promise<FollowUp> {
  const res = await request.post<FollowUp>(`/customers/${customerId}/follow-ups`, data)
  return res.data
}
