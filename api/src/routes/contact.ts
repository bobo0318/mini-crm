// 联系人路由
// 注意 URL 设计：列表/新增走"嵌套资源"(/customers/:cid/contacts)，
// 编辑/删除走"扁平"(/contacts/:id)——这是 REST 的标准混合写法
//
// 但在 Hono 里我们把所有联系人接口集中挂在一个子路由对象里，
// 然后由 index.ts 用两个不同的前缀同时挂载：
//   app.route('/api', contactRoutes)
//
// 路由对象里直接写完整路径（/customers/:cid/contacts 和 /contacts/:id），
// 这样代码组织上一目了然——"联系人相关的接口全在这一个文件"
//
// 等于：Hono 子路由 + 完整路径声明 = 灵活的 URL 设计

import { Hono } from 'hono'
import { z } from 'zod'
import { desc, eq } from 'drizzle-orm'

import { db } from '../db/client'
import { contacts, customers } from '../db/schema'
import { authMiddleware, type AuthEnv } from '../middlewares/auth'
import { permission } from '../middlewares/permission'

const contact = new Hono<AuthEnv>()

// 所有联系人接口都要登录
contact.use('*', authMiddleware)

// =====================================================
// zod 校验
// =====================================================
//
// 新增：name 必填，其他可选
// is_primary 不让前端直接传 boolean，而是接受 boolean 后端转——用 z.boolean() 即可
const createSchema = z.object({
  name: z.string().min(1, { message: '联系人姓名不能为空' }),
  phone: z.string().optional(),
  email: z.string().email({ message: '邮箱格式不正确' }).optional().or(z.literal('')),
  position: z.string().optional(),
  isPrimary: z.boolean().optional(),
})

// 编辑：所有字段都可选（部分更新）
const updateSchema = createSchema.partial()

// =====================================================
// GET /api/customers/:cid/contacts —— 列表（某客户的所有联系人）
// =====================================================
contact.get('/customers/:cid/contacts', permission('contact:read'), async (c) => {
  const cid = Number(c.req.param('cid'))
  if (isNaN(cid)) {
    return c.json({ error: '客户 id 必须是数字' }, 400)
  }

  // 先确认客户存在（不然返一个空数组会有歧义——是没联系人还是客户都不存在？）
  const customerExists = await db.select().from(customers).where(eq(customers.id, cid)).get()
  if (!customerExists) {
    return c.json({ error: '客户不存在' }, 404)
  }

  // 取联系人，按 is_primary desc 排（主联系人排前面），再按 createdAt 倒序
  const data = await db
    .select()
    .from(contacts)
    .where(eq(contacts.customerId, cid))
    .orderBy(desc(contacts.isPrimary), desc(contacts.createdAt))
    .all()

  return c.json(data)
})

// =====================================================
// POST /api/customers/:cid/contacts —— 给某客户加联系人
// =====================================================
contact.post('/customers/:cid/contacts', permission('contact:create'), async (c) => {
  const cid = Number(c.req.param('cid'))
  if (isNaN(cid)) {
    return c.json({ error: '客户 id 必须是数字' }, 400)
  }

  const customerExists = await db.select().from(customers).where(eq(customers.id, cid)).get()
  if (!customerExists) {
    return c.json({ error: '客户不存在' }, 404)
  }

  const body = await c.req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message || '参数错误' }, 400)
  }

  // customer_id 从 URL 取，不从 body 取（防伪造）
  const newRow = await db
    .insert(contacts)
    .values({
      ...parsed.data,
      customerId: cid,
    })
    .returning()
    .get()

  return c.json(newRow, 201)
})

// =====================================================
// PUT /api/contacts/:id —— 编辑联系人
// =====================================================
// 这里用扁平路径 /contacts/:id（不是 /customers/:cid/contacts/:id）
// 因为联系人 id 全局唯一，URL 不需要再带客户 id
contact.put('/contacts/:id', permission('contact:update'), async (c) => {
  const id = Number(c.req.param('id'))
  if (isNaN(id)) {
    return c.json({ error: 'id 必须是数字' }, 400)
  }

  const body = await c.req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message || '参数错误' }, 400)
  }

  const existing = await db.select().from(contacts).where(eq(contacts.id, id)).get()
  if (!existing) {
    return c.json({ error: '联系人不存在' }, 404)
  }

  const updated = await db
    .update(contacts)
    .set(parsed.data)
    .where(eq(contacts.id, id))
    .returning()
    .get()

  return c.json(updated)
})

// =====================================================
// DELETE /api/contacts/:id —— 删除联系人
// =====================================================
contact.delete('/contacts/:id', permission('contact:delete'), async (c) => {
  const id = Number(c.req.param('id'))
  if (isNaN(id)) {
    return c.json({ error: 'id 必须是数字' }, 400)
  }

  const existing = await db.select().from(contacts).where(eq(contacts.id, id)).get()
  if (!existing) {
    return c.json({ error: '联系人不存在' }, 404)
  }

  await db.delete(contacts).where(eq(contacts.id, id)).run()
  return c.json({ success: true })
})

export default contact
