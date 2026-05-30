// 客户管理路由：CRUD 五件套
// 挂在 /api/customers 下，最终 URL：
//   GET    /api/customers           列表（分页 + 搜索）
//   GET    /api/customers/:id       详情
//   POST   /api/customers           新增
//   PUT    /api/customers/:id       编辑（部分更新）
//   DELETE /api/customers/:id       删除

import { Hono } from 'hono'
import { z } from 'zod'
import { desc, eq, like, or, sql } from 'drizzle-orm'

import { db } from '../db/client'
import { customers, contacts, followUps, deals } from '../db/schema'
import { authMiddleware, type AuthEnv } from '../middlewares/auth'
import { permission } from '../middlewares/permission'

// 子路由：泛型 <AuthEnv> 让 c.get('user') 能拿到 JwtPayload 的类型
const customer = new Hono<AuthEnv>()

// 整个子路由都要登录才能访问（中间件挂在 '*'，对所有路径生效）
customer.use('*', authMiddleware)

// =====================================================
// zod 校验 schema
// =====================================================
//
// 新增时用的 schema：name 必填，其他都可选
// owner_id 不让前端传，从 token 里取，所以这里不写
const createSchema = z.object({
  name: z.string().min(1, { message: '客户姓名不能为空' }),
  company: z.string().optional(),
  level: z.enum(['A', 'B', 'C']).optional(),
  industry: z.string().optional(),
  source: z.string().optional(),
  stage: z.enum(['lead', 'contact', 'qualified', 'won', 'lost']).optional(),
  tags: z.array(z.string()).optional(),
})

// 编辑时用的 schema：所有字段都可选（PUT 部分更新）
// .partial() 是 zod 提供的一键转换：所有必填字段变可选
const updateSchema = createSchema.partial()

// =====================================================
// GET /api/customers —— 列表（分页 + 搜索）
// =====================================================
//
// 前端传的查询参数（Query String）：
//   ?page=1&pageSize=10&keyword=xxx
//
// 返回格式（前端表格通用约定）：
//   { data: [...], total: 42, page: 1, pageSize: 10 }
//
// D9：permission('customer:read') 卡权限（viewer 也有 read，能进；没 read 的人接口直接 403）
customer.get('/', permission('customer:read'), async (c) => {
  // 1. 解析 query string
  //    c.req.query('page') 拿到的是 string | undefined
  //    用 Number(...) 转成数字；|| 在前一个值为 0/NaN/'' 时也会回退到默认值，刚好我们要的就是这个
  const page = Number(c.req.query('page')) || 1
  const pageSize = Number(c.req.query('pageSize')) || 10
  const keyword = c.req.query('keyword')?.trim() || ''

  // 2. 拼 where 条件
  //    如果有关键字 → 搜 name 或 company（模糊匹配）
  //    没关键字 → 不加任何条件
  //
  //    drizzle 的小技巧：where(undefined) 等价于"不加 where 条件"，
  //    所以我们用一个变量装条件，没条件就给 undefined
  const whereCondition = keyword
    ? or(
        like(customers.name, `%${keyword}%`),
        like(customers.company, `%${keyword}%`),
      )
    : undefined

  // 3. 先查总数（分页器要用）
  //    drizzle 没有现成的 count 函数（高版本有，但写法约定俗成是用 sql 模板）
  //    sql<number>`count(*)` —— 模板字符串告诉 drizzle 用原生 SQL 片段，泛型告诉 TS 这是个 number
  const totalRow = await db
    .select({ count: sql<number>`count(*)` })
    .from(customers)
    .where(whereCondition)
    .get()
  const total = totalRow?.count ?? 0

  // 4. 再查当前页数据
  //    .orderBy(desc(...)) —— 按创建时间倒序，最新创建的排最前
  //    .limit(pageSize)    —— 一页最多多少条
  //    .offset((page-1)*pageSize) —— 跳过前面 N 条
  const data = await db
    .select()
    .from(customers)
    .where(whereCondition)
    .orderBy(desc(customers.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize)
    .all()

  return c.json({ data, total, page, pageSize })
})

// =====================================================
// GET /api/customers/:id —— 详情
// =====================================================
customer.get('/:id', permission('customer:read'), async (c) => {
  // 路径参数都是 string，要手动转 number
  const id = Number(c.req.param('id'))

  // 防呆：前端如果传了非数字（比如 /api/customers/abc），早返回 400
  if (isNaN(id)) {
    return c.json({ error: 'id 必须是数字' }, 400)
  }

  const row = await db.select().from(customers).where(eq(customers.id, id)).get()

  if (!row) {
    return c.json({ error: '客户不存在' }, 404)
  }

  return c.json(row)
})

// =====================================================
// POST /api/customers —— 新增
// =====================================================
customer.post('/', permission('customer:create'), async (c) => {
  // 1. 拿请求体并 zod 校验
  const body = await c.req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message || '参数错误' }, 400)
  }

  // 2. owner_id 从 token 里取，前端不能伪造
  //    authMiddleware 已经把 JwtPayload 挂到了 c 上，这里直接取
  const { userId } = c.get('user')

  // 3. 插入并把新行返回回来
  const newRow = await db
    .insert(customers)
    .values({
      ...parsed.data,
      ownerId: userId,
      // stage、createdAt 没传会走 schema 里的 default（'lead' / 当前时间）
    })
    .returning()
    .get()

  // 4. 201 Created 是"创建成功"的标准状态码
  return c.json(newRow, 201)
})

// =====================================================
// PUT /api/customers/:id —— 编辑（部分更新）
// =====================================================
// D9：
//   - permission 卡权限码（admin / sales 有，viewer 没有）
//   - 数据权限：sales 只能改 ownerId === 自己的客户，admin 全开
customer.put('/:id', permission('customer:update'), async (c) => {
  const id = Number(c.req.param('id'))
  if (isNaN(id)) {
    return c.json({ error: 'id 必须是数字' }, 400)
  }

  const body = await c.req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message || '参数错误' }, 400)
  }

  // 先查一下存不存在，存在才更新（不然 update 返回空更新条数，前端不好判断）
  const existing = await db.select().from(customers).where(eq(customers.id, id)).get()
  if (!existing) {
    return c.json({ error: '客户不存在' }, 404)
  }

  // ⭐ 数据权限：非 admin 角色，只能改自己 ownerId 的客户
  // admin 跳过此检查（能改所有人的）
  const role = c.get('role')
  const { userId } = c.get('user')
  if (role.name !== 'admin' && existing.ownerId !== userId) {
    return c.json({ error: '只能编辑自己负责的客户' }, 403)
  }

  // 更新并返回最新行
  // 注意：parsed.data 可能是个空对象（用户什么都没传），drizzle 不会报错，相当于啥也没改
  const updated = await db
    .update(customers)
    .set(parsed.data)
    .where(eq(customers.id, id))
    .returning()
    .get()

  return c.json(updated)
})

// =====================================================
// DELETE /api/customers/:id —— 删除
// =====================================================
// D9：只有 admin 有 customer:delete 权限码，sales/viewer 直接 403
// 所以这里不用再做 ownerId 检查（admin 能删任何客户）
customer.delete('/:id', permission('customer:delete'), async (c) => {
  const id = Number(c.req.param('id'))
  if (isNaN(id)) {
    return c.json({ error: 'id 必须是数字' }, 400)
  }

  // 同样：先校验存在性，再删
  const existing = await db.select().from(customers).where(eq(customers.id, id)).get()
  if (!existing) {
    return c.json({ error: '客户不存在' }, 404)
  }

  // ⭐ D12：libsql 默认强制 FK 约束（比 better-sqlite3 严格），
  //    客户被 contacts / followUps / deals 三张表引用，直接删客户会 FOREIGN KEY constraint failed
  //    用事务级联删：4 张表的删除一起成功或一起回滚，避免删一半留脏数据
  //
  //    顺序：先删"引用方"（被外键指向的孩子），再删客户本身
  await db.transaction(async (tx) => {
    await tx.delete(followUps).where(eq(followUps.customerId, id)).run()
    await tx.delete(contacts).where(eq(contacts.customerId, id)).run()
    await tx.delete(deals).where(eq(deals.customerId, id)).run()
    await tx.delete(customers).where(eq(customers.id, id)).run()
  })

  // 删除成功通常返 { success: true } 或 204 No Content
  // 我们返 200 + JSON，前端处理统一一些
  return c.json({ success: true })
})

export default customer
