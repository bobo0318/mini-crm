// Hono 后端服务入口
// 启动一个 HTTP server，监听 3000 端口，处理前端发来的请求

import { Hono } from 'hono'
import { serve } from '@hono/node-server'

// CORS 中间件：让浏览器允许跨域请求（前端 5173 → 后端 3000）
import { cors } from 'hono/cors'

const app = new Hono()

// =====================================================
// 全局中间件
// =====================================================
//
// 中间件 = 每次请求都会经过的"安检通道"
// app.use('*', ...) 表示对所有路由生效（* = 通配符）
//
// cors() 会自动给响应加上 Access-Control-Allow-* 这些 header，
// 让浏览器同意跨域。
//
// 这里 origin 写死 5173 是为了安全（只允许我们前端调）。
// 生产环境会换成正式域名，比如 'https://mini-crm.vercel.app'。
app.use(
  '*',
  cors({
    origin: 'http://localhost:5173',
    credentials: true, // 允许携带 cookie（D3 登录后会用到）
  }),
)

// =====================================================
// 路由
// =====================================================

// 根路由：hello world，确认 server 活着
app.get('/', (c) => {
  return c.text('Hello from Hono! 后端 API 正常运行。')
})

// 健康检查接口：前端"按钮调通后端"的目标
// 返回 JSON 格式（不是纯文本）—— 业务接口都用 JSON
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    message: 'API is healthy',
    timestamp: new Date().toISOString(), // 当前时间，证明返回的是实时数据
  })
})

// =====================================================
// 启动 HTTP server
// =====================================================
const port = 3000

serve({
  fetch: app.fetch,
  port,
})

console.log(`Server is running on http://localhost:${port}`)
