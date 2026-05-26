// 数据库连接的"单例"
// 整个后端共享同一个 db 实例，所有业务代码 import { db } 来用

// 引入 Drizzle 的 better-sqlite3 适配器
import { drizzle } from 'drizzle-orm/better-sqlite3'

// 引入 better-sqlite3 驱动本体（真正打开 .db 文件的那位）
import Database from 'better-sqlite3'

// 把 schema 整个文件导入，传给 Drizzle，让 ORM 知道有哪些表
// 用 * as schema 是为了把所有 export（users 等）打包成一个对象
import * as schema from './schema'

// 打开（或自动创建）SQLite 数据库文件
// 路径 './mini-crm.db' 相对的是"跑 node 时的工作目录"，对我们来说就是 api/ 目录
const sqlite = new Database('./mini-crm.db')

// 用 Drizzle 包装一下，注入 schema
// 得到一个类型安全的 db 对象——以后 db.select().from(users).all() 等等都靠它
export const db = drizzle(sqlite, { schema })
