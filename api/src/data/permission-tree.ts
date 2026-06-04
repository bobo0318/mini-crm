// 权限码白名单（按 role type 区分）
//
// 用途：role POST/PUT 接口的"越界校验"——前端勾啥不重要，后端必须二次确认
//      （security pattern: never trust client）
//
// ⚠️ 跟前端 web/src/views/system/permission-tree.data.ts 手动同步
//   （mini-crm 不是 monorepo，单源真理就只能靠人工对齐；改一处必须同步另一处）

// =====================================================
// 完整权限码集合（跟 seed.ts 的 ALL_PERMISSIONS 一致）
// =====================================================
const ALL_PERMISSION_CODES = [
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
  // 用户管理
  'user:read', 'user:create', 'user:update', 'user:delete',
  // 角色管理
  'role:read', 'role:create', 'role:update', 'role:delete',
] as const

export const ALL_PERMISSIONS_SET = new Set<string>(ALL_PERMISSION_CODES)

// =====================================================
// custom 角色不能拿到的"管理类"权限
// =====================================================
//
// 安全考量：自定义角色是 admin 在前端勾出来的。如果允许 custom 拿到这些权限，会出现：
//
//   - user:create / user:delete  → custom 角色用户能造账号 / 删账号，可能误删 main
//   - role:create/update/delete  → custom 角色用户能再造 custom 角色，无限套娃 + 难审计
//
// 所以这些权限**永远只能内置 admin 角色拿到**，custom 角色一律拒绝
const SYSTEM_ONLY_PERMISSIONS = new Set([
  'user:create',
  'user:delete',
  'role:create',
  'role:update',
  'role:delete',
])

// =====================================================
// 返回某 role type 允许的权限码集
// =====================================================
export function allowedPermissionsFor(roleType: 'system' | 'custom'): Set<string> {
  if (roleType === 'system') {
    // 内置角色（admin/sales/viewer）由 seed 控制，本不该走这个函数
    // 但保险起见返回全集，让 system 角色的更新（如未来扩展）也能走这条校验
    return ALL_PERMISSIONS_SET
  }
  // custom：所有权限 - SYSTEM_ONLY_PERMISSIONS
  return new Set(ALL_PERMISSION_CODES.filter((p) => !SYSTEM_ONLY_PERMISSIONS.has(p)))
}

// =====================================================
// 校验：传入的 permissions 是否全部在 role type 允许范围内
// =====================================================
// 返回不允许的权限码列表（空数组 = 全合法）
export function findInvalidPermissions(
  permissions: string[],
  roleType: 'system' | 'custom',
): string[] {
  const allowed = allowedPermissionsFor(roleType)
  return permissions.filter((p) => !allowed.has(p))
}
