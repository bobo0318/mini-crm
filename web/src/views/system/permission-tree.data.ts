// 权限树（按 resource 分组）
//
// 用途：RoleFormModal 的 a-tree :checkable 渲染数据源
//
// ⚠️ 跟后端 api/src/data/permission-tree.ts 的 ALL_PERMISSION_CODES + SYSTEM_ONLY_PERMISSIONS
//    保持同步（mini-crm 不是 monorepo，单源真理只能手动对齐）

import type { TreeProps } from 'ant-design-vue'

type TreeNode = NonNullable<TreeProps['treeData']>[number]

// =====================================================
// 完整权限树（按 resource 分组）
// =====================================================
//
// 节点 key 设计：
//   - 父节点（组）：key = resource，如 'customer'  —— 不是真权限码，仅用于分组
//   - 叶子节点：key = 'resource:action'，如 'customer:read'  —— 这才是真权限码
//
// 父节点勾选 = 子节点全勾，AD Vue 的 a-tree :checkable 自带这个行为
// 提交时要过滤出叶子节点（含冒号的）传给后端
// 叶子节点 title 采用 "动作 + 资源名" 的命名（如"新增客户"），
// 比单个动词更直观；勾的时候不用对着父节点去推测"我勾的是啥的新增"
//
// export:excel 视觉上挂在"客户管理"下面（语义上就是导出客户数据），
// 但权限码本身不变 ——后端 ALL_PERMISSION_CODES 里仍是 'export:excel'
export const PERMISSION_TREE: TreeNode[] = [
  {
    title: '客户管理',
    key: 'customer',
    children: [
      { title: '客户列表', key: 'customer:read' },
      { title: '新增客户', key: 'customer:create' },
      { title: '编辑客户', key: 'customer:update' },
      { title: '删除客户', key: 'customer:delete' },
      { title: 'Excel 导出', key: 'export:excel' },
    ],
  },
  {
    title: '联系人',
    key: 'contact',
    children: [
      { title: '联系人列表', key: 'contact:read' },
      { title: '新增联系人', key: 'contact:create' },
      { title: '编辑联系人', key: 'contact:update' },
      { title: '删除联系人', key: 'contact:delete' },
    ],
  },
  {
    title: '跟进记录',
    key: 'followUp',
    children: [
      { title: '跟进记录列表', key: 'followUp:read' },
      { title: '新增跟进', key: 'followUp:create' },
    ],
  },
  {
    title: '商机',
    key: 'deal',
    children: [
      { title: '商机列表', key: 'deal:read' },
      { title: '新增商机', key: 'deal:create' },
      { title: '编辑商机', key: 'deal:update' },
      { title: '删除商机', key: 'deal:delete' },
    ],
  },
  {
    title: '用户管理',
    key: 'user',
    children: [
      { title: '用户列表', key: 'user:read' },
      { title: '新增用户', key: 'user:create' },
      { title: '编辑用户', key: 'user:update' },
      { title: '删除用户', key: 'user:delete' },
    ],
  },
  {
    title: '角色管理',
    key: 'role',
    children: [
      { title: '角色列表', key: 'role:read' },
      { title: '新增角色', key: 'role:create' },
      { title: '编辑角色', key: 'role:update' },
      { title: '删除角色', key: 'role:delete' },
    ],
  },
]

// =====================================================
// 系统级权限（custom 角色不能拥有）
// =====================================================
// 跟后端 SYSTEM_ONLY_PERMISSIONS 保持一致
const SYSTEM_ONLY_PERMISSIONS = new Set([
  'user:create',
  'user:delete',
  'role:create',
  'role:update',
  'role:delete',
])

// =====================================================
// 按 role type 过滤权限树
// =====================================================
// system → 完整树（编辑内置角色时用，虽然内置角色实际禁用编辑，但 UI 仍要展示）
// custom → 隐藏系统级权限叶子；如果父节点叶子被全部隐藏了，连父节点也隐藏
export function filterTreeByRoleType(
  tree: TreeNode[],
  roleType: 'system' | 'custom',
): TreeNode[] {
  if (roleType === 'system') return tree

  return tree
    .map((node) => ({
      ...node,
      children: node.children?.filter(
        (child) => !SYSTEM_ONLY_PERMISSIONS.has(child.key as string),
      ),
    }))
    .filter((node) => !node.children || node.children.length > 0)
}

// =====================================================
// 工具：从 a-tree 勾中的 keys 里提取真权限码（叶子节点，带冒号的）
// =====================================================
// a-tree 的 checkedKeys 同时包含父节点 key（分组用的）和叶子节点 key（真权限码）
// 提交给后端时只要真权限码 —— 父节点 'customer' 这种过滤掉
export function extractLeafPermissions(keys: (string | number)[]): string[] {
  return keys.filter(
    (k): k is string => typeof k === 'string' && k.includes(':'),
  )
}
