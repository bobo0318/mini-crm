// Node 本地开发入口 —— `npm run dev` 跑的就是这个
//
// 跟 Workers 入口（src/index.ts）的区别：
//   1. 这里 import 'dotenv/config'，把 api/.env 文件加载到 process.env
//      （Workers 不需要 dotenv，env 由 CF 平台直接注入）
//   2. 用 @hono/node-server 的 serve() 显式启动 HTTP server
//      （Workers runtime 自己管 server，不用 listen 端口）
//   3. 监听 PORT env 变量（默认 3000）

// dotenv/config 必须放最前 —— 它的副作用是同步读 .env 文件填到 process.env，
// 必须在任何用到 process.env 的模块（比如下面 import 的 app）加载之前完成
import 'dotenv/config'

import { serve } from '@hono/node-server'

import app from './app'

// PORT 可以用环境变量覆盖，方便端口冲突时改
const port = Number(process.env.PORT) || 3000

serve({
  fetch: app.fetch,
  port,
})

console.log(`Server is running on http://localhost:${port}`)
