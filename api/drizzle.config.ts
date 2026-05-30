// Drizzle Kit 的配置文件
// 给 drizzle-kit CLI 看的：知道 schema 在哪、生成的 migration 放哪、怎么连数据库
//
// D12：dialect 从 'sqlite' 改 'turso'（drizzle-kit 0.31+ 专给 libsql 的 dialect，
//      同时支持 file: 本地协议 和 libsql:// 远程协议）
//      url / authToken 从环境变量读，跟运行时 src/db/client.ts 共用同一份 .env

import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL 未设置。本地配 file:./mini-crm.db，生产 Turso 配 libsql://xxx',
  )
}

export default defineConfig({
  // 表结构定义文件的位置
  schema: './src/db/schema.ts',

  // migration 文件输出目录
  out: './drizzle',

  // turso dialect 支持本地 file: 和 远程 libsql:// 两种 URL，覆盖度更全
  dialect: 'turso',

  // 数据库连接信息：从 .env 读，跟 src/db/client.ts 同源
  dbCredentials: {
    url: process.env.DATABASE_URL,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  },
})
