// 权限检查中间件（D9 新增）
//
// 用法：
//   customers.delete('/:id', permission('customer:delete'), async (c) => { ... })
//   或：
//   customers.delete('/:id', permission(['customer:delete', 'admin:override']), ...)
//
// 前置：authMiddleware 必须先跑过（permission 依赖 c.get('role')）
//
// 行为：当前角色的 permissions 列表里"任一权限码命中即通过"（OR）
//      要 AND 关系？嵌套两次中间件就行：
//        .use(permission('a')).use(permission('b'))

import type { MiddlewareHandler } from 'hono'
import type { AuthEnv } from './auth'

export function permission(
  perm: string | string[],
): MiddlewareHandler<AuthEnv> {
  // 接受单 string 或数组，统一成数组
  const required = Array.isArray(perm) ? perm : [perm]

  return async (c, next) => {
    const role = c.get('role')

    // 任一权限码命中即可
    const ok = required.some((p) => role.permissions.includes(p))

    if (!ok) {
      // 403 Forbidden = 已登录但权限不足
      // 区别于 401 Unauthorized（没登录或登录失效）
      // 前端拦截器要区分：401 跳登录页，403 弹"权限不足"提示
      return c.json(
        {
          error: `权限不足：需要 ${required.join(' 或 ')}（当前角色：${role.name}）`,
        },
        403,
      )
    }

    await next()
  }
}
