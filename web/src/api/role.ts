// 角色管理接口（D9 Phase 3，D12+ 扩展支持自定义角色 CRUD）
// 对应后端 /api/roles

import request from '@/utils/request'

// =====================================================
// 类型定义
// =====================================================
export interface Role {
  id: number
  // D12+：放宽到 string，因为自定义角色 name 是用户输入的
  name: string
  // D12+ 新增：'system' = 内置三个 / 'custom' = 用户自建
  type: 'system' | 'custom'
  description: string
  permissions: string[]
  createdAt: string
}

export interface RoleListResponse {
  data: Role[]
}

// 新增角色入参
export interface CreateRoleParams {
  name: string
  description?: string
  permissions: string[]
}

// 编辑角色入参（所有字段可选）
export interface UpdateRoleParams {
  name?: string
  description?: string
  permissions?: string[]
}

// =====================================================
// 接口函数
// =====================================================

/**
 * 获取角色列表
 * GET /api/roles
 * 权限：role:read（admin only）
 */
export async function getRoleList(): Promise<RoleListResponse> {
  const res = await request.get<RoleListResponse>('/roles')
  return res.data
}

/**
 * 新增自定义角色
 * POST /api/roles
 * 权限：role:create
 */
export async function createRole(params: CreateRoleParams): Promise<{ data: Role }> {
  const res = await request.post<{ data: Role }>('/roles', params)
  return res.data
}

/**
 * 编辑自定义角色（内置 system 角色返 403）
 * PUT /api/roles/:id
 * 权限：role:update
 */
export async function updateRole(id: number, params: UpdateRoleParams): Promise<{ data: Role }> {
  const res = await request.put<{ data: Role }>(`/roles/${id}`, params)
  return res.data
}

/**
 * 删除自定义角色（内置 system 角色 / 仍有用户引用，都返 4xx）
 * DELETE /api/roles/:id
 * 权限：role:delete
 */
export async function deleteRole(id: number): Promise<void> {
  await request.delete(`/roles/${id}`)
}
