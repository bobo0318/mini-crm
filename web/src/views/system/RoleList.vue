<script setup lang="ts">
// 角色管理页（D9 Phase 3）—— 纯展示，不可编辑
//
// 业务说明：本系统只有 3 个内置角色（admin / sales / viewer），不支持动态新建角色
// 这页主要给 admin 查看"每个角色到底有哪些权限"，配合用户管理页的"改角色"功能使用

import { onMounted, ref } from 'vue'

import { getRoleList, type Role } from '@/api/role'

const loading = ref(false)
const dataSource = ref<Role[]>([])

async function fetchList() {
  loading.value = true
  try {
    const res = await getRoleList()
    dataSource.value = res.data
  } finally {
    loading.value = false
  }
}

onMounted(fetchList)

// =====================================================
// 角色显示样式映射
// =====================================================
// admin 用红色、sales 用蓝色、viewer 用灰色，跟用户直觉对齐
const roleColorMap: Record<Role['name'], string> = {
  admin: 'red',
  sales: 'blue',
  viewer: 'default',
}

// =====================================================
// 把权限码按 resource: 前缀分组，更易读
// =====================================================
//
// 输入：['customer:read', 'customer:create', 'deal:read', ...]
// 输出：{ customer: ['read', 'create', ...], deal: ['read', ...], ... }
//
// 不分组的话每个角色一行展开 20 多个 tag 视觉混乱
function groupPermissions(perms: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {}
  for (const p of perms) {
    const [resource, action] = p.split(':')
    if (!groups[resource]) groups[resource] = []
    groups[resource].push(action)
  }
  return groups
}

// 资源名 → 中文映射
const resourceLabelMap: Record<string, string> = {
  customer: '客户',
  contact: '联系人',
  followUp: '跟进',
  deal: '商机',
  export: '导出',
  user: '用户',
  role: '角色',
}

// 操作名 → 中文映射
const actionLabelMap: Record<string, string> = {
  read: '查看',
  create: '新增',
  update: '编辑',
  delete: '删除',
  excel: 'Excel',
}
</script>

<template>
  <div>
    <a-alert
      message="系统内置 3 个角色，不支持动态新建/修改。如需调整某个用户的角色，请到「用户管理」页。"
      type="info"
      show-icon
      style="margin-bottom: 16px"
    />

    <a-table
      :data-source="dataSource"
      :loading="loading"
      :pagination="false"
      row-key="id"
      bordered
    >
      <a-table-column title="角色" data-index="name" :width="120">
        <template #default="{ record }">
          <a-tag :color="roleColorMap[(record as Role).name]">
            {{ (record as Role).name }}
          </a-tag>
        </template>
      </a-table-column>

      <a-table-column title="描述" data-index="description" :width="280" />

      <a-table-column title="权限">
        <template #default="{ record }">
          <!-- 按 resource 分组渲染：每组一行，左侧资源名，右侧动作 tag -->
          <div
            v-for="(actions, resource) in groupPermissions((record as Role).permissions)"
            :key="resource"
            class="perm-row"
          >
            <span class="perm-label">{{ resourceLabelMap[resource] || resource }}：</span>
            <a-tag v-for="action in actions" :key="action">
              {{ actionLabelMap[action] || action }}
            </a-tag>
          </div>
          <!-- viewer 角色只有 read 权限，但仍然展示出来 -->
          <span v-if="(record as Role).permissions.length === 0" style="color: #ccc">
            无任何权限
          </span>
        </template>
      </a-table-column>
    </a-table>
  </div>
</template>

<style scoped>
.perm-row {
  margin-bottom: 4px;
  line-height: 28px;
}
.perm-row:last-child {
  margin-bottom: 0;
}
.perm-label {
  display: inline-block;
  width: 60px;
  color: #666;
  font-size: 12px;
}
</style>
