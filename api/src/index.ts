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
const port = 3000

serve({
  fetch: app.fetch,
  port,
})

console.log(`Server is running on http://localhost:${port}`)
