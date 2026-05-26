// Drizzle Kit 的配置文件
// 给 drizzle-kit CLI 看的：知道 schema 在哪、生成的 migration 放哪、怎么连数据库

import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  // 表结构定义文件的位置
  // drizzle-kit 读这个文件 → 解析里面的表定义 → 生成对应 SQL
  schema: './src/db/schema.ts',

  // migration 文件输出目录
  // 跑 db:generate 时，SQL 文件会写到这里（D2 暂时用不到，先指定好）
  out: './drizzle',

  // 数据库方言（SQLite / MySQL / PostgreSQL）
  // 我们选 sqlite，决定了 Drizzle 生成 SQL 的语法版本
  dialect: 'sqlite',

  // 数据库连接信息
  // 对 SQLite 来说就是个文件路径——url 指向哪，.db 文件就在哪
  // 跑 db:push 时，drizzle-kit 会自动创建这个文件（如果不存在）
  dbCredentials: {
    url: './mini-crm.db',
  },
})
