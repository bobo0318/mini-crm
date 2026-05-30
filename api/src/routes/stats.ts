// 仪表盘统计接口（D10）
// 挂在 /api/stats 下：
//   GET /api/stats/overview         4 个核心指标卡片
//   GET /api/stats/customer-trend   本月按天新增客户数（折线图）
//   GET /api/stats/deal-funnel      商机按 stage 分组（漏斗图）
//   GET /api/stats/sales-rank       销售成交金额排行 Top 10（横向柱状图）
//
// 角色差异（业务约定）：
//   admin / viewer  → 看全公司数据
//   sales           → 只看自己 owner_id 的数据
//
// 实现：在 SQL 的 WHERE 里加 ownerId 过滤即可，不通过权限码体现

import { Hono } from 'hono'
import { and, desc, eq, gte, sql, ne } from 'drizzle-orm'

import { db } from '../db/client'
import { customers, deals, users } from '../db/schema'
import { authMiddleware, type AuthEnv, type RoleContext } from '../middlewares/auth'
import { permission } from '../middlewares/permission'

const stats = new Hono<AuthEnv>()

stats.use('*', authMiddleware)

// =====================================================
// 工具函数
// =====================================================

/**
 * 取本月第一天的时间戳（毫秒数）
 * 比如今天是 2026-05-30，返回 2026-05-01 00:00:00 的 Date 对象
 */
function startOfMonth(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

/**
 * 根据角色返回 ownerId 过滤条件
 * - sales 角色 → eq(ownerId列, currentUserId)
 * - admin / viewer → undefined（不加过滤）
 *
 * drizzle 的 where(undefined) 等价于"不加条件"，所以直接传 undefined 即可
 */
function ownerFilter(
  role: RoleContext,
  userId: number,
  ownerIdColumn: typeof customers.ownerId,  // 列引用，customers.ownerId 或 deals.ownerId 都行
) {
  if (role.name === 'sales') return eq(ownerIdColumn, userId)
  return undefined
}

// =====================================================
// GET /api/stats/overview —— 4 个核心指标
// =====================================================
//
// 权限：customer:read（所有登录用户都有，让 viewer 也能看仪表盘）
//
// 返回：
//   {
//     totalCustomers: 42,
//     newCustomersThisMonth: 8,
//     activeDeals: 12,           // 不在 won / lost 阶段的商机数
//     weightedExpectedAmount: 1200000   // 未结束商机的加权预期金额
//   }
stats.get('/overview', permission('customer:read'), async (c) => {
  const role = c.get('role')
  const { userId } = c.get('user')

  const custOwner = ownerFilter(role, userId, customers.ownerId)
  const dealOwner = ownerFilter(role, userId, deals.ownerId)

  // 总客户数
  const totalCustomersRow = db
    .select({ count: sql<number>`count(*)` })
    .from(customers)
    .where(custOwner)
    .get()

  // 本月新增客户数
  const monthStart = startOfMonth()
  const newThisMonthRow = db
    .select({ count: sql<number>`count(*)` })
    .from(customers)
    .where(and(gte(customers.createdAt, monthStart), custOwner))
    .get()

  // 进行中商机数（不在 won / lost 阶段）
  const activeDealsRow = db
    .select({ count: sql<number>`count(*)` })
    .from(deals)
    .where(and(ne(deals.stage, 'won'), ne(deals.stage, 'lost'), dealOwner))
    .get()

  // 加权预期金额 = sum(amount * probability / 100) 仅未结束商机
  // amount / probability 都可能为 null —— SQL 里 null 参与算术结果是 null，sum 会跳过
  // 用 COALESCE 把 null 当 0 处理
  const weightedRow = db
    .select({
      total: sql<number>`coalesce(sum(coalesce(amount, 0) * coalesce(probability, 0) / 100.0), 0)`,
    })
    .from(deals)
    .where(and(ne(deals.stage, 'won'), ne(deals.stage, 'lost'), dealOwner))
    .get()

  return c.json({
    totalCustomers: totalCustomersRow?.count ?? 0,
    newCustomersThisMonth: newThisMonthRow?.count ?? 0,
    activeDeals: activeDealsRow?.count ?? 0,
    weightedExpectedAmount: weightedRow?.total ?? 0,
  })
})

// =====================================================
// GET /api/stats/customer-trend —— 本月按天新增客户
// =====================================================
//
// 返回：{ data: [{ date: '2026-05-01', count: 2 }, ...] }
// 注意 SQLite 的 date() 函数处理 unix 时间戳要带 'unixepoch' 修饰符
// 字段 createdAt 在 schema 里 mode:'timestamp' 实际存的是秒数
stats.get('/customer-trend', permission('customer:read'), async (c) => {
  const role = c.get('role')
  const { userId } = c.get('user')

  const monthStart = startOfMonth()
  const rows = db
    .select({
      date: sql<string>`date(created_at, 'unixepoch')`.as('date'),
      count: sql<number>`count(*)`,
    })
    .from(customers)
    .where(
      and(
        gte(customers.createdAt, monthStart),
        ownerFilter(role, userId, customers.ownerId),
      ),
    )
    .groupBy(sql`date(created_at, 'unixepoch')`)
    .orderBy(sql`date(created_at, 'unixepoch')`)
    .all()

  return c.json({ data: rows })
})

// =====================================================
// GET /api/stats/deal-funnel —— 商机漏斗
// =====================================================
//
// 返回：{ data: [{ stage: 'lead', count: 5 }, ...] }
// 顺序：lead → contact → quote → won（前端按这个顺序展示成漏斗）
// 排除 lost
stats.get('/deal-funnel', permission('deal:read'), async (c) => {
  const role = c.get('role')
  const { userId } = c.get('user')

  const rows = db
    .select({
      stage: deals.stage,
      count: sql<number>`count(*)`,
    })
    .from(deals)
    .where(and(ne(deals.stage, 'lost'), ownerFilter(role, userId, deals.ownerId)))
    .groupBy(deals.stage)
    .all()

  // 用 Map 转一下，确保 4 个 stage 都有（即使数量为 0），方便前端按固定顺序渲染
  const map = new Map(rows.map((r) => [r.stage, r.count]))
  const ORDER: Array<'lead' | 'contact' | 'quote' | 'won'> = [
    'lead', 'contact', 'quote', 'won',
  ]
  const data = ORDER.map((stage) => ({ stage, count: map.get(stage) ?? 0 }))

  return c.json({ data })
})

// =====================================================
// GET /api/stats/sales-rank —— 销售成交金额排行 Top 10
// =====================================================
//
// 返回：{ data: [{ ownerName: '管理员', totalAmount: 1200000 }, ...] }
// 仅统计 stage = 'won' 的商机；按总金额降序
// 排行榜：admin / viewer 看全公司排行；sales 只能看到自己一行
stats.get('/sales-rank', permission('deal:read'), async (c) => {
  const role = c.get('role')
  const { userId } = c.get('user')

  const rows = db
    .select({
      ownerName: users.name,
      totalAmount: sql<number>`coalesce(sum(amount), 0)`,
    })
    .from(deals)
    .leftJoin(users, eq(deals.ownerId, users.id))
    .where(and(eq(deals.stage, 'won'), ownerFilter(role, userId, deals.ownerId)))
    .groupBy(deals.ownerId, users.name)
    .orderBy(desc(sql`coalesce(sum(amount), 0)`))
    .limit(10)
    .all()

  return c.json({ data: rows })
})

export default stats
