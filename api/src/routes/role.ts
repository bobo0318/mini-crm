// 角色路由（D9 Phase 3）
//
// 业务约定：角色是"内置的"（admin / sales / viewer），不允许 admin 动态新建/删除角色
// 所以这里只有一个 GET 接口供前端展示

import { Hono } from 'hono'
import { asc } from 'drizzle-orm'

import { db } from '../db/client'
import { roles } from '../db/schema'
import { authMiddleware, type AuthEnv } from '../middlewares/auth'
import { permission } from '../middlewares/permission'

const role = new Hono<AuthEnv>()

role.use('*', authMiddleware)

// =====================================================
// GET /api/roles —— 列出所有角色
// =====================================================
// 权限：role:read（只有 admin 有这个权限码）
role.get('/', permission('role:read'), async (c) => {
  const data = db
    .select()
    .from(roles)
    .orderBy(asc(roles.id))  // 按 id 升序，跟 seed 时插入的顺序一致：admin / sales / viewer
    .all()
  return c.json({ data })
})

export default role
