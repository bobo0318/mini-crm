// 用户管理路由（D9 Phase 3）—— admin only
//
// 五个接口：
//   GET    /api/users        列表（join roles 一次返回 + 不带 password_hash）
//   POST   /api/users        新增（必填 email/password/role_id）
//   PUT    /api/users/:id    编辑（password 可空 = 不改密码）
//   DELETE /api/users/:id    删除（⭐ 不能删自己 —— 防止 admin 锁死系统）
//
// 不开 GET /api/users/:id 详情接口：列表已经返回了所有需要的字段，编辑弹窗直接用列表数据

import { Hono } from 'hono'
import { z } from 'zod'
import { desc, eq } from 'drizzle-orm'

import { db } from '../db/client'
import { users, roles } from '../db/schema'
import { authMiddleware, type AuthEnv } from '../middlewares/auth'
import { permission } from '../middlewares/permission'
import { hashPassword } from '../utils/password'

const user = new Hono<AuthEnv>()

user.use('*', authMiddleware)

// =====================================================
// zod 校验
// =====================================================
const createSchema = z.object({
  email: z.email({ message: '邮箱格式不正确' }),
  password: z.string().min(6, { message: '密码至少 6 位' }),
  name: z.string().optional(),
  roleId: z.number().int().positive({ message: '请选择角色' }),
})

// 编辑：所有字段可选；password 空字符串 = 不改密码
// 注意：updateSchema 不是简单 createSchema.partial()，因为 password 的"空字符串"语义特殊
const updateSchema = z.object({
  email: z.email({ message: '邮箱格式不正确' }).optional(),
  // 长度校验：要么不传，要么传空串（= 不改），要么传至少 6 位
  // 用 union 表达"空串 OR 至少 6 位"
  password: z
    .union([
      z.literal(''),
      z.string().min(6, { message: '密码至少 6 位' }),
    ])
    .optional(),
  name: z.string().optional(),
  roleId: z.number().int().positive().optional(),
})

// =====================================================
// GET /api/users —— 列表
// =====================================================
// 一次查 user + 关联的 role，前端拿到的数据"用户名 + 角色名"都有了，不用再调 /api/roles join
user.get('/', permission('user:read'), async (c) => {
  // leftJoin：即使某个 user 的 role_id 是 null 也能返回（理论上不该有，但保险）
  const rows = db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      roleId: users.roleId,
      roleName: roles.name,
      createdAt: users.createdAt,
    })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .orderBy(desc(users.createdAt))
    .all()

  return c.json({ data: rows })
})

// =====================================================
// POST /api/users —— 新增
// =====================================================
user.post('/', permission('user:create'), async (c) => {
  const body = await c.req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message || '参数错误' }, 400)
  }
  const { email, password, name, roleId } = parsed.data

  // email 唯一性
  const existing = db.select().from(users).where(eq(users.email, email)).get()
  if (existing) {
    return c.json({ error: '该邮箱已被注册' }, 409)
  }

  // 角色必须存在
  const roleExists = db.select().from(roles).where(eq(roles.id, roleId)).get()
  if (!roleExists) {
    return c.json({ error: '所选角色不存在' }, 400)
  }

  const passwordHash = await hashPassword(password)

  const newUser = db
    .insert(users)
    .values({
      email,
      passwordHash,
      name: name || email.split('@')[0],
      roleId,
    })
    .returning()
    .get()

  // ⚠️ 永远不返回 password_hash
  return c.json(
    {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      roleId: newUser.roleId,
    },
    201,
  )
})

// =====================================================
// PUT /api/users/:id —— 编辑
// =====================================================
user.put('/:id', permission('user:update'), async (c) => {
  const id = Number(c.req.param('id'))
  if (isNaN(id)) return c.json({ error: 'id 必须是数字' }, 400)

  const body = await c.req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message || '参数错误' }, 400)
  }

  const existing = db.select().from(users).where(eq(users.id, id)).get()
  if (!existing) {
    return c.json({ error: '用户不存在' }, 404)
  }

  // ⭐ 自锁防御：不能改自己的角色
  // 避免 admin 把自己改成 sales/viewer，重新登录后再也回不来 admin → 系统锁死
  // 改自己的邮箱/密码/姓名都允许，唯独 roleId 不能改自己的
  const { userId } = c.get('user')
  if (id === userId && parsed.data.roleId && parsed.data.roleId !== existing.roleId) {
    return c.json({ error: '不能修改自己的角色' }, 400)
  }

  // 改 email 时检查唯一性（排除自己）
  if (parsed.data.email && parsed.data.email !== existing.email) {
    const conflict = db
      .select()
      .from(users)
      .where(eq(users.email, parsed.data.email))
      .get()
    if (conflict) {
      return c.json({ error: '该邮箱已被注册' }, 409)
    }
  }

  // 改 role_id 时校验角色存在
  if (parsed.data.roleId) {
    const roleExists = db.select().from(roles).where(eq(roles.id, parsed.data.roleId)).get()
    if (!roleExists) {
      return c.json({ error: '所选角色不存在' }, 400)
    }
  }

  // 组装更新数据：password 单独处理（空串 = 不改密码）
  const updates: Partial<typeof existing> = {}
  if (parsed.data.email) updates.email = parsed.data.email
  if (parsed.data.name !== undefined) updates.name = parsed.data.name
  if (parsed.data.roleId) updates.roleId = parsed.data.roleId
  if (parsed.data.password && parsed.data.password.length > 0) {
    updates.passwordHash = await hashPassword(parsed.data.password)
  }

  const updated = db.update(users).set(updates).where(eq(users.id, id)).returning().get()

  return c.json({
    id: updated.id,
    email: updated.email,
    name: updated.name,
    roleId: updated.roleId,
  })
})

// =====================================================
// DELETE /api/users/:id —— 删除
// =====================================================
// ⭐ 关键边界：不能删除当前登录用户自己
// 防止 admin 不小心点了自己的删除按钮，把整个系统的最后一个 admin 删了 → 锁死无人可登
user.delete('/:id', permission('user:delete'), async (c) => {
  const id = Number(c.req.param('id'))
  if (isNaN(id)) return c.json({ error: 'id 必须是数字' }, 400)

  const { userId } = c.get('user')
  if (id === userId) {
    return c.json({ error: '不能删除自己' }, 400)
  }

  const existing = db.select().from(users).where(eq(users.id, id)).get()
  if (!existing) {
    return c.json({ error: '用户不存在' }, 404)
  }

  db.delete(users).where(eq(users.id, id)).run()
  return c.json({ success: true })
})

export default user
