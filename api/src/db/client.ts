// 数据库连接的"单例"
// 整个后端共享同一个 db 实例，所有业务代码 import { db } 来用
//
// D12：从 better-sqlite3 切到 @libsql/client（Turso 官方客户端）
//   - 本地开发：DATABASE_URL=file:./mini-crm.db
//   - 生产 Turso：DATABASE_URL=libsql://xxx.turso.io + DATABASE_AUTH_TOKEN=xxx
//
// ⚠️ libsql 是异步 API，业务代码所有 db.xxx() 都要 await
//
// =====================================================
// 迁 Cloudflare Workers：改成"懒初始化 + Proxy"
// =====================================================
//
// 为啥要改？
//   旧版在模块加载时就 createClient + 校验 process.env.DATABASE_URL，
//   在 Workers runtime 里，模块加载时 env 可能还没注入（即使开了 nodejs_compat polyfill）
//   一旦没注入，整个 Worker 启动就崩，连第一个请求都接不到
//
// 新版怎么做？
//   1. _db 模块级变量缓存，第一次访问任意 db.xxx 时才真的创建（getDb 里做）
//   2. 用 Proxy 包装一层，对外暴露的 `db` 看起来跟旧版完全一样
//      —— 调用方所有 9 个 routes 一行都不用改
//   3. Proxy.get 拿到函数时要 .bind 到真实的 _db
//      原因：JS 里 `db.select()` 的 this 指向 `db`（Proxy），而 drizzle 内部要用 this 拿自身状态
//          不 bind 的话 select 拿到的 this 是 Proxy，drizzle 内部炸
//
// Node 模式下也一样跑（dotenv 在 node-dev.ts 入口提前加载，把 .env 注入到 process.env）

import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'

import * as schema from './schema'

// Drizzle 实例的具体类型（带 schema 的，有完整 TS 提示）
type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>

// 模块级缓存 —— Workers 同一个 isolate 复用，不会每次请求都重建
// （Workers isolate 类似 Node 进程，启动一次后处理多次请求）
let _db: DrizzleDb | null = null

// 真正的初始化逻辑 —— 第一次访问 db 任意属性时调用
function getDb(): DrizzleDb {
  if (_db) return _db

  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error(
      'DATABASE_URL 未配置。本地查 api/.env 或 .dev.vars，生产查 wrangler secret',
    )
  }

  const client = createClient({
    url,
    // 本地 file: 协议不需要 authToken，传 undefined 即可；远程 Turso 必须传
    authToken: process.env.DATABASE_AUTH_TOKEN,
  })

  _db = drizzle(client, { schema })

  // 首次连接打一行日志方便排查（重启 Worker 后只打一次）
  console.log(`[db] 已连接到 ${url}`)

  return _db
}

// =====================================================
// 对外暴露的 db —— Proxy 包装，调用方无感知
// =====================================================
// 用法跟旧版一模一样：
//   import { db } from '../db/client'
//   await db.select().from(users).where(...)
//
// 底层实际发生：
//   db.select        → Proxy.get('select') → getDb().select.bind(getDb())
//   db.insert        → 同理
//   db.transaction   → 同理
//
// .bind(realDb) 是关键 —— 让 drizzle 的方法内部 this 指向真实 db 实例，而不是 Proxy
export const db = new Proxy({} as DrizzleDb, {
  get(_target, prop) {
    const realDb = getDb()
    const value = Reflect.get(realDb, prop)
    // 如果取出来是个方法，绑到真实 db 上再返回；否则原样返回
    return typeof value === 'function' ? value.bind(realDb) : value
  },
}) as DrizzleDb
