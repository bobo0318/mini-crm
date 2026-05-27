// 联系人接口封装
// 对应后端 /api/customers/:cid/contacts 和 /api/contacts/:id
//
// URL 风格混合：列表/新增走嵌套，编辑/删除走扁平 —— 跟后端约定一致

import request from '@/utils/request'

// =====================================================
// 类型
// =====================================================
// 跟后端 db/schema.ts contacts 表对齐
export interface Contact {
  id: number
  customerId: number
  name: string
  phone: string | null
  email: string | null
  position: string | null
  isPrimary: boolean
  createdAt: string
}

// 新增/编辑用的表单数据（不含后端自己处理的字段）
export type ContactFormData = Partial<{
  name: string
  phone: string | null
  email: string | null
  position: string | null
  isPrimary: boolean
}>

// =====================================================
// 接口函数
// =====================================================

/** 列出某客户的所有联系人 */
export async function getContactList(customerId: number): Promise<Contact[]> {
  const res = await request.get<Contact[]>(`/customers/${customerId}/contacts`)
  return res.data
}

/** 给某客户新增联系人 */
export async function createContact(
  customerId: number,
  data: ContactFormData,
): Promise<Contact> {
  const res = await request.post<Contact>(`/customers/${customerId}/contacts`, data)
  return res.data
}

/** 编辑联系人（扁平路径，因为联系人 id 全局唯一） */
export async function updateContact(
  id: number,
  data: ContactFormData,
): Promise<Contact> {
  const res = await request.put<Contact>(`/contacts/${id}`, data)
  return res.data
}

/** 删除联系人 */
export async function deleteContact(id: number): Promise<{ success: boolean }> {
  const res = await request.delete<{ success: boolean }>(`/contacts/${id}`)
  return res.data
}
