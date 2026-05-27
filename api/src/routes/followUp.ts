// 跟进记录路由
//
// 业务约定：跟进记录"追加 only"——只能新增和查询，不能编辑/删除
// 所以这里只有 GET（列表）+ POST（新增），没有 PUT/DELETE
//
// URL 设计：跟联系人一样，列表/新增走嵌套 /customers/:cid/follow-ups
// 注意 URL 里用连字符 follow-ups 而不是下划线 follow_ups
// —— REST 惯例：URL 里所有单词分隔用连字符（kebab-case），DB 字段用下划线（snake_case）

import { Hono } from 'hono'
import { z } from 'zod'
import { desc, eq } from 'drizzle-orm'

import { db } from '../db/client'
import { customers, followUps } from '../db/schema'
import { authMiddleware, type AuthEnv } from '../middlewares/auth'

const followUp = new Hono<AuthEnv>()

followUp.use('*', authMiddleware)

// =====================================================
// zod 校验
// =====================================================
//
// 新增跟进的字段：type / content 必填，nextAt 可空
// nextAt：前端传 ISO 字符串，后端转 Date 存
// 用 z.coerce.date() 让 zod 自动把字符串 → Date
const createSchema = z.object({
  type: z.enum(['call', 'visit', 'email', 'wechat'], {
    message: '跟进方式只能是 call / visit / email / wechat',
  }),
  content: z.string().min(1, { message: '跟进内容不能为空' }),
  nextAt: z.coerce.date().optional().nullable(),
})

// =====================================================
// GET /api/customers/:cid/follow-ups —— 列表
// =====================================================
followUp.get('/customers/:cid/follow-ups', async (c) => {
  const cid = Number(c.req.param('cid'))
  if (isNaN(cid)) {
    return c.json({ error: '客户 id 必须是数字' }, 400)
  }

  const customerExists = db.select().from(customers).where(eq(customers.id, cid)).get()
  if (!customerExists) {
    return c.json({ error: '客户不存在' }, 404)
  }

  // 按 createdAt 倒序（最新的跟进排在最前面）
  // 时间线 UI 通常就是这个顺序
  const data = db
    .select()
    .from(followUps)
    .where(eq(followUps.customerId, cid))
    .orderBy(desc(followUps.createdAt))
    .all()

  return c.json(data)
})

// =====================================================
// POST /api/customers/:cid/follow-ups —— 新增跟进记录
// =====================================================
followUp.post('/customers/:cid/follow-ups', async (c) => {
  const cid = Number(c.req.param('cid'))
  if (isNaN(cid)) {
    return c.json({ error: '客户 id 必须是数字' }, 400)
  }

  const customerExists = db.select().from(customers).where(eq(customers.id, cid)).get()
  if (!customerExists) {
    return c.json({ error: '客户不存在' }, 404)
  }

  const body = await c.req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message || '参数错误' }, 400)
  }

  // user_id 从 JWT 取，前端不传（防伪造，跟客户的 owner_id 同思路）
  const { userId } = c.get('user')

  const newRow = db
    .insert(followUps)
    .values({
      ...parsed.data,
      customerId: cid,
      userId,
    })
    .returning()
    .get()

  return c.json(newRow, 201)
})

export default followUp
