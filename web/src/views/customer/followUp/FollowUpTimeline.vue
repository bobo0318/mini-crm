<script setup lang="ts">
// 跟进记录时间线
//
// 用 Ant Design Vue 的 a-timeline 展示：
//   每个 timeline item 一条跟进记录
//   item 内容：时间 + 类型 tag + Markdown 渲染的内容 + 下次跟进时间（如果有）
//
// Markdown 渲染用 md-editor-v3 的 MdPreview 组件（只读模式）
// 这样跟编辑器的样式风格统一，不用单独引一个 marked

import { onMounted, ref, watch } from 'vue'
import { PlusOutlined } from '@ant-design/icons-vue'

// MdPreview 是 md-editor-v3 提供的"只读渲染器"
// 跟编辑器（MdEditor）相对，专门用来展示
import { MdPreview } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'

import { getFollowUpList, type FollowUp } from '@/api/followUp'
import { typeMap } from './followUp.data'
import { formatTime } from '@/utils/format'
import FollowUpFormModal from './FollowUpFormModal.vue'

const props = defineProps<{ customerId: number }>()

const loading = ref(false)
const dataSource = ref<FollowUp[]>([])

async function fetchList() {
  loading.value = true
  try {
    dataSource.value = await getFollowUpList(props.customerId)
  } finally {
    loading.value = false
  }
}

watch(() => props.customerId, fetchList)
onMounted(fetchList)

// =====================================================
// 新增弹窗
// =====================================================
const modalRef = ref<InstanceType<typeof FollowUpFormModal>>()

function handleCreate() {
  modalRef.value?.open()
}

function handleModalSuccess() {
  fetchList()
}
</script>

<template>
  <div>
    <!-- 顶部操作栏 -->
    <div class="toolbar">
      <a-button type="primary" @click="handleCreate">
        <template #icon><PlusOutlined /></template>
        新增跟进
      </a-button>
    </div>

    <a-spin :spinning="loading">
      <!-- 空状态：没有跟进记录时显示 -->
      <a-empty v-if="!loading && dataSource.length === 0" description="还没有跟进记录" />

      <!-- 时间线 -->
      <a-timeline v-else>
        <a-timeline-item
          v-for="item in dataSource"
          :key="item.id"
          :color="typeMap[item.type].color"
        >
          <!-- 头部一行：时间 + 类型 tag -->
          <div class="header">
            <span class="time">{{ formatTime(item.createdAt) }}</span>
            <a-tag :color="typeMap[item.type].color">
              {{ typeMap[item.type].label }}
            </a-tag>
          </div>

          <!-- Markdown 内容渲染 -->
          <!-- MdPreview 是只读组件，传 modelValue 渲染对应 markdown -->
          <!-- preview-only 也可以用 :preview-only="true"，这里直接默认行为 -->
          <div class="content">
            <MdPreview :model-value="item.content" />
          </div>

          <!-- 下次跟进时间（如果有） -->
          <div v-if="item.nextAt" class="next">
            下次跟进：{{ formatTime(item.nextAt) }}
          </div>
        </a-timeline-item>
      </a-timeline>
    </a-spin>

    <!-- 弹窗 -->
    <FollowUpFormModal
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
  margin-bottom: 16px;
}

.header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}
.time {
  color: #888;
  font-size: 13px;
}

.content {
  /* MdPreview 默认有自己的样式，限制一下边距 */
  margin: 8px 0;
  padding: 8px 12px;
  background: #fafafa;
  border-radius: 4px;
}

.next {
  margin-top: 8px;
  font-size: 12px;
  color: #1677ff;
}
</style>
