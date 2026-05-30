// 数据库种子脚本（D9 引入）
// 用法：cd api && npm run db:seed
//
// 干两件事：
//   1. 塞 3 个内置角色（admin / sales / viewer + 各自的权限码列表）
//   2. 给所有 roleId 为 null 的旧 user 补成 admin 角色
//
// 幂等：重复跑安全（已有数据就跳过）

import 'dotenv/config'
import { eq, isNull } from 'drizzle-orm'

import { db } from './client'
import { roles, users } from './schema'

// =====================================================
// 权限码常量（D9 的"真理之源"）
// =====================================================
//
// 格式约定：'<resource>:<action>'
// 注意：
//   - 这里只有"动作权限"，比如 'customer:delete' 表示"能调用 DELETE 接口"
//   - "只能改自己的客户"这种数据权限不通过权限码，写在中间件里靠 ownerId 检查
//   - 前端将来用 v-auth 指令也用这些字符串，所以这里就是 single source of truth

// admin —— 全部权限
const ALL_PERMISSIONS = [
  // 客户
  'customer:read', 'customer:create', 'customer:update', 'customer:delete',
  // 联系人
  'contact:read', 'contact:create', 'contact:update', 'contact:delete',
  // 跟进记录
  'followUp:read', 'followUp:create',
  // 商机
  'deal:read', 'deal:create', 'deal:update', 'deal:delete',
  // Excel 导出
  'export:excel',
  // 后台管理
  'user:read', 'user:create', 'user:update', 'user:delete',
  'role:read',
]

// sales —— 全部 read/create/update，没有 delete，没有后台管理
// 注：update 有这个权限码，但中间件还会检查"只能改自己 ownerId 的"
const SALES_PERMISSIONS = [
  'customer:read', 'customer:create', 'customer:update',
  'contact:read', 'contact:create', 'contact:update',
  'followUp:read', 'followUp:create',
  'deal:read', 'deal:create', 'deal:update',
  'export:excel',
]

// viewer —— 只看不动
const VIEWER_PERMISSIONS = [
  'customer:read', 'contact:read', 'followUp:read', 'deal:read',
]

// =====================================================
// 主流程
// =====================================================
function seed() {
  // ---- 1. 角色种子数据 ----
  // 已有角色就跳过（让脚本可重复跑）
  const existingRoles = db.select().from(roles).all()
  if (existingRoles.length === 0) {
    db.insert(roles)
      .values([
        {
          name: 'admin',
          description: '管理员（全部权限）',
          permissions: ALL_PERMISSIONS,
        },
        {
          name: 'sales',
          description: '销售（无删除/管理权限，且只能改自己的客户）',
          permissions: SALES_PERMISSIONS,
        },
        {
          name: 'viewer',
          description: '只读访客',
          permissions: VIEWER_PERMISSIONS,
        },
      ])
      .run()
    console.log('✓ 已初始化 3 个角色：admin / sales / viewer')
  } else {
    console.log(`✓ roles 表已有 ${existingRoles.length} 个角色，跳过初始化`)
  }

  // ---- 2. 给老 users 补 admin ----
  // 取一下 admin 的 id（不能假设是 1，靠 name 查最稳）
  const adminRole = db.select().from(roles).where(eq(roles.name, 'admin')).get()
  if (!adminRole) {
    throw new Error('admin 角色不存在，无法补全旧用户')
  }

  // 把所有 role_id is null 的 user 设成 admin
  // .run() 返回 { changes: 实际更新行数 }，可以用来报告
  const result = db
    .update(users)
    .set({ roleId: adminRole.id })
    .where(isNull(users.roleId))
    .run()
  console.log(`✓ 已给 ${result.changes} 个旧用户补 admin 角色`)
}

// =====================================================
// 执行 + 退出
// =====================================================
// better-sqlite3 是同步 API，不需要 await
// 但 node 进程不会自动退出（连接还在），手动 exit
try {
  seed()
  console.log('\n🎉 Seed 完成')
  process.exit(0)
} catch (err) {
  console.error('\n❌ Seed 失败:', err)
  process.exit(1)
}
