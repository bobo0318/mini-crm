// 数据库表结构定义
// 这个文件里的 TS 代码，drizzle-kit 会读取并转成 SQL 建表语句

// 从 sqlite-core 引入列类型和表工厂函数
// 注意：用 mysql-core 还是 pg-core 取决于你用什么数据库（换库时改这一行）
// real = SQLite 的浮点数类型，用来存金额（amount）
import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core'

// =====================================================
// 定义 roles 表（角色表）—— D9 新增
// =====================================================
// 业务含义：RBAC 模型的角色实体。本项目内置 3 个角色：admin / sales / viewer
// 每个角色携带一个权限码数组（permissions），格式 'resource:action'，如 'customer:delete'
//
// 放在 users 之前是因为：users.role_id 要 references(roles.id)，TS 编译时要求 roles 标识符已声明
export const roles = sqliteTable('roles', {
  id: integer('id').primaryKey({ autoIncrement: true }),

  // 角色 code，唯一
  // ⚠️ D9 这里原来用字面量类型 'admin' | 'sales' | 'viewer' 约束，
  //    自定义角色加进来后只能放宽成 string（自定义的 name 是用户输入的，编译期不知道）
  //    业务里要 narrow（比如内置那 3 个的特殊处理）就显式 `as 'admin'` 或 typeof 判断
  name: text('name').notNull().unique(),

  // ⭐ 角色类型（自定义角色支持引入）
  //   'system' = 内置角色（admin / sales / viewer）—— 永远不可改不可删
  //   'custom' = 用户在前端通过"新增角色"创建的角色
  // 控制：哪些角色能被编辑、哪些权限能被勾，分流的依据
  //
  // default('system') 的原因：SQLite ALTER TABLE 加 NOT NULL 列必须有常量 default；
  //   且现有 3 个内置角色刚好该是 'system'，default 跟语义一致
  //   前端创建自定义角色时 zod schema 强制传 type='custom'，不会落 default
  type: text('type').$type<'system' | 'custom'>().notNull().default('system'),

  // 中文描述：'管理员' / '销售' / '只读'，给前端展示用
  description: text('description').notNull(),

  // 权限码列表：JSON 数组，比如 ['customer:read', 'customer:delete', ...]
  // mode: 'json' 让 Drizzle 自动 stringify / parse
  permissions: text('permissions', { mode: 'json' }).$type<string[]>().notNull(),

  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

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

  // 角色外键（D9 新增）
  // 设计上写 nullable：
  //   - SQLite ALTER TABLE 加 NOT NULL 列容易出问题（需要 DEFAULT 而 DEFAULT 又必须是常量）
  //   - 业务上靠 register 接口和 seed 脚本保证：所有 user 必有 role_id
  // 注意 references(() => roles.id) 是延迟引用，roles 定义在文件下方也能正常解析
  roleId: integer('role_id').references(() => roles.id),

  // ⭐ 账号类型（参考 start 项目的 AdminType，简化成 2 种）
  //   'main' = 主账号（系统创建时种 1 个，全 DB 永远只有 1 条）
  //   'sub'  = 副手账号（注册接口创建的、admin 手动新增的，都是 sub）
  //
  // 关键约束（由 routes/user.ts 和 routes/auth.ts 守门）：
  //   1. main 在 DB 里唯一，POST /users 永远只造 sub，POST /auth/register 永远只造 sub
  //   2. main 不可删（DELETE /users/:id 拦 main）
  //   3. main 不可被改 roleId（即使是 main 自己改自己也不行 —— 防自己降级回不来）
  //   4. main 不可被改 adminType（同理）
  //
  // 默认 'sub' —— 让 DEFAULT 是个常量，SQLite ALTER TABLE 加列才允许
  adminType: text('admin_type').$type<'main' | 'sub'>().notNull().default('sub'),

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

// =====================================================
// 定义 contacts 表（联系人表）
// =====================================================
// 业务含义：一个客户可以有多个联系人（销售对接窗口/采购/老板等）
// 主从表设计：customer_id 是外键，多个联系人挂同一个客户
export const contacts = sqliteTable('contacts', {
  id: integer('id').primaryKey({ autoIncrement: true }),

  // 关联到哪个客户（必填，外键）
  // .references(() => customers.id) 让数据库保证 customer_id 必须对应真实客户
  customerId: integer('customer_id')
    .notNull()
    .references(() => customers.id),

  // 联系人姓名，必填
  name: text('name').notNull(),

  // 电话，可空（不是所有联系人都会留电话）
  phone: text('phone'),

  // 邮箱，可空
  email: text('email'),

  // 职位，比如 "采购经理"、"CEO"
  position: text('position'),

  // 是否主联系人
  // mode: 'boolean' 让 Drizzle 自动把 SQLite 的 0/1 当成 boolean
  // 默认 false：新增的联系人都不是主，主联系人要手动勾
  // 注意：业务上"一个客户最多一个主联系人"这个约束 D6 不强制做，
  //      简化为"前端 UI 提醒，后端只管存"，后续优化时再加复杂逻辑
  isPrimary: integer('is_primary', { mode: 'boolean' })
    .notNull()
    .default(false),

  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

// =====================================================
// 定义 follow_ups 表（跟进记录表）
// =====================================================
// 业务含义：销售跟客户聊了什么、何时再跟、内容是什么（Markdown）
// 重要约定：跟进记录"追加 only"——一旦插入就不能改也不能删，作为审计痕迹
//          所以后端只提供 GET（列表）和 POST（新增）两个接口，没有 PUT/DELETE
export const followUps = sqliteTable('follow_ups', {
  id: integer('id').primaryKey({ autoIncrement: true }),

  // 关联客户
  customerId: integer('customer_id')
    .notNull()
    .references(() => customers.id),

  // 关联跟进人（哪个 user 做的这次跟进）
  // 从 JWT 自动取，前端不传，防止伪造
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),

  // 跟进方式：电话 / 拜访 / 邮件 / 微信
  // TS 字面量约束（运行时由 zod 做校验）
  type: text('type')
    .$type<'call' | 'visit' | 'email' | 'wechat'>()
    .notNull(),

  // 跟进内容，Markdown 文本
  // 不限长度（SQLite 的 TEXT 无上限），但前端会限制实际字符数
  content: text('content').notNull(),

  // 下次跟进时间（可空——不是每次跟进都要约下一次）
  nextAt: integer('next_at', { mode: 'timestamp' }),

  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

// =====================================================
// 定义 deals 表（销售商机表）
// =====================================================
// 业务含义：一条 deal = 一个潜在的成交机会（D7-D8 销售漏斗看板的核心数据）
// 一个客户可以有多条 deal（一个客户对你有不同的项目/订单），所以 customer_id 是外键
//
// stage 状态机：
//   lead    → contact → quote → won   （看板 4 列，可拖拽改阶段）
//   任意阶段 → lost                     （"标记丢失"按钮，标记后从看板隐藏）
// 这就是 D7 决策里的"丢失走隐藏不开第 5 列"——保持看板视觉聚焦
export const deals = sqliteTable('deals', {
  id: integer('id').primaryKey({ autoIncrement: true }),

  // 关联到哪个客户（必填，外键）
  customerId: integer('customer_id')
    .notNull()
    .references(() => customers.id),

  // 商机标题，比如 "ERP 系统采购"、"年度服务续约"
  title: text('title').notNull(),

  // 预估金额：real = SQLite 的浮点数
  // 可空：一开始不一定能估出金额
  // ⚠️ 真实金融系统不要用浮点（0.1 + 0.2 ≠ 0.3），要用 integer 存"分"
  //    这里是学习项目，简化处理
  amount: real('amount'),

  // 销售阶段：5 个枚举
  // 默认 'lead'：新建的商机都从"线索"开始
  stage: text('stage')
    .$type<'lead' | 'contact' | 'quote' | 'won' | 'lost'>()
    .notNull()
    .default('lead'),

  // 成交概率，0-100 的整数
  // 用途：D10 仪表盘做"加权预期成交金额"= amount × probability / 100
  // 可空：销售可以不填
  probability: integer('probability'),

  // 预计成交日期，可空
  expectedCloseAt: integer('expected_close_at', { mode: 'timestamp' }),

  // 销售归属人：从 JWT 取，前端不传防伪造（跟 customers.ownerId 同款套路）
  ownerId: integer('owner_id')
    .notNull()
    .references(() => users.id),

  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})
