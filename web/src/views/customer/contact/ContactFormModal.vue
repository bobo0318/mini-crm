<script setup lang="ts">
// 联系人新增/编辑弹窗
//
// 用法（父组件）：
//   const modalRef = ref<InstanceType<typeof ContactFormModal>>()
//   <ContactFormModal :customer-id="..." ref="modalRef" @success="..." />
//   modalRef.value?.open()         新增
//   modalRef.value?.open(record)   编辑

import { ref, reactive } from 'vue'
import { message } from 'ant-design-vue'

import { BasicForm } from '@/components/BasicForm'
import {
  createContact,
  updateContact,
  type Contact,
  type ContactFormData,
} from '@/api/contact'
import { formSchemas } from './contact.data'

// 必须知道给哪个客户新增——customer_id 不能让用户在弹窗里选
const props = defineProps<{ customerId: number }>()

const emit = defineEmits<{ success: [] }>()

const open = ref(false)
const editingId = ref<number | null>(null)
const title = ref('新增联系人')

const formData = reactive<ContactFormData>({
  name: '',
  phone: '',
  email: '',
  position: '',
  isPrimary: false,
})

const formRef = ref<InstanceType<typeof BasicForm>>()
const submitting = ref(false)

function openModal(record?: Contact) {
  if (record) {
    title.value = '编辑联系人'
    editingId.value = record.id
    formData.name = record.name
    formData.phone = record.phone || ''
    formData.email = record.email || ''
    formData.position = record.position || ''
    formData.isPrimary = record.isPrimary
  } else {
    title.value = '新增联系人'
    editingId.value = null
    formData.name = ''
    formData.phone = ''
    formData.email = ''
    formData.position = ''
    formData.isPrimary = false
  }
  open.value = true
}

defineExpose({ open: openModal })

async function handleOk() {
  try {
    await formRef.value?.validate()
    submitting.value = true
    if (editingId.value !== null) {
      await updateContact(editingId.value, formData)
      message.success('编辑成功')
    } else {
      await createContact(props.customerId, formData)
      message.success('新增成功')
    }
    open.value = false
    emit('success')
  } catch (err) {
    // 校验失败 BasicForm 自己弹红字，HTTP 错误由 axios 拦截器统一弹
    void err
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <!-- destroy-on-close: 关闭时销毁内部组件，下次打开会重新挂载 BasicForm —— -->
  <!-- 彻底避免上次校验状态残留（红字闪烁）的根本解法 -->
  <a-modal
    v-model:open="open"
    :title="title"
    :confirm-loading="submitting"
    :mask-closable="false"
    :destroy-on-close="true"
    width="640px"
    ok-text="保存"
    cancel-text="取消"
    @ok="handleOk"
  >
    <BasicForm
      ref="formRef"
      v-model:model-value="formData"
      :schemas="formSchemas"
    />
  </a-modal>
</template>
