// 角色管理接口（D9 Phase 3）
// 对应后端 /api/roles
//
// 业务上角色是内置的，只有 GET 一个接口

import request from '@/utils/request'

// =====================================================
// 类型定义
// =====================================================
export interface Role {
  id: number
  name: 'admin' | 'sales' | 'viewer'
  description: string
  permissions: string[]
  createdAt: string
}

export interface RoleListResponse {
  data: Role[]
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
