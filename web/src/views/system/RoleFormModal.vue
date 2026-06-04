<script setup lang="ts">
// 角色新增 / 编辑弹窗（D12+）
//
// 核心：a-tree :checkable 勾选权限
//
// 对外 API：暴露 open(record?) —— 无参数 = 新增模式，传 Role = 编辑模式
//
// 数据流：
//   1. open() 设置 mode + 把现有 permissions 反查出 checkedKeys
//   2. a-tree 内部维护 checkedKeys（含父节点 key 和叶子节点 key）
//   3. 提交时用 extractLeafPermissions 过滤出真权限码（带冒号的叶子）传给后端

import { computed, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import type { FormInstance, Rule } from 'ant-design-vue/es/form'

import { createRole, updateRole, type Role } from '@/api/role'
import {
  PERMISSION_TREE,
  filterTreeByRoleType,
  extractLeafPermissions,
} from './permission-tree.data'

const emit = defineEmits<{
  success: []
}>()

// =====================================================
// 弹窗状态
// =====================================================
const visible = ref(false)
const submitting = ref(false)
const mode = ref<'create' | 'edit'>('create')
const editingId = ref<number | null>(null)

// 当前操作角色的 type（编辑时跟着 record；新增时一律 custom）
const currentRoleType = ref<'system' | 'custom'>('custom')

const formRef = ref<FormInstance>()
const form = reactive({
  name: '',
  description: '',
})

// a-tree 勾选状态
// 注意：含父节点 key（'customer'）和叶子节点 key（'customer:read'），提交前要过滤
const checkedKeys = ref<(string | number)[]>([])

// 按当前 role type 过滤后的树
const treeData = computed(() => filterTreeByRoleType(PERMISSION_TREE, currentRoleType.value))

// 标题
//   新增：    新增角色
//   只读查看：查看角色 - admin（内置 3 个角色）
//   编辑：    编辑角色 - 客服（自定义角色）
const title = computed(() => {
  if (mode.value === 'create') return '新增角色'
  if (isReadonly.value) return `查看角色 - ${form.name}`
  return `编辑角色 - ${form.name}`
})

// 是否可编辑（内置角色虽然能查看，但所有字段 disabled）
const isReadonly = computed(() => currentRoleType.value === 'system')

// =====================================================
// 表单校验
// =====================================================
const rules: Record<string, Rule[]> = {
  name: [
    { required: true, message: '角色名不能为空', trigger: 'blur' },
    { max: 50, message: '角色名最多 50 字', trigger: 'blur' },
  ],
}

// =====================================================
// 对外暴露：打开弹窗
// =====================================================
// 无参 = 新增；传 record = 编辑（如果 record.type==='system' 进只读模式）
function open(record?: Role) {
  visible.value = true

  if (record) {
    mode.value = 'edit'
    editingId.value = record.id
    currentRoleType.value = record.type
    form.name = record.name
    form.description = record.description
    // 把现有 permissions（叶子）直接放进 checkedKeys —— a-tree 会自动算出父节点状态
    checkedKeys.value = [...record.permissions]
  } else {
    mode.value = 'create'
    editingId.value = null
    currentRoleType.value = 'custom'
    form.name = ''
    form.description = ''
    checkedKeys.value = []
  }
}

defineExpose({ open })

// =====================================================
// 取消 / 提交
// =====================================================
function handleCancel() {
  visible.value = false
}

async function handleOk() {
  // 内置角色只读，没有提交按钮但保险起见拦一下
  if (isReadonly.value) {
    visible.value = false
    return
  }

  try {
    await formRef.value?.validate()
  } catch {
    return // 校验失败，红字提示由 a-form 处理
  }

  // 从 a-tree 勾中的 keys 里提取真权限码（带冒号的叶子节点）
  const permissions = extractLeafPermissions(checkedKeys.value)

  if (permissions.length === 0) {
    message.warning('请至少勾选一个权限')
    return
  }

  submitting.value = true
  try {
    if (mode.value === 'create') {
      await createRole({
        name: form.name,
        description: form.description,
        permissions,
      })
      message.success('新增成功')
    } else {
      await updateRole(editingId.value!, {
        name: form.name,
        description: form.description,
        permissions,
      })
      message.success('修改成功')
    }
    visible.value = false
    emit('success')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <a-modal
    v-model:open="visible"
    :title="title"
    :width="720"
    :confirm-loading="submitting"
    :destroy-on-close="true"
    :ok-text="isReadonly ? '关闭' : '确定'"
    cancel-text="取消"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <!-- 内置角色只读提示 -->
    <a-alert
      v-if="isReadonly"
      message="内置角色不可修改"
      description="本系统内置 admin / sales / viewer 三个角色，权限由系统维护，无法在线编辑。"
      type="info"
      show-icon
      style="margin-bottom: 16px"
    />

    <!-- 表单 -->
    <a-form
      ref="formRef"
      :model="form"
      :rules="rules"
      layout="vertical"
      :disabled="isReadonly"
    >
      <a-form-item label="角色名" name="name">
        <a-input
          v-model:value="form.name"
          placeholder="如：客服 / 主管"
          :max-length="50"
        />
      </a-form-item>

      <a-form-item label="描述" name="description">
        <a-textarea
          v-model:value="form.description"
          placeholder="可填这个角色干啥用、跟其他角色的区别"
          :rows="2"
          :max-length="200"
          show-count
        />
      </a-form-item>

      <a-form-item label="权限">
        <a-tree
          v-model:checked-keys="checkedKeys"
          :tree-data="treeData"
          checkable
          :default-expand-all="true"
          :disabled="isReadonly"
        />
        <div class="hint">
          勾选父节点 = 全选子项；自定义角色看不到"系统级权限"（用户增删 / 角色增删改）
        </div>
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<style scoped>
.hint {
  margin-top: 8px;
  font-size: 12px;
  color: #999;
}
</style>
