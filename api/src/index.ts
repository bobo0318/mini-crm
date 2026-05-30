// Hono 后端服务入口
// 启动一个 HTTP server，监听 3000 端口，处理前端发来的请求

// 副作用导入：执行这一行会自动读取项目根目录下的 .env 文件，
// 把里面的键值对挂到 process.env 上。必须放在所有用到 process.env 的代码之前。
import 'dotenv/config'

import { Hono } from 'hono'
import { serve } from '@hono/node-server'

// CORS 中间件：让浏览器允许跨域请求（前端 5173 → 后端 3000）
import { cors } from 'hono/cors'

// 子路由
import authRoutes from './routes/auth'
import meRoutes from './routes/me'
import customerRoutes from './routes/customer'
import contactRoutes from './routes/contact'
import followUpRoutes from './routes/followUp'
import dealRoutes from './routes/deal'
import roleRoutes from './routes/role'
import userRoutes from './routes/user'
import statsRoutes from './routes/stats'

const app = new Hono()

// =====================================================
// 全局中间件
// =====================================================
//
// CORS：从环境变量读 origin（D12 改造）
// CORS_ORIGIN 支持单个或多个域名（逗号分隔），缺省退回到本地 5173
//
// 单个：CORS_ORIGIN=http://localhost:5173
// 多个：CORS_ORIGIN=http://localhost:5173,https://mini-crm.vercel.app
//
// 安全约束：永远不能用 '*'，因为 credentials:true 跟 '*' 冲突（浏览器规范）
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

app.use(
  '*',
  cors({
    // origin 接受字符串 / 函数；我们用函数模式以支持多 origin 白名单
    origin: (origin) => {
      // origin 为空 = 同源请求 / 服务端发起请求，放行
      if (!origin) return origin ?? null
      return allowedOrigins.includes(origin) ? origin : null
    },
    credentials: true, // 允许携带 cookie / Authorization 头
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

// 鉴权相关路由：POST /api/auth/register、POST /api/auth/login
// app.route(前缀, 子路由) 会把子路由里所有路径都套上前缀
app.route('/api/auth', authRoutes)

// "我是谁" 受保护接口：GET /api/me
app.route('/api/me', meRoutes)

// 客户管理：GET/POST/PUT/DELETE /api/customers
app.route('/api/customers', customerRoutes)

// 联系人路由：包含混合 URL 风格
//   /api/customers/:cid/contacts   (列表/新增，嵌套)
//   /api/contacts/:id              (编辑/删除，扁平)
// 子路由内部已经写了完整路径，所以这里前缀只到 /api
app.route('/api', contactRoutes)

// 跟进记录路由：/api/customers/:cid/follow-ups
// 同上，前缀只到 /api
app.route('/api', followUpRoutes)

// 销售商机：GET/POST/PUT/DELETE /api/deals
app.route('/api/deals', dealRoutes)

// 角色管理（D9）：GET /api/roles
app.route('/api/roles', roleRoutes)

// 用户管理（D9）：GET/POST/PUT/DELETE /api/users
app.route('/api/users', userRoutes)

// 仪表盘统计（D10）：GET /api/stats/*
app.route('/api/stats', statsRoutes)

// =====================================================
// 启动 HTTP server
// =====================================================
// D12：port 从环境变量读 —— Railway/Render/Fly 等平台通过 PORT 注入端口
// 写死 3000 的话部署后路由进不来
const port = Number(process.env.PORT) || 3000

serve({
  fetch: app.fetch,
  port,
})

console.log(`Server is running on http://localhost:${port}`)
