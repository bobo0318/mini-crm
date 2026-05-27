<script setup lang="ts">
// 联系人列表组件（嵌入式）
//
// 用法（父组件）：
//   <ContactList :customer-id="16" />
//
// 设计为"自包含"的——所有状态、刷新、CRUD 流程都在组件内部
// 父组件只负责告诉它"展示哪个客户的联系人"，剩下都不用管
//
// 不做分页/搜索：一个客户通常 ≤ 10 个联系人，不必要

import { onMounted, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'

import {
  deleteContact,
  getContactList,
  type Contact,
} from '@/api/contact'
import { columns } from './contact.data'
import ContactFormModal from './ContactFormModal.vue'

const props = defineProps<{ customerId: number }>()

// =====================================================
// 数据状态
// =====================================================
const loading = ref(false)
const dataSource = ref<Contact[]>([])

async function fetchList() {
  loading.value = true
  try {
    dataSource.value = await getContactList(props.customerId)
  } finally {
    loading.value = false
  }
}

// =====================================================
// customerId 变化时重新拉
// =====================================================
// 当前用法是组件在 CustomerDetail 里，customerId 不会变
// 但加上 watch 让组件更"可嵌入"——以后在别处用也能工作
//
// onMounted 触发首次拉取，watch 兼顾后续 customerId 变化
//
// 不用 immediate: true + 删除 onMounted 是因为：
//   immediate 会在 watch 设置时立刻跑一次，但此时组件可能还没挂载完
//   严谨起见用"onMounted + watch（不 immediate）"组合
watch(() => props.customerId, fetchList)
onMounted(fetchList)

// =====================================================
// 新增 / 编辑
// =====================================================
const modalRef = ref<InstanceType<typeof ContactFormModal>>()

function handleCreate() {
  modalRef.value?.open()
}

function handleEdit(record: Contact) {
  modalRef.value?.open(record)
}

function handleModalSuccess() {
  fetchList()
}

// =====================================================
// 删除
// =====================================================
async function handleDelete(record: Contact) {
  await deleteContact(record.id)
  message.success('删除成功')
  fetchList()
}
</script>

<template>
  <div>
    <!-- 顶部操作栏 -->
    <div class="toolbar">
      <a-button type="primary" @click="handleCreate">
        <template #icon><PlusOutlined /></template>
        新增联系人
      </a-button>
    </div>

    <!-- 表格 -->
    <!-- 不配 :pagination 让它默认显示分页器；不需要分页传 :pagination="false" -->
    <a-table
      :columns="columns"
      :data-source="dataSource"
      :loading="loading"
      :pagination="false"
      row-key="id"
      size="middle"
      bordered
    >
      <template #bodyCell="{ column, record }">
        <!-- 姓名列：如果是主联系人，附加一个 "主" tag -->
        <template v-if="column.key === 'name'">
          {{ (record as Contact).name }}
          <a-tag v-if="(record as Contact).isPrimary" color="red" style="margin-left: 8px">
            主
          </a-tag>
        </template>

        <!-- 操作列 -->
        <template v-else-if="column.key === 'action'">
          <a-button type="link" size="small" @click="handleEdit(record as Contact)">
            编辑
          </a-button>
          <a-popconfirm
            :title="`确认删除联系人「${(record as Contact).name}」吗？`"
            ok-text="确认删除"
            cancel-text="取消"
            ok-type="danger"
            @confirm="handleDelete(record as Contact)"
          >
            <a-button type="link" size="small" danger>删除</a-button>
          </a-popconfirm>
        </template>

        <!-- 其他列：null 兜底显示 - -->
        <template v-else-if="['phone', 'email', 'position'].includes(column.key as string)">
          {{ record[column.dataIndex as string] || '-' }}
        </template>
      </template>
    </a-table>

    <!-- 弹窗 -->
    <ContactFormModal
      ref="modalRef"
      :customer-id="customerId"
      @success="handleModalSuccess"
    />
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}
</style>
