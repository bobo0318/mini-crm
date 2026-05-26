// JWT 工具：生成 token 和 校验 token
// 用 jsonwebtoken 这个库，它实现了 JWT 标准（RFC 7519）

import jwt from 'jsonwebtoken'
import type { SignOptions } from 'jsonwebtoken'

// =====================================================
// 配置读取
// =====================================================
// 启动时从 .env 读出来。读不到就 throw，让程序立刻挂掉
//   —— 比"跑起来了但密钥是 undefined"更安全（那种情况会导致 token 谁都能伪造）
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET 未配置！请检查 api/.env 文件')
}

// 过期时间，比如 "7d" / "1h" / "30m"
// 默认 7 天（学习项目方便，生产一般用更短 + refresh token 机制）
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn']

// =====================================================
// Payload 类型
// =====================================================
// payload = JWT 中间那段携带的数据
// 我们只塞最小必要信息：userId 用来定位用户，email 方便日志/调试
// 注意：千万别把密码哈希之类的塞进来，前面讲过 payload 不是加密的，只是 base64 编码
export interface JwtPayload {
  userId: number
  email: string
}

// =====================================================
// 生成 token：登录成功时调用
// =====================================================
export function generateToken(payload: JwtPayload): string {
  // jwt.sign(载荷, 密钥, 选项)
  // 返回的 token 形如 "xxx.yyy.zzz" 三段
  return jwt.sign(payload, JWT_SECRET!, {
    expiresIn: JWT_EXPIRES_IN,
  })
}

// =====================================================
// 校验 token：每次访问受保护接口时调用
// =====================================================
// 验证成功 → 返回 payload
// 验证失败（签名错 / 过期 / 格式不对）→ 返回 null
//
// 这里用 try/catch 把异常吃掉转成 null，是因为调用方关心的是"对/错"，
// 不需要区分是哪种失败。要细分时可以把 catch 里的错误类型透出。
export function verifyToken(token: string): JwtPayload | null {
  try {
    // jwt.verify 默认会同时校验签名和过期时间
    // 返回值的类型 jsonwebtoken 标得不准，需要我们手动断言成 JwtPayload
    const decoded = jwt.verify(token, JWT_SECRET!) as JwtPayload
    return decoded
  } catch {
    // TokenExpiredError / JsonWebTokenError / NotBeforeError 等都走这里
    return null
  }
}
