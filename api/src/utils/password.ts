// 密码加密工具
// 提供两个函数：把明文密码哈希成密文，以及验证明文密码是否匹配某个密文

// bcryptjs 是纯 JS 实现的 bcrypt 算法，跨平台稳定
// 注意：bcryptjs 默认是 CommonJS 模块，在 ESM 项目里用 default 导入
import bcrypt from 'bcryptjs'

// saltRounds = 哈希强度（也叫"工作因子"）
// 10 是社区推荐的平衡值：单次哈希耗时约 100ms
//   - 数字越大越安全（暴力破解越慢），但登录响应也越慢
//   - 数字越小越快，但暴力破解风险越高
// 12 是金融级标准，10 是普通 web 应用标准
const SALT_ROUNDS = 10

/**
 * 把明文密码哈希成可以安全存数据库的字符串
 *
 * @param plain 用户在注册/改密码时输入的原始密码
 * @returns 形如 "$2a$10$N9qo8uLOickgx2ZMRZoMye..." 的哈希串（约 60 字符）
 *
 * 流程：bcrypt 内部会先生成一个随机 salt，再用 plain + salt 哈希出最终结果
 * 这个 salt 会一起拼在返回值里（就是中间那段），所以验证时不需要单独存 salt
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS)
}

/**
 * 验证用户输入的明文密码，是否跟数据库里存的哈希匹配
 *
 * @param plain 用户登录时输入的明文密码
 * @param hash  数据库里 users 表的 passwordHash 字段
 * @returns 匹配返回 true，不匹配返回 false
 *
 * bcrypt.compare 内部会：
 *   1. 从 hash 里抽出当初生成的 salt
 *   2. 用 plain + 那个 salt 再哈希一次
 *   3. 跟 hash 对比，一样就 true
 */
export async function comparePassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}
