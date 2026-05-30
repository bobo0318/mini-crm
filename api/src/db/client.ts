// 数据库连接的"单例"
// 整个后端共享同一个 db 实例，所有业务代码 import { db } 来用
//
// D12：从 better-sqlite3 切到 @libsql/client（Turso 官方客户端）
// 好处：一套代码同时支持本地文件和 Turso 远程数据库，通过 DATABASE_URL 切换：
//   - 本地开发：DATABASE_URL=file:./mini-crm.db
//   - 生产 Turso：DATABASE_URL=libsql://xxx.turso.io + DATABASE_AUTH_TOKEN=xxx
//
// ⚠️ 副作用：libsql 是异步 API，业务代码所有 db.xxx() 都要 await
//    better-sqlite3 时代写的同步代码（const row = db.select()...get()）全部改成
//    const row = await db.select()...get()

import 'dotenv/config'

import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'

import * as schema from './schema'

// 校验 DATABASE_URL：必填，否则本地都跑不起来
if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL 未设置。本地开发请在 api/.env 配 DATABASE_URL=file:./mini-crm.db',
  )
}

// 创建 libsql client
//   url:        本地用 file:./xxx.db，远程用 libsql://xxx.turso.io
//   authToken:  Turso 的认证 token，本地文件不需要（undefined 即可）
const client = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.DATABASE_AUTH_TOKEN,
})

// D12 临时日志：启动时打一行确认连的是谁（部署稳定后可以删）
console.log(`[db] 已连接到 ${process.env.DATABASE_URL}`)

// 用 Drizzle 包装一下，注入 schema
// 得到一个类型安全的 db 对象 —— 以后 await db.select().from(users).all() 等等都靠它
export const db = drizzle(client, { schema })
