// 用户管理接口（D9 Phase 3）—— admin only
// 对应后端 /api/users/*

import request from '@/utils/request'

// =====================================================
// 类型定义
// =====================================================
//
// AdminUserRow：管理后台列表用的用户行结构
// 跟 stores/user.ts 的 UserInfo 不一样 —— 那个是"当前登录用户"，包含 permissions[]；
// 这个是"列表里某条用户记录"，只需要展示用的基本字段 + roleName 给 tag 染色
export interface AdminUserRow {
  id: number
  email: string
  name: string | null
  roleId: number | null
  roleName: 'admin' | 'sales' | 'viewer' | null
  createdAt: string
}

export interface UserListResponse {
  data: AdminUserRow[]
}

// 新增用户的入参
// password 必填；roleId 必填（admin 后台不允许"无角色"用户）
export interface CreateUserParams {
  email: string
  password: string
  name?: string
  roleId: number
}

// 编辑用户的入参 —— 所有字段可选
// password 为空串时表示"不改密码"（后端会跳过 hash + update）
export type UpdateUserParams = Partial<{
  email: string
  password: string
  name: string
  roleId: number
}>

// =====================================================
// 接口函数
// =====================================================

export async function getUserList(): Promise<UserListResponse> {
  const res = await request.get<UserListResponse>('/users')
  return res.data
}

export async function createUser(data: CreateUserParams): Promise<AdminUserRow> {
  const res = await request.post<AdminUserRow>('/users', data)
  return res.data
}

export async function updateUser(
  id: number,
  data: UpdateUserParams,
): Promise<AdminUserRow> {
  const res = await request.put<AdminUserRow>(`/users/${id}`, data)
  return res.data
}

export async function deleteUser(id: number): Promise<{ success: boolean }> {
  const res = await request.delete<{ success: boolean }>(`/users/${id}`)
  return res.data
}
