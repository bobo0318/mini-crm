<script setup lang="ts">
// 客户新增/编辑弹窗 —— 新增/编辑共用
//
// 调用方式（父组件）：
//   const modalRef = ref<InstanceType<typeof CustomerFormModal>>()
//   modalRef.value?.open()         // 新增
//   modalRef.value?.open(record)   // 编辑（传当前行数据）
//
// 弹窗关闭后通过 emit('success') 通知父组件刷新列表

import { ref, reactive } from 'vue'
import { message } from 'ant-design-vue'

import { BasicForm } from '@/components/BasicForm'
import {
  createCustomer,
  updateCustomer,
  type Customer,
  type CustomerFormData,
} from '@/api/customer'
import { formSchemas } from './customer.data'

// =====================================================
// emits
// =====================================================
// success 事件：新增或编辑成功后触发，让父组件刷新列表
const emit = defineEmits<{
  success: []
}>()

// =====================================================
// 弹窗开关 + 当前模式
// =====================================================
const open = ref(false)

// editingId：null 表示新增模式；有值表示编辑模式（当前编辑的客户 id）
// 用 null 表示"无"而不是 undefined：编辑模式下 id 必然是数字，单一类型边界更清晰
const editingId = ref<number | null>(null)

// 标题随模式变
const title = ref('新增客户')

// =====================================================
// 表单数据 + schemas
// =====================================================
//
// 表单数据用 reactive 而不是 ref：BasicForm 内部读 modelValue.xxx 需要响应式追踪到子字段
// 用 ref 也可以，但要写 formData.value.xxx，弹窗这种小场景 reactive 更方便
//
// 字段默认值：能填的尽量填合理的默认，否则 BasicForm 内部读到 undefined 会触发 Vue 警告
const formData = reactive<CustomerFormData>({
  name: '',
  company: '',
  level: null,
  industry: '',
  source: '',
  stage: 'lead',
  tags: [],
})

// =====================================================
// 表单 ref：用来调 BasicForm 暴露的 validate / resetFields
// =====================================================
// InstanceType<typeof BasicForm> 让 ref 拿到 BasicForm 的实例类型
// 这样 modalRef.value?.validate() 有完整类型提示
const formRef = ref<InstanceType<typeof BasicForm>>()

// =====================================================
// 提交 loading
// =====================================================
const submitting = ref(false)

// =====================================================
// 暴露 open 方法：父组件用 ref 调
// =====================================================
function openModal(record?: Customer) {
  if (record) {
    // 编辑模式：预填数据
    title.value = '编辑客户'
    editingId.value = record.id
    formData.name = record.name
    formData.company = record.company || ''
    formData.level = record.level
    formData.industry = record.industry || ''
    formData.source = record.source || ''
    formData.stage = record.stage
    formData.tags = record.tags || []
  } else {
    // 新增模式：恢复默认
    title.value = '新增客户'
    editingId.value = null
    formData.name = ''
    formData.company = ''
    formData.level = null
    formData.industry = ''
    formData.source = ''
    formData.stage = 'lead'
    formData.tags = []
  }
  open.value = true
}

defineExpose({ open: openModal })

// =====================================================
// 确认提交
// =====================================================
async function handleOk() {
  try {
    // 1. 触发 BasicForm 校验，校验失败会 reject，外层 catch 接住
    await formRef.value?.validate()

    submitting.value = true

    // 2. 编辑 vs 新增 分流
    if (editingId.value !== null) {
      await updateCustomer(editingId.value, formData)
      message.success('编辑成功')
    } else {
      await createCustomer(formData)
      message.success('新增成功')
    }

    // 3. 关弹窗 + 通知父组件刷新列表
    open.value = false
    emit('success')
  } catch (err) {
    // a-form 的 validate() 失败抛出的是 { errorFields: [...] } 这种对象，不是 Error
    // 校验失败时 BasicForm 内部会自动在字段下方显示红字提示，这里不用 message.error
    // 业务失败（HTTP 错误）有 axios 拦截器统一弹消息，这里也不需要再处理
    // 所以 catch 留空是合理的（什么都不做，只是吞掉 Promise rejection 防止控制台红字）
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
  <!-- v-model:open 是 Ant Design Vue 4 的标准写法（老版本是 v-model:visible） -->
  <!-- :confirm-loading 让 OK 按钮在提交时变 loading 状态 + 禁用 -->
  <!-- :mask-closable="false" 防止用户误点遮罩关掉弹窗丢失输入 -->
  <!-- :destroy-on-close="true" 关闭时销毁内部 BasicForm，下次打开是全新表单， -->
  <!-- 彻底避免上次校验状态/红字残留 -->
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
