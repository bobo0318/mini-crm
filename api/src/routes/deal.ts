// 销售商机路由：CRUD 五件套
// 挂在 /api/deals 下，最终 URL：
//   GET    /api/deals             列表（默认排除 lost，可 ?stage=xxx 筛选）
//   GET    /api/deals/:id         详情
//   POST   /api/deals             新增
//   PUT    /api/deals/:id         编辑（拖拽改 stage 也走它）
//   DELETE /api/deals/:id         删除
//
// 设计要点：
// - 列表不分页：看板要一次看完所有卡片才能拖拽
// - 列表默认排除 stage='lost'：看板只看活的，想看丢失走 ?stage=lost
// - "标记丢失"不开独立接口：PUT { stage: 'lost' } 一行搞定

import { Hono } from 'hono'
import { z } from 'zod'
import { desc, eq, ne } from 'drizzle-orm'

import { db } from '../db/client'
import { deals } from '../db/schema'
import { authMiddleware, type AuthEnv } from '../middlewares/auth'

const deal = new Hono<AuthEnv>()

// 整个子路由都要登录
deal.use('*', authMiddleware)

// =====================================================
// zod 校验 schema
// =====================================================
//
// 新增：title 和 customerId 必填，其余可选
// owner_id 不让前端传（从 JWT 取）
//
// 注意 expectedCloseAt：前端传过来的会是 ISO 字符串（如 '2026-06-30T00:00:00.000Z'），
// 这里用 z.coerce.date() 让 zod 自动把字符串/时间戳转成 Date 对象，
// 再交给 drizzle，drizzle 看到 mode:'timestamp' 列就会再转成秒数存进去。
const createSchema = z.object({
  customerId: z.number().int().positive({ message: 'customerId 必须是正整数' }),
  title: z.string().min(1, { message: '商机标题不能为空' }),
  // amount / probability / expectedCloseAt 在 DB 都是 nullable
  // 用 .nullish() 让 zod 同时接受 undefined（字段缺失）和 null（前端编辑时清空字段）
  //   .optional() 只允许 undefined → 编辑时弹窗预填的 null 会被拒
  //   .nullable() 只允许 null → 新增时不传字段也会被拒
  //   .nullish() = .optional() + .nullable()，两种都行
  amount: z.number().nonnegative().nullish(),
  stage: z.enum(['lead', 'contact', 'quote', 'won', 'lost']).optional(),
  probability: z.number().int().min(0).max(100).nullish(),
  expectedCloseAt: z.coerce.date().nullish(),
})

// 编辑：所有字段都可选（PUT 部分更新）
// .partial() 一键把所有必填字段转可选
const updateSchema = createSchema.partial()

// =====================================================
// GET /api/deals —— 列表
// =====================================================
//
// Query 参数：
//   ?stage=lead          筛某个阶段（不传 = 看板视图，返回所有非 lost）
//
// 返回格式：{ data: Deal[] }
// 不分页：看板要一次看到所有卡片才能拖拽
deal.get('/', async (c) => {
  const stage = c.req.query('stage')?.trim()

  // 三种 where 情况：
  //   1. 传了 stage  →  where stage = ?
  //   2. 没传 stage  →  where stage != 'lost'  （看板视图）
  //
  // drizzle 的小知识点：
  //   - eq(列, 值)   =  列 = 值
  //   - ne(列, 值)   =  列 != 值
  //   - and(a, b)   组合多个条件
  let whereCondition
  if (stage) {
    whereCondition = eq(deals.stage, stage as 'lead' | 'contact' | 'quote' | 'won' | 'lost')
  } else {
    whereCondition = ne(deals.stage, 'lost')
  }

  const data = db
    .select()
    .from(deals)
    .where(whereCondition)
    .orderBy(desc(deals.createdAt))
    .all()

  return c.json({ data })
})

// =====================================================
// GET /api/deals/:id —— 详情
// =====================================================
deal.get('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  if (isNaN(id)) {
    return c.json({ error: 'id 必须是数字' }, 400)
  }

  const row = db.select().from(deals).where(eq(deals.id, id)).get()
  if (!row) {
    return c.json({ error: '商机不存在' }, 404)
  }

  return c.json(row)
})

// =====================================================
// POST /api/deals —— 新增
// =====================================================
deal.post('/', async (c) => {
  const body = await c.req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message || '参数错误' }, 400)
  }

  // owner_id 从 token 拿
  const { userId } = c.get('user')

  const newRow = db
    .insert(deals)
    .values({
      ...parsed.data,
      ownerId: userId,
      // stage、createdAt 没传 → 走 schema 默认（'lead' / 当前时间）
    })
    .returning()
    .get()

  return c.json(newRow, 201)
})

// =====================================================
// PUT /api/deals/:id —— 编辑（部分更新）
// =====================================================
// 拖拽看板改 stage 也走这个接口，前端只传 { stage: 'xxx' }
// "标记丢失" 同理：前端传 { stage: 'lost' }
deal.put('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  if (isNaN(id)) {
    return c.json({ error: 'id 必须是数字' }, 400)
  }

  const body = await c.req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message || '参数错误' }, 400)
  }

  const existing = db.select().from(deals).where(eq(deals.id, id)).get()
  if (!existing) {
    return c.json({ error: '商机不存在' }, 404)
  }

  const updated = db
    .update(deals)
    .set(parsed.data)
    .where(eq(deals.id, id))
    .returning()
    .get()

  return c.json(updated)
})

// =====================================================
// DELETE /api/deals/:id —— 删除
// =====================================================
deal.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  if (isNaN(id)) {
    return c.json({ error: 'id 必须是数字' }, 400)
  }

  const existing = db.select().from(deals).where(eq(deals.id, id)).get()
  if (!existing) {
    return c.json({ error: '商机不存在' }, 404)
  }

  db.delete(deals).where(eq(deals.id, id)).run()

  return c.json({ success: true })
})

export default deal
