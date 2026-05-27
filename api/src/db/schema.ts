// 数据库表结构定义
// 这个文件里的 TS 代码，drizzle-kit 会读取并转成 SQL 建表语句

// 从 sqlite-core 引入列类型和表工厂函数
// 注意：用 mysql-core 还是 pg-core 取决于你用什么数据库（换库时改这一行）
import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core'

// 定义 users 表
// sqliteTable(表名, { 列名: 列定义 })
export const users = sqliteTable('users', {
  // 主键：integer 自增 ID
  // primaryKey({ autoIncrement: true }) = SQL 里的 PRIMARY KEY AUTOINCREMENT
  id: integer('id').primaryKey({ autoIncrement: true }),

  // 邮箱：text 类型，非空，唯一（同一个邮箱只能注册一次）
  email: text('email').notNull().unique(),

  // 密码哈希：注意 D3 我们会用 bcrypt 加密后再存，永远不存明文密码
  passwordHash: text('password_hash').notNull(),

  // 用户名：可空（注册时可能没填）
  name: text('name'),

  // 创建时间：用 integer 存 Unix 时间戳，mode: 'timestamp' 告诉 Drizzle 这是 Date 类型
  // $defaultFn = 插入时如果没传，运行时自动用这个函数生成默认值
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

// =====================================================
// 定义 customers 表（客户表）
// =====================================================
// 业务含义：CRM 里"客户"是核心实体。一个客户可以有多个联系人、多条跟进记录、多个商机。
// 这张表是 D4 重点。
export const customers = sqliteTable('customers', {
  // 主键
  id: integer('id').primaryKey({ autoIncrement: true }),

  // 客户姓名（个人名 / 客户代号），必填
  name: text('name').notNull(),

  // 公司名称，可空（个人客户可能没公司）
  company: text('company'),

  // 客户等级：A / B / C
  // SQLite 没有 enum，用 text 存。TS 类型上我们用 $type<...>() 给它加字面量约束，
  // 这样在业务代码里 customer.level 的类型就是 'A' | 'B' | 'C' 而不是模糊的 string。
  level: text('level').$type<'A' | 'B' | 'C'>(),

  // 所属行业（自由文本，比如 "互联网"、"制造业"）
  industry: text('industry'),

  // 客户来源（自由文本，比如 "官网注册"、"展会"、"转介绍"）
  source: text('source'),

  // 销售阶段：线索 / 联系中 / 已确认意向 / 成交 / 已流失
  // 默认值给 'lead'：新建客户都是从"线索"阶段开始
  stage: text('stage')
    .$type<'lead' | 'contact' | 'qualified' | 'won' | 'lost'>()
    .notNull()
    .default('lead'),

  // 标签：字符串数组，比如 ['重点客户', '南方区']
  // mode: 'json' = 底层存 JSON 字符串，Drizzle 读写时自动 stringify / parse
  // $type<string[]>() 给 TS 类型加约束，不然默认是 unknown
  tags: text('tags', { mode: 'json' }).$type<string[]>(),

  // 客户归属人：哪个 user 负责跟进这个客户
  // .references(() => users.id) 声明外键：数据库会保证 owner_id 必须对应一个真实存在的 user
  // 这样防止数据脏：比如不会出现"归属人 ID = 9999 但 users 表里根本没这个人"
  ownerId: integer('owner_id')
    .notNull()
    .references(() => users.id),

  // 创建时间，逻辑同 users.createdAt
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})
