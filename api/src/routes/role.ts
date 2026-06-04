// 角色路由（D9 Phase 3，D12+ 扩展）
//
// D9：内置 3 角色（admin/sales/viewer），只有 GET 一个接口
// D12+：支持自定义角色，加 POST/PUT/DELETE，type=system 的内置 3 个不可改不可删

import { Hono } from 'hono'
import { asc, eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '../db/client'
import { roles, users } from '../db/schema'
import { authMiddleware, type AuthEnv } from '../middlewares/auth'
import { permission } from '../middlewares/permission'
import { findInvalidPermissions } from '../data/permission-tree'

const role = new Hono<AuthEnv>()

role.use('*', authMiddleware)

// =====================================================
// GET /api/roles —— 列出所有角色（带 type）
// =====================================================
role.get('/', permission('role:read'), async (c) => {
  const data = await db
    .select()
    .from(roles)
    .orderBy(asc(roles.id)) // 按 id 升序，跟 seed 时插入的顺序一致：admin / sales / viewer 然后是自定义
    .all()
  return c.json({ data })
})

// =====================================================
// 输入校验
// =====================================================
//
// name：1-50 字符，自定义角色名（前端会用）
// description：可选描述
// permissions：权限码字符串数组（提交前由前端从 a-tree 提取叶子节点）
const createRoleSchema = z.object({
  name: z.string().min(1, { message: '角色名不能为空' }).max(50, { message: '角色名最多 50 字' }),
  description: z.string().max(200).optional().default(''),
  permissions: z.array(z.string()).default([]),
})

const updateRoleSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(200).optional(),
  permissions: z.array(z.string()).optional(),
})

// =====================================================
// POST /api/roles —— 新增自定义角色
// =====================================================
// 权限：role:create
//
// 创建出来的角色 type 一律为 'custom'（前端不能传 type 来覆盖）
// permissions 必须在 custom 允许范围内（excludes user:create/delete + role:*）
role.post('/', permission('role:create'), async (c) => {
  const body = await c.req.json()
  const parsed = createRoleSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message || '参数错误' }, 400)
  }
  const { name, description, permissions } = parsed.data

  // 校验权限码越界（防绕过前端直接发越界请求）
  const invalid = findInvalidPermissions(permissions, 'custom')
  if (invalid.length > 0) {
    return c.json(
      { error: `自定义角色不允许包含这些系统级权限：${invalid.join(', ')}` },
      400,
    )
  }

  // 角色名唯一性检查（含 system 角色的 name 也不能撞）
  const existing = await db.select().from(roles).where(eq(roles.name, name)).get()
  if (existing) {
    return c.json({ error: '该角色名已存在' }, 409)
  }

  const newRole = await db
    .insert(roles)
    .values({
      name,
      type: 'custom', // ⭐ 永远是 custom，无视前端传啥
      description,
      permissions,
    })
    .returning()
    .get()

  return c.json({ data: newRole })
})

// =====================================================
// PUT /api/roles/:id —— 编辑自定义角色
// =====================================================
// 权限：role:update
//
// 拦截：type='system' 的角色（admin/sales/viewer 内置 3 个）不可改
role.put('/:id', permission('role:update'), async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id) || id <= 0) {
    return c.json({ error: 'id 参数错误' }, 400)
  }

  const existing = await db.select().from(roles).where(eq(roles.id, id)).get()
  if (!existing) {
    return c.json({ error: '角色不存在' }, 404)
  }
  if (existing.type === 'system') {
    return c.json({ error: '内置角色不可修改' }, 403)
  }

  const body = await c.req.json()
  const parsed = updateRoleSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message || '参数错误' }, 400)
  }
  const updates = parsed.data

  // 权限码越界校验（custom 类型）
  if (updates.permissions) {
    const invalid = findInvalidPermissions(updates.permissions, 'custom')
    if (invalid.length > 0) {
      return c.json(
        { error: `自定义角色不允许包含这些系统级权限：${invalid.join(', ')}` },
        400,
      )
    }
  }

  // 改名时唯一性检查（排除自己）
  if (updates.name && updates.name !== existing.name) {
    const dup = await db.select().from(roles).where(eq(roles.name, updates.name)).get()
    if (dup) {
      return c.json({ error: '该角色名已存在' }, 409)
    }
  }

  const updated = await db
    .update(roles)
    .set(updates)
    .where(eq(roles.id, id))
    .returning()
    .get()

  return c.json({ data: updated })
})

// =====================================================
// DELETE /api/roles/:id —— 删除自定义角色
// =====================================================
// 权限：role:delete
//
// 拦截：
//   1. type='system' 的角色不可删
//   2. 仍有 user 引用该角色时不可删（避免外键悬挂；让 admin 先把这些 user 改到别的角色）
role.delete('/:id', permission('role:delete'), async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id) || id <= 0) {
    return c.json({ error: 'id 参数错误' }, 400)
  }

  const existing = await db.select().from(roles).where(eq(roles.id, id)).get()
  if (!existing) {
    return c.json({ error: '角色不存在' }, 404)
  }
  if (existing.type === 'system') {
    return c.json({ error: '内置角色不可删除' }, 403)
  }

  // 检查是否还有 user 在用这个 role
  const inUse = await db.select().from(users).where(eq(users.roleId, id)).get()
  if (inUse) {
    return c.json(
      { error: '该角色仍有用户引用，请先将这些用户改到其他角色再删除' },
      409,
    )
  }

  await db.delete(roles).where(eq(roles.id, id)).run()
  return c.json({ ok: true })
})

export default role
