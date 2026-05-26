// JWT 鉴权中间件
// 把这个中间件挂在哪条路由上，那条路由就要求"必须带有效 token 才能访问"

import type { MiddlewareHandler } from 'hono'
import { verifyToken, type JwtPayload } from '../utils/jwt'

// =====================================================
// 类型扩展：让 c.set('user', ...) / c.get('user') 有正确类型
// =====================================================
//
// Hono 用泛型描述 Context 上挂了什么变量。
// 凡是要使用 c.get('user') 的子路由，都要 new Hono<AuthEnv>()，
// 这样 TS 能推导出 c.get('user') 返回 JwtPayload（不再是 any）
export type AuthEnv = {
  Variables: {
    user: JwtPayload
  }
}

// =====================================================
// 中间件本体
// =====================================================
// MiddlewareHandler 是 Hono 提供的中间件函数类型，签名就是 (c, next) => any
// 加上 <AuthEnv> 泛型，c.set('user', ...) 的类型才正确
export const authMiddleware: MiddlewareHandler<AuthEnv> = async (c, next) => {
  // 1. 从请求头取 Authorization
  //    标准格式："Bearer eyJhbGciOiJI..."
  const authHeader = c.req.header('Authorization')

  // 2. 没传 / 格式不对 → 401
  //    注意状态码：401 = "你没登录"（让前端跳登录页）
  //             403 = "你登录了，但没权限"（D9 权限检查时用）
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: '未登录或 token 格式错误' }, 401)
  }

  // 3. 切掉前面的 "Bearer "（共 7 个字符），剩下的就是纯 token
  const token = authHeader.slice(7)

  // 4. 校验 token（utils/jwt.ts 里写过：失败返 null）
  const payload = verifyToken(token)
  if (!payload) {
    return c.json({ error: 'token 无效或已过期' }, 401)
  }

  // 5. 通过！把解出的用户信息挂到 c 上，方便下游 handler 用
  //    比如 routes/me.ts 里就直接 const user = c.get('user') 拿到 { userId, email }
  c.set('user', payload)

  // 6. 放行：让请求继续往下走（进入真正的业务 handler）
  //    await 是因为 next() 返回 Promise，等它结束才算这个中间件完成
  await next()
}
