<script setup lang="ts">
// 角色管理页（D9 Phase 3，D12+ 升级到支持自定义角色 CRUD）
//
// 跟旧版区别：
//   - 顶部 a-alert 改成"内置 3 不可改，自定义可改可删"
//   - 加"新增角色"按钮（受 role:create 权限保护）
//   - 表格加"类型"列（内置 / 自定义）
//   - 表格加"操作"列：自定义角色可编辑/删除，内置只可查看（弹窗只读）

import { onMounted, ref } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'

import { getRoleList, deleteRole, type Role } from '@/api/role'
import RoleFormModal from './RoleFormModal.vue'

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
// 弹窗交互
// =====================================================
const formModalRef = ref<InstanceType<typeof RoleFormModal>>()

function handleAdd() {
  formModalRef.value?.open()
}

function handleEditOrView(record: Role) {
  formModalRef.value?.open(record)
}

async function handleDelete(record: Role) {
  Modal.confirm({
    title: `确定删除角色 "${record.name}"？`,
    content: '删除后无法恢复。如果仍有用户绑定该角色，会删除失败。',
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      await deleteRole(record.id)
      message.success('删除成功')
      fetchList()
    },
  })
}

// =====================================================
// 角色显示样式
// =====================================================
//
// 内置三个用固定颜色，自定义角色统一蓝紫色（区别于内置）
function getRoleColor(record: Role): string {
  if (record.type === 'custom') return 'purple'
  // 内置 3 个
  if (record.name === 'admin') return 'red'
  if (record.name === 'sales') return 'blue'
  return 'default' // viewer
}
</script>

<template>
  <div>
    <!-- 顶部说明 + 新增按钮 -->
    <div class="header">
      <a-alert
        message="内置 3 个角色（admin / sales / viewer）不可修改不可删除；可新增自定义角色，权限由你自由勾选。"
        type="info"
        show-icon
      />
      <a-button
        v-auth="'role:create'"
        type="primary"
        @click="handleAdd"
      >
        <template #icon><PlusOutlined /></template>
        新增角色
      </a-button>
    </div>

    <!-- 表格 -->
    <a-table
      :data-source="dataSource"
      :loading="loading"
      :pagination="false"
      row-key="id"
      bordered
    >
      <a-table-column title="角色" data-index="name" :width="160">
        <template #default="{ record }">
          <a-tag :color="getRoleColor(record as Role)">
            {{ (record as Role).name }}
          </a-tag>
        </template>
      </a-table-column>

      <a-table-column title="类型" data-index="type" :width="100">
        <template #default="{ record }">
          <a-tag :color="(record as Role).type === 'system' ? 'orange' : 'green'">
            {{ (record as Role).type === 'system' ? '内置' : '自定义' }}
          </a-tag>
        </template>
      </a-table-column>

      <a-table-column title="描述" data-index="description" />

      <a-table-column title="权限数" :width="100" align="center">
        <template #default="{ record }">
          <span>{{ (record as Role).permissions.length }} 项</span>
          <span v-if="(record as Role).permissions.length === 0" style="color: #ccc; margin-left: 4px">
            （空）
          </span>
        </template>
      </a-table-column>

      <a-table-column title="操作" :width="160" align="center" fixed="right">
        <template #default="{ record }">
          <a-space>
            <a-button type="link" size="small" @click="handleEditOrView(record as Role)">
              {{ (record as Role).type === 'system' ? '查看' : '编辑' }}
            </a-button>
            <a-button
              v-if="(record as Role).type === 'custom'"
              v-auth="'role:delete'"
              type="link"
              size="small"
              danger
              @click="handleDelete(record as Role)"
            >
              删除
            </a-button>
          </a-space>
        </template>
      </a-table-column>
    </a-table>

    <!-- 弹窗 -->
    <RoleFormModal ref="formModalRef" @success="fetchList" />
  </div>
</template>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}
.header .ant-alert {
  flex: 1;
}
</style>
