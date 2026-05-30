<script setup lang="ts">
// 客户详情页 —— D6 骨架版本
//
// 路由：/customer/:id
// 组件接收的 props 来自路由（routes.ts 里设了 props: true，所以 :id 自动注入）
//
// 当前批次只完成"骨架"：顶部摘要 + 3 个 Tab 空壳
// 下一批次填联系人 Tab，再下一批填跟进记录 Tab

import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeftOutlined } from '@ant-design/icons-vue'
import { theme as antTheme } from 'ant-design-vue'

import { getCustomerDetail, type Customer } from '@/api/customer'
import { stageMap } from './customer.data'
import { formatTime } from '@/utils/format'
import ContactList from './contact/ContactList.vue'
import FollowUpTimeline from './followUp/FollowUpTimeline.vue'

// D11：拿主题 token，给 .tabs 容器背景用
const { token } = antTheme.useToken()

// 路由参数注入
// props: true 让路由的 :id 直接作为组件 props 传进来
// 类型用 string 是因为路由参数永远是字符串，组件内自己 Number() 转换
const props = defineProps<{ id: string }>()

const router = useRouter()

// =====================================================
// 客户数据
// =====================================================
const loading = ref(false)
const customer = ref<Customer | null>(null)

async function fetchCustomer() {
  const cid = Number(props.id)
  if (isNaN(cid)) {
    // id 不是数字（比如有人手敲 /customer/abc），直接踢回列表
    router.replace('/customer/list')
    return
  }

  loading.value = true
  try {
    customer.value = await getCustomerDetail(cid)
  } finally {
    loading.value = false
  }
}

// =====================================================
// 当前激活的 Tab
// =====================================================
// activeTab 用 ref，绑到 a-tabs 的 v-model:activeKey
// 默认进来停在"基本信息"
const activeTab = ref<'info' | 'contacts' | 'followUps'>('info')

// =====================================================
// 派生显示数据
// =====================================================
// stageInfo 从 stageMap 派生（拿 label + color），跟列表页保持视觉一致
const stageInfo = computed(() => {
  if (!customer.value) return null
  return stageMap[customer.value.stage]
})

onMounted(fetchCustomer)
</script>

<template>
  <!-- a-spin 整体包一层 loading，等数据回来再展示内容 -->
  <a-spin :spinning="loading">
    <!-- 顶部返回按钮 + 标题区 -->
    <div class="header">
      <a-button type="link" @click="router.push('/customer/list')">
        <template #icon><ArrowLeftOutlined /></template>
        返回列表
      </a-button>
    </div>

    <!-- 客户摘要卡片 -->
    <!-- v-if 等 customer 加载完再渲染，否则模板里访问 customer.xxx 会报 null -->
    <a-card v-if="customer" class="summary">
      <div class="summary-main">
        <div class="name">{{ customer.name }}</div>
        <div class="company">{{ customer.company || '-' }}</div>
      </div>
      <div class="summary-meta">
        <a-tag v-if="stageInfo" :color="stageInfo.color">
          {{ stageInfo.label }}
        </a-tag>
        <span class="meta-item">客户 ID：{{ customer.id }}</span>
        <span class="meta-item">创建时间：{{ formatTime(customer.createdAt) }}</span>
      </div>
    </a-card>

    <!-- 三个 Tab -->
    <!-- v-model:activeKey 双向绑定当前激活的 tab key -->
    <a-tabs
      v-model:activeKey="activeTab"
      class="tabs"
      :style="{ background: token.colorBgContainer, padding: '0 16px' }"
    >
      <a-tab-pane key="info" tab="基本信息">
        <div class="placeholder">基本信息 Tab（下一批填真内容）</div>
      </a-tab-pane>

      <a-tab-pane key="contacts" tab="联系人">
        <!-- customer.id 是 number，跟 ContactList 的 props.customerId 类型对上 -->
        <ContactList v-if="customer" :customer-id="customer.id" />
      </a-tab-pane>

      <a-tab-pane key="followUps" tab="跟进记录">
        <FollowUpTimeline v-if="customer" :customer-id="customer.id" />
      </a-tab-pane>
    </a-tabs>
  </a-spin>
</template>

<style scoped>
.header {
  margin-bottom: 12px;
}

.summary {
  margin-bottom: 16px;
}

.summary-main {
  display: flex;
  align-items: baseline;
  gap: 16px;
  margin-bottom: 8px;
}
.name {
  font-size: 20px;
  font-weight: 600;
}
.company {
  color: #666;
  font-size: 14px;
}

.summary-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 13px;
  color: #888;
}
.meta-item {
  /* 让分隔更舒服 */
}

/* .tabs 背景走 inline style 的 token.colorBgContainer */

.placeholder {
  padding: 40px 0;
  text-align: center;
  color: #ccc;
}
</style>
