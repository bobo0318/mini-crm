<script setup lang="ts">
// 用户管理页（D9 Phase 3）—— admin only
//
// 功能：
//   - 列表展示用户（id / email / name / 角色 tag / 创建时间）
//   - 新增用户（含选角色）
//   - 编辑用户（改 email / name / 角色 / 密码，密码空 = 不改）
//   - 删除用户（⭐ 自己那行不显示删除按钮）

import { onMounted, reactive, ref, computed } from 'vue'
import type { FormInstance } from 'ant-design-vue/es/form'
import { message } from 'ant-design-vue'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons-vue'

import {
  getUserList,
  createUser,
  updateUser,
  deleteUser,
  type AdminUserRow,
} from '@/api/user'
import { getRoleList, type Role } from '@/api/role'
import { useUserStore } from '@/stores/user'
import { formatTime } from '@/utils/format'

const userStore = useUserStore()

// 当前登录用户 id —— 用来在表格里判断"自己那行不让删"
const currentUserId = computed(() => userStore.userInfo?.id ?? -1)

// =====================================================
// 列表状态
// =====================================================
const loading = ref(false)
const dataSource = ref<AdminUserRow[]>([])

// 角色 Select 的 options（异步拉，第一次进页面 + 打开弹窗都会用到）
const roleOptions = ref<{ value: number; label: string }[]>([])

async function fetchList() {
  loading.value = true
  try {
    const res = await getUserList()
    dataSource.value = res.data
  } finally {
    loading.value = false
  }
}

async function fetchRoles() {
  const res = await getRoleList()
  roleOptions.value = res.data.map((r: Role) => ({
    value: r.id,
    label: `${r.name}（${r.description}）`,
  }))
}

// 角色 tag 颜色（跟角色管理页保持一致）
const roleColorMap: Record<string, string> = {
  admin: 'red',
  sales: 'blue',
  viewer: 'default',
}

onMounted(() => {
  fetchList()
  fetchRoles()
})

// =====================================================
// 弹窗状态
// =====================================================
const modalOpen = ref(false)
const modalTitle = ref('新增用户')
const editingId = ref<number | null>(null)
const submitting = ref(false)
const formRef = ref<FormInstance>()

const formData = reactive({
  email: '',
  password: '',
  name: '',
  roleId: undefined as number | undefined,
})

// 校验规则（动态：编辑模式下 password 改为可空）
// 用 computed 让 isEdit 变化时规则自动重算
const isEdit = computed(() => editingId.value !== null)

// 是否是"编辑自己"—— 编辑自己时角色字段禁用（防自锁）
// 跟"自己那行不显示删除按钮"是同一类防御
const isEditingSelf = computed(
  () => editingId.value !== null && editingId.value === currentUserId.value,
)

const formRules = computed(() => ({
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
  ],
  password: isEdit.value
    ? [
        // 编辑模式：空串 = 不改密码；非空必须 ≥ 6 位
        {
          validator: (_rule: unknown, value: string) =>
            !value || value.length >= 6
              ? Promise.resolve()
              : Promise.reject('密码至少 6 位'),
          trigger: 'blur',
        },
      ]
    : [
        // 新增模式：必填 + ≥ 6 位
        { required: true, message: '请输入密码', trigger: 'blur' },
        { min: 6, message: '密码至少 6 位', trigger: 'blur' },
      ],
  roleId: [{ required: true, message: '请选择角色', trigger: 'change' }],
}))

function resetForm() {
  formData.email = ''
  formData.password = ''
  formData.name = ''
  formData.roleId = undefined
}

function openCreate() {
  modalTitle.value = '新增用户'
  editingId.value = null
  resetForm()
  modalOpen.value = true
}

function openEdit(record: AdminUserRow) {
  modalTitle.value = '编辑用户'
  editingId.value = record.id
  formData.email = record.email
  formData.password = ''                          // 编辑时密码留空 = 不改
  formData.name = record.name || ''
  formData.roleId = record.roleId ?? undefined
  modalOpen.value = true
}

async function handleOk() {
  try {
    await formRef.value?.validate()
    submitting.value = true

    if (editingId.value !== null) {
      // 编辑：只把有值的字段提交（password 空串不提交）
      const payload: Record<string, unknown> = {
        email: formData.email,
        name: formData.name,
        roleId: formData.roleId,
      }
      if (formData.password) payload.password = formData.password
      await updateUser(editingId.value, payload)
      message.success('编辑成功')
    } else {
      await createUser({
        email: formData.email,
        password: formData.password,
        name: formData.name || undefined,
        roleId: formData.roleId!,
      })
      message.success('新增成功')
    }

    modalOpen.value = false
    fetchList()
  } catch (err) {
    void err
  } finally {
    submitting.value = false
  }
}

// =====================================================
// 删除
// =====================================================
async function handleDelete(record: AdminUserRow) {
  await deleteUser(record.id)
  message.success('删除成功')
  fetchList()
}
</script>

<template>
  <div>
    <!-- 顶部操作栏 -->
    <div class="toolbar">
      <a-space>
        <a-button v-auth="'user:create'" type="primary" @click="openCreate">
          <template #icon><PlusOutlined /></template>
          新增用户
        </a-button>
        <a-button @click="fetchList">
          <template #icon><ReloadOutlined /></template>
          刷新
        </a-button>
      </a-space>
    </div>

    <!-- 表格 -->
    <a-table
      :data-source="dataSource"
      :loading="loading"
      :pagination="false"
      row-key="id"
      bordered
    >
      <a-table-column title="ID" data-index="id" :width="60" />
      <a-table-column title="邮箱" data-index="email" />
      <a-table-column title="姓名" data-index="name">
        <template #default="{ record }">
          {{ (record as AdminUserRow).name || '-' }}
        </template>
      </a-table-column>
      <a-table-column title="角色" :width="120">
        <template #default="{ record }">
          <a-tag
            v-if="(record as AdminUserRow).roleName"
            :color="roleColorMap[(record as AdminUserRow).roleName!]"
          >
            {{ (record as AdminUserRow).roleName }}
          </a-tag>
          <span v-else style="color: #ccc">-</span>
        </template>
      </a-table-column>
      <a-table-column title="创建时间" :width="180">
        <template #default="{ record }">
          {{ formatTime((record as AdminUserRow).createdAt) }}
        </template>
      </a-table-column>
      <a-table-column title="操作" :width="160" fixed="right">
        <template #default="{ record }">
          <a-button
            v-auth="'user:update'"
            type="link"
            size="small"
            @click="openEdit(record as AdminUserRow)"
          >
            编辑
          </a-button>

          <!-- ⭐ 自己那一行不显示删除按钮（防误删锁死系统）
               这里用 v-if 而不是 v-auth：判断条件是"行 id ≠ 当前用户 id"，跟权限码无关 -->
          <a-popconfirm
            v-if="(record as AdminUserRow).id !== currentUserId"
            :title="`确认删除「${(record as AdminUserRow).email}」？此操作不可恢复`"
            ok-text="确认删除"
            cancel-text="取消"
            ok-type="danger"
            @confirm="handleDelete(record as AdminUserRow)"
          >
            <a-button v-auth="'user:delete'" type="link" size="small" danger>
              删除
            </a-button>
          </a-popconfirm>
        </template>
      </a-table-column>
    </a-table>

    <!-- 新增 / 编辑弹窗 -->
    <a-modal
      v-model:open="modalOpen"
      :title="modalTitle"
      :confirm-loading="submitting"
      :mask-closable="false"
      :destroy-on-close="true"
      width="520px"
      ok-text="保存"
      cancel-text="取消"
      @ok="handleOk"
    >
      <a-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        layout="vertical"
      >
        <a-form-item label="邮箱" name="email">
          <a-input v-model:value="formData.email" placeholder="登录用的邮箱" />
        </a-form-item>

        <a-form-item
          :label="isEdit ? '密码（留空 = 不修改）' : '密码'"
          name="password"
        >
          <a-input-password
            v-model:value="formData.password"
            :placeholder="isEdit ? '留空保持原密码' : '至少 6 位'"
          />
        </a-form-item>

        <a-form-item label="姓名" name="name">
          <a-input v-model:value="formData.name" placeholder="选填" />
        </a-form-item>

        <a-form-item
          :label="isEditingSelf ? '角色（不能修改自己的角色）' : '角色'"
          name="roleId"
        >
          <a-select
            v-model:value="formData.roleId"
            :options="roleOptions"
            :disabled="isEditingSelf"
            placeholder="请选择角色"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.toolbar {
  margin-bottom: 16px;
}
</style>
