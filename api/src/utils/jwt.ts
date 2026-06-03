// JWT 工具：生成 token 和 校验 token
//
// 迁 Cloudflare Workers：从 jsonwebtoken 换成 hono/jwt
//
// 为啥换：
//   jsonwebtoken 用 Node 的 crypto 模块（同步 + Buffer-based），
//   Workers runtime 是浏览器同款 Web Crypto（异步 + Promise-based），底层 API 不兼容
//   hono/jwt 直接基于 Web Crypto 实现，Workers 和 Node 都能跑
//
// 调用方需要改的地方（只有一处）：
//   函数变成 async —— 所有 verifyToken / generateToken 调用要加 await
//
// 跟旧版的一致性：
//   函数签名（参数 / 返回类型）保持不变（只多了 Promise 包装）
//   secret 还是从 process.env.JWT_SECRET 读
//   过期时间默认 7 天
//
// ⚠️ 关键改动：secret 不在模块顶部读了，改成"懒读"
//    原因：Workers runtime 加载这个模块时，process.env 可能还没填好（CF Workers 通过 nodejs_compat
//         polyfill 注入 env，注入时机不一定早于模块加载）。
//         把读取推迟到函数被调用时（=请求到达时），那时 env 一定已经就绪。

import { sign, verify } from 'hono/jwt'

// =====================================================
// Payload 类型 —— 业务字段没变
// =====================================================
// 只塞最小必要信息：userId 用来定位用户，email 方便日志/调试
// 注意：千万别把密码哈希之类的塞进来，payload 不是加密的，只是 base64 编码
export interface JwtPayload {
  userId: number
  email: string
}

// 默认过期 7 天（单位：秒，JWT 标准用秒，不是毫秒）
// 学习项目方便，生产一般用更短 + refresh token 机制
const DEFAULT_EXPIRES_IN_SEC = 7 * 24 * 60 * 60

// 算法常量
// hono/jwt 4.12+ 要求 verify 必须显式传 alg（防止"None 算法攻击"——
// 攻击者把 token 的 alg 字段改成 "none" 试图绕过签名校验，
// 老一些的 JWT 库会接受，hono 强制要求 alg 已知避免这个漏洞）
// 这里 sign 和 verify 都用 HS256 保持一致（HMAC-SHA256，对称密钥）
const JWT_ALG = 'HS256'

// =====================================================
// 懒读 secret —— 每次函数调用时才读，而不是模块加载时
// =====================================================
// 为啥不在模块顶部直接读？见文件头部说明
function getSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    // 这种情况只可能是 env 没配。明确报错让调用方一眼知道哪出问题
    throw new Error('JWT_SECRET 未配置！本地检查 api/.env，生产检查 wrangler secret')
  }
  return secret
}

// =====================================================
// 生成 token：登录成功时调用
// =====================================================
// 注意：现在是 async，调用方要 await
export async function generateToken(payload: JwtPayload): Promise<string> {
  // exp = "什么时候过期"，单位是 unix 秒（不是毫秒！）
  // Date.now() 返回毫秒，除以 1000 转秒
  const exp = Math.floor(Date.now() / 1000) + DEFAULT_EXPIRES_IN_SEC

  // sign(payload, secret, alg)
  // 跟 jsonwebtoken 的默认算法一致（HS256），旧 token 也能继续被验签
  return await sign({ ...payload, exp }, getSecret(), JWT_ALG)
}

// =====================================================
// 校验 token：每次访问受保护接口时调用
// =====================================================
// 验证成功 → 返回 payload
// 验证失败（签名错 / 过期 / 格式不对）→ 返回 null
//
// hono/jwt 的 verify 会同时校验签名 + 过期时间，跟 jsonwebtoken 一致
// 失败时会 throw JwtTokenInvalid / JwtTokenExpired / JwtTokenSignatureMismatched 等
// 我们 catch 全部转成 null —— 调用方只关心"对/错"，不区分是哪种失败
export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    // verify 返回的对象包含 payload + exp + iat 等 JWT 标准字段
    // 业务上只用 userId + email，所以断言成 JwtPayload（额外字段被 TS 忽略，运行时还在）
    // verify(token, secret, alg) —— hono/jwt 4.12+ 要求 alg 必填
    const decoded = await verify(token, getSecret(), JWT_ALG)
    return decoded as unknown as JwtPayload
  } catch {
    return null
  }
}
