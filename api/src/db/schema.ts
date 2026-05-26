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
