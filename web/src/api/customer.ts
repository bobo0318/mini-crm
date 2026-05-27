// 客户管理接口封装
// 对应后端 /api/customers/*
//
// 本批次（D4）只用到 list / detail，但类型定义放在这统一管理
// D5 加新增/编辑/删除时只需要往下追加函数

import request from '../utils/request'

// =====================================================
// 类型定义
// =====================================================
//
// Customer：客户数据结构，跟后端 db/schema.ts 里的 customers 表对齐
// 注意：
//   - createdAt 在后端是 Date 对象，经过 JSON 序列化变成 ISO 字符串（如 "2026-05-27T04:53:03.000Z"）
//   - 可空字段（company / level / industry / source / tags）显式标 string | null，TS 类型推导才准
//
// 这里前端为啥要自己再写一遍类型？后端 drizzle 推导出的类型不能跨项目 import，
// 后端 api/ 和前端 web/ 是两个独立 npm 项目，前端只能自己定义。
// 真实大项目会把这种"前后端共享类型"抽成第三个包（monorepo），
// 学习项目咱不上那个复杂度，手动同步即可。
export interface Customer {
  id: number
  name: string
  company: string | null
  level: 'A' | 'B' | 'C' | null
  industry: string | null
  source: string | null
  stage: 'lead' | 'contact' | 'qualified' | 'won' | 'lost'
  tags: string[] | null
  ownerId: number
  createdAt: string
}

// 列表接口的 query 参数
export interface CustomerListParams {
  page?: number
  pageSize?: number
  keyword?: string
}

// 列表接口的返回结构（跟后端 c.json({ data, total, page, pageSize }) 对齐）
export interface CustomerListResponse {
  data: Customer[]
  total: number
  page: number
  pageSize: number
}

// =====================================================
// 接口函数
// =====================================================

/**
 * 获取客户列表（分页 + 搜索）
 * GET /api/customers
 *
 * axios 的 get 第二个参数 { params } 会被自动拼成 query string：
 *   { page: 1, pageSize: 10, keyword: '阿里' }
 *   → /api/customers?page=1&pageSize=10&keyword=阿里
 *
 * 注意：keyword 是空串时也会被传给后端，后端做了 trim 兼容；
 * 也可以在前端这边过滤掉空 keyword，少传一个参数更干净——我们选后者
 */
export async function getCustomerList(
  params: CustomerListParams,
): Promise<CustomerListResponse> {
  // 把空 keyword 过滤掉
  const query: Record<string, string | number> = {}
  if (params.page) query.page = params.page
  if (params.pageSize) query.pageSize = params.pageSize
  if (params.keyword && params.keyword.trim()) query.keyword = params.keyword.trim()

  const res = await request.get<CustomerListResponse>('/customers', { params: query })
  return res.data
}

/**
 * 获取客户详情
 * GET /api/customers/:id
 */
export async function getCustomerDetail(id: number): Promise<Customer> {
  const res = await request.get<Customer>(`/customers/${id}`)
  return res.data
}

// =====================================================
// D5 新增 / 编辑 / 删除
// =====================================================

// 新增 / 编辑共用的入参
// 注意没有 id / ownerId / createdAt —— 这些字段后端会自己处理
// Partial<...> 让所有字段都变可选（编辑接口本来就支持部分更新；新增接口也只要求 name 必填）
export type CustomerFormData = Partial<{
  name: string
  company: string | null
  level: 'A' | 'B' | 'C' | null
  industry: string | null
  source: string | null
  stage: 'lead' | 'contact' | 'qualified' | 'won' | 'lost'
  tags: string[] | null
}>

/**
 * 新增客户
 * POST /api/customers
 */
export async function createCustomer(data: CustomerFormData): Promise<Customer> {
  const res = await request.post<Customer>('/customers', data)
  return res.data
}

/**
 * 编辑客户（部分更新）
 * PUT /api/customers/:id
 */
export async function updateCustomer(
  id: number,
  data: CustomerFormData,
): Promise<Customer> {
  const res = await request.put<Customer>(`/customers/${id}`, data)
  return res.data
}

/**
 * 删除客户
 * DELETE /api/customers/:id
 */
export async function deleteCustomer(id: number): Promise<{ success: boolean }> {
  const res = await request.delete<{ success: boolean }>(`/customers/${id}`)
  return res.data
}
