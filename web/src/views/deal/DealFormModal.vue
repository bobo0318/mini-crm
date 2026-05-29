<script setup lang="ts">
// 商机新增/编辑弹窗 —— 新增/编辑共用
//
// 调用方式（父组件）：
//   const modalRef = ref<InstanceType<typeof DealFormModal>>()
//   modalRef.value?.open()         // 新增
//   modalRef.value?.open(record)   // 编辑（传当前 deal 数据）
//
// 跟 CustomerFormModal 同一套路；不同点：
//   - customerId 字段的 Select options 来自后端客户列表（异步），所以 formSchemas 是 ref
//   - 客户列表只在第一次打开弹窗时拉一次，缓存复用

import { ref, reactive } from 'vue'
import { message } from 'ant-design-vue'

import { BasicForm } from '@/components/BasicForm'
import type { FormSchema } from '@/components/BasicForm'
import {
  createDeal,
  updateDeal,
  type Deal,
  type DealFormData,
} from '@/api/deal'
import { getCustomerList, type Customer } from '@/api/customer'
import { getFormSchemas } from './deal.data'

const emit = defineEmits<{
  success: []
}>()

// =====================================================
// 弹窗开关 + 模式
// =====================================================
const open = ref(false)
const editingId = ref<number | null>(null)
const title = ref('新建商机')

// =====================================================
// 客户列表缓存
// =====================================================
//
// 客户列表来自 /api/customers，每次打开弹窗都拉一次会浪费
// 用一个外层 ref 缓存：第一次拉了存进去，后面打开直接用
//
// 局限：用户在别处新增了客户，这里看不到（要刷新页面）
// D9 加客户管理后如果有"新增客户后即时反映在商机弹窗"的需求再加 store/事件总线
const customerCache = ref<Customer[]>([])
const customerLoaded = ref(false)

async function ensureCustomers() {
  if (customerLoaded.value) return
  // pageSize 给大点，一次拉完所有客户（学习项目客户量小）
  const res = await getCustomerList({ pageSize: 9999 })
  customerCache.value = res.data
  customerLoaded.value = true
}

// =====================================================
// 表单 schemas（响应式 —— 客户列表异步到达后会重新赋值）
// =====================================================
const formSchemas = ref<FormSchema[]>([])

// =====================================================
// 表单数据
// =====================================================
//
// customerId 用 null 不是 undefined：
//   a-select 的 v-model:value 传 null 表示"未选"
//   undefined 会被 a-select 当成"未受控"，导致用户清空选项后再选不上
const formData = reactive<DealFormData>({
  customerId: null as unknown as number,  // 类型上 number，运行时初始是 null
  title: '',
  amount: null,
  stage: undefined,    // 不传 → 后端走默认 'lead'
  probability: null,
})

// 用一个独立函数做"恢复默认值"，新增和取消都能用
function resetFormData() {
  formData.customerId = null as unknown as number
  formData.title = ''
  formData.amount = null
  formData.stage = undefined
  formData.probability = null
}

// =====================================================
// 表单 ref + 提交 loading
// =====================================================
const formRef = ref<InstanceType<typeof BasicForm>>()
const submitting = ref(false)

// =====================================================
// 暴露给父组件的 open 方法
// =====================================================
async function openModal(record?: Deal) {
  // 1. 确保客户列表已加载（首次会发请求，之后直接复用缓存）
  await ensureCustomers()

  // 2. 用最新的客户列表生成 schemas
  //    每次 open 都重新生成 —— 简单可靠；如果客户列表变了，下次打开自动反映
  formSchemas.value = getFormSchemas(customerCache.value)

  // 3. 模式分流：预填数据 or 重置默认
  if (record) {
    title.value = '编辑商机'
    editingId.value = record.id
    formData.customerId = record.customerId
    formData.title = record.title
    formData.amount = record.amount
    formData.stage = record.stage
    formData.probability = record.probability
  } else {
    title.value = '新建商机'
    editingId.value = null
    resetFormData()
  }

  open.value = true
}

defineExpose({ open: openModal })

// =====================================================
// 确认提交
// =====================================================
async function handleOk() {
  try {
    await formRef.value?.validate()
    submitting.value = true

    if (editingId.value !== null) {
      await updateDeal(editingId.value, formData)
      message.success('编辑成功')
    } else {
      await createDeal(formData)
      message.success('新建成功')
    }

    open.value = false
    emit('success')
  } catch (err) {
    // 校验失败 / 业务错误（拦截器已弹消息）都吞掉
    void err
  } finally {
    submitting.value = false
  }
}

function handleCancel() {
  open.value = false
}
</script>

<template>
  <a-modal
    v-model:open="open"
    :title="title"
    :confirm-loading="submitting"
    :mask-closable="false"
    :destroy-on-close="true"
    width="720px"
    ok-text="保存"
    cancel-text="取消"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <BasicForm
      ref="formRef"
      v-model:model-value="formData"
      :schemas="formSchemas"
    />
  </a-modal>
</template>
