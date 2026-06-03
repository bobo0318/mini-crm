// JWT 鉴权中间件
// 把这个中间件挂在哪条路由上，那条路由就要求"必须带有效 token 才能访问"
//
// D9 增强：解完 JWT 后顺手查一次 db，把用户的 role 信息（含权限码列表）也挂到 c 上
//          这样 permission 中间件直接读 c.get('role') 即可，不用每个接口再查一次

import type { MiddlewareHandler } from 'hono'
import { eq } from 'drizzle-orm'

import { db } from '../db/client'
import { users, roles } from '../db/schema'
import { verifyToken, type JwtPayload } from '../utils/jwt'

// =====================================================
// 类型扩展
// =====================================================
//
// c 上现在挂两个变量：
//   user —— JWT 解码出来的轻量信息（userId, email）
//   role —— 从 db 查的角色信息（含权限码列表，给 permission 中间件用）
//
// 为啥不合并到一个变量？职责分离 —— user 来源是 JWT，role 来源是 db 查询，两个东西的生命周期不同
export type RoleContext = {
  id: number
  name: 'admin' | 'sales' | 'viewer'
  permissions: string[]
}

export type AuthEnv = {
  Variables: {
    user: JwtPayload
    role: RoleContext
  }
}

// =====================================================
// 中间件本体
// =====================================================
export const authMiddleware: MiddlewareHandler<AuthEnv> = async (c, next) => {
  // 1. 取 Authorization 头
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: '未登录或 token 格式错误' }, 401)
  }

  // 2. 切掉 "Bearer "，剩下就是纯 token
  const token = authHeader.slice(7)

  // 3. 校验 token
  //    迁 CF Workers：verifyToken 现在是 async（用 Web Crypto 异步签名验证），所以要 await
  const payload = await verifyToken(token)
  if (!payload) {
    return c.json({ error: 'token 无效或已过期' }, 401)
  }

  // 4. D9 新增：查 user + role 一次
  //    leftJoin —— roles 表可能为空（role_id 是 nullable），但我们后面会兜底
  //    .get() 返回单行（或 undefined）
  const row = await db
    .select({
      roleId: users.roleId,
      roleName: roles.name,
      rolePermissions: roles.permissions,
    })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.id, payload.userId))
    .get()

  // 5. 兜底：用户被删了 / 角色字段空了 → 视为登录失效
  //    这种异常情况返 401 让前端跳登录页（让用户重新认证）
  if (!row || !row.roleId || !row.roleName || !row.rolePermissions) {
    return c.json({ error: '用户角色信息不全，请重新登录' }, 401)
  }

  // 6. 挂到 c 上，下游 handler 和 permission 中间件直接用
  c.set('user', payload)
  c.set('role', {
    id: row.roleId,
    name: row.roleName,
    // SQLite 的 JSON 列读出来是 unknown 类型，断言为 string[]
    permissions: row.rolePermissions as string[],
  })

  await next()
}
