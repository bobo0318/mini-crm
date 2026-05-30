// "我是谁" 接口：GET /api/me
// 必须带有效 token 才能访问，返回当前登录用户的信息

import { Hono } from 'hono'
import { eq } from 'drizzle-orm'

import { db } from '../db/client'
import { users } from '../db/schema'
import { authMiddleware, type AuthEnv } from '../middlewares/auth'

// new Hono<AuthEnv>() —— 把 authMiddleware 里定义的类型环境传进来
// 这样下面 c.get('user') 才能正确推导出 JwtPayload 类型（而不是 any）
const me = new Hono<AuthEnv>()

// 在这个子路由上挂中间件：me.use('*', authMiddleware) 表示子路由下所有路径都先过中间件
// 由于这个子路由只有一个 GET '/'，效果就是 /api/me 必须登录才能访问
me.use('*', authMiddleware)

me.get('/', async (c) => {
  // 中间件里塞进去的两份数据：JWT 解码的 user + db 查到的 role
  const payload = c.get('user')
  const role = c.get('role')

  // 用 userId 查数据库，拿最新的用户信息
  const user = db.select().from(users).where(eq(users.id, payload.userId)).get()

  // 极少数情况：token 还有效，但用户被管理员删了 → 返 401 让前端跳登录
  if (!user) {
    return c.json({ error: '用户不存在' }, 401)
  }

  // D9：除了基本信息，把当前角色 + 权限码列表也返给前端
  // 前端会拿 permissions 给 v-auth 指令做按钮级权限判断
  return c.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: role.name,               // 'admin' | 'sales' | 'viewer'
    permissions: role.permissions, // 权限码数组
  })
})

export default me
