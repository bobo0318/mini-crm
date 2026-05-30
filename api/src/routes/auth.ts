// 鉴权路由：注册 + 登录
// 挂在 /api/auth 下面，最终 URL 是 POST /api/auth/register、POST /api/auth/login

import { Hono } from 'hono'
import { z } from 'zod'
import { eq } from 'drizzle-orm'

import { db } from '../db/client'
import { users, roles } from '../db/schema'
import { hashPassword, comparePassword } from '../utils/password'
import { generateToken } from '../utils/jwt'

// 子路由对象。Hono 允许把一组路由组织在一起，再用 app.route('/api/auth', auth) 整个挂上去
const auth = new Hono()

// =====================================================
// 输入校验 schema（用 zod 描述"前端应该传啥"）
// =====================================================
//
// zod 的好处：
//   1. 一份定义同时管运行时校验 + TS 类型推导
//   2. 出错信息很标准，可以直接回给前端
//
// 这里我们要求：
//   - email: 必须是合法邮箱格式
//   - password: 至少 6 位（学习项目放宽，真实业务一般 >= 8 + 必须包含数字/字母）
//   - name: 可选；注册时没传就用 email 的 @ 前面那段当默认名
const registerSchema = z.object({
  email: z.email({ message: '邮箱格式不正确' }),
  password: z.string().min(6, { message: '密码至少 6 位' }),
  name: z.string().optional(),
})

const loginSchema = z.object({
  email: z.email({ message: '邮箱格式不正确' }),
  password: z.string().min(1, { message: '密码不能为空' }),
})

// =====================================================
// POST /api/auth/register —— 注册
// =====================================================
auth.post('/register', async (c) => {
  // 1. 取请求体（前端发的 JSON）
  const body = await c.req.json()

  // 2. zod 校验
  //    safeParse 不会抛异常，而是返回 { success, data | error }
  //    比直接 .parse 友好，便于自己控制错误响应
  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    // parsed.error.issues 是数组，包含每个字段哪里错了
    // 这里简单起见，把第一个错误的 message 返回
    return c.json({ error: parsed.error.issues[0]?.message || '参数错误' }, 400)
  }
  const { email, password, name } = parsed.data

  // 3. 查这个邮箱是否已经注册过
  //    .get() 表示"取一条"（返回 row 或 undefined）；.all() 是"取多条"（返回数组）
  const existing = await db.select().from(users).where(eq(users.email, email)).get()
  if (existing) {
    // 409 Conflict 是"资源已存在"的标准状态码
    return c.json({ error: '该邮箱已被注册' }, 409)
  }

  // 4. 把密码哈希一下（这里是 D3 里第一次用到 bcrypt）
  const passwordHash = await hashPassword(password)

  // 5. D9：查 sales 角色 id —— 新注册用户默认分配 sales 角色
  //    （admin 角色不能让人自己注册就拿到，否则任何人都能注册个 admin 把系统接管）
  //    要把人提升成 admin 得通过现有 admin 在"用户管理页"手动改
  const salesRole = await db.select().from(roles).where(eq(roles.name, 'sales')).get()
  if (!salesRole) {
    // 这种情况只可能是 db:seed 没跑过 —— 早返回带明确错误
    return c.json({ error: 'sales 角色不存在，请先运行 npm run db:seed' }, 500)
  }

  // 6. 插入数据库
  //    .returning() 让 SQLite 把新插入的行返回回来（自增 id 已经填好了）
  //    .get() 拿到那一行
  const newUser = await db
    .insert(users)
    .values({
      email,
      passwordHash,
      name: name || email.split('@')[0], // 没传 name 就用邮箱 @ 前那段
      roleId: salesRole.id,              // D9：默认 sales 角色
    })
    .returning()
    .get()

  // 7. 签发 token
  const token = generateToken({
    userId: newUser.id,
    email: newUser.email,
  })

  // 8. 返回 —— D9：除基本信息外加上 role + permissions
  //    前端 setAuth 后立刻能渲染权限相关 UI（菜单/按钮），不用再跑 getMe
  return c.json({
    user: {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: salesRole.name,
      permissions: salesRole.permissions,
    },
    token,
  })
})

// =====================================================
// POST /api/auth/login —— 登录
// =====================================================
auth.post('/login', async (c) => {
  const body = await c.req.json()

  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message || '参数错误' }, 400)
  }
  const { email, password } = parsed.data

  // 按邮箱查用户
  const user = await db.select().from(users).where(eq(users.email, email)).get()

  // 安全要点：用户不存在 / 密码不对，两种情况统一返回同一个错误信息 + 401
  //   —— 否则攻击者可以拿来"枚举哪些邮箱注册过本站"
  //   —— 这是面试可能被问到的点："登录失败时为什么不说清楚是哪个错了？"
  if (!user) {
    return c.json({ error: '邮箱或密码错误' }, 401)
  }

  const isPasswordValid = await comparePassword(password, user.passwordHash)
  if (!isPasswordValid) {
    return c.json({ error: '邮箱或密码错误' }, 401)
  }

  // D9：查用户的角色 + 权限
  // user.roleId 理论上不会是 null（seed 给老用户补过，register 默认给 sales），
  // 但保险起见做兜底
  let role: { name: string; permissions: string[] } | null = null
  if (user.roleId) {
    const r = await db.select().from(roles).where(eq(roles.id, user.roleId)).get()
    if (r) role = { name: r.name, permissions: r.permissions as string[] }
  }
  if (!role) {
    return c.json({ error: '用户角色信息缺失，请联系管理员' }, 500)
  }

  // 密码对上了，签发 token
  const token = generateToken({
    userId: user.id,
    email: user.email,
  })

  return c.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: role.name,
      permissions: role.permissions,
    },
    token,
  })
})

export default auth
