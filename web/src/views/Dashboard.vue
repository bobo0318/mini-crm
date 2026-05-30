<script setup lang="ts">
// 工作台仪表盘（D10）
//
// 数据来源：4 个 /api/stats/* 接口（用 Promise.all 并发拉）
// 图表用：useChart composable 封装 ECharts 生命周期
// 角色差异：sales 只看自己的，admin/viewer 看全公司（后端 SQL 已处理）

import { onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import {
  TeamOutlined,
  UserAddOutlined,
  FundOutlined,
  AccountBookOutlined,
} from '@ant-design/icons-vue'

import {
  getOverview,
  getCustomerTrend,
  getDealFunnel,
  getSalesRank,
  type OverviewStats,
} from '@/api/stats'
import { useChart } from '@/composables/useChart'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

// =====================================================
// 加载态 + 卡片数据
// =====================================================
const loading = ref(false)
const overview = ref<OverviewStats>({
  totalCustomers: 0,
  newCustomersThisMonth: 0,
  activeDeals: 0,
  weightedExpectedAmount: 0,
})

// =====================================================
// 三个图表 —— 每个独立调用 useChart() 拿到自己的 chartRef 和 setOption
// =====================================================
//
// useChart 的 onMounted 在父组件 onMounted 同步段之前执行（顺序由 setup() 调用顺序决定），
// 所以下方 fetchAll 走到 setXxxOption 时，echarts 实例必然已经 init 完毕
const { chartRef: trendRef, setOption: setTrendOption } = useChart()
const { chartRef: funnelRef, setOption: setFunnelOption } = useChart()
const { chartRef: rankRef, setOption: setRankOption } = useChart()

// D12 build 修复：vue-tsc 没把模板里 ref="trendRef" 等识别为"使用"，
// noUnusedLocals 严格模式下报 unused —— 用 void 明确告诉 TS 这俩用了（模板里）
// 这是 vue-tsc 对解构重命名的已知限制
void trendRef
void funnelRef
void rankRef

// stage 中文名（漏斗图 label 用）
const stageLabelMap: Record<string, string> = {
  lead: '线索',
  contact: '沟通中',
  quote: '已报价',
  won: '已成交',
}

// =====================================================
// 拉数据 + 渲染图表
// =====================================================
async function fetchAll() {
  loading.value = true
  try {
    // ⭐ Promise.all 并发拉 4 个接口 —— 比串行快 4 倍
    // 任何一个失败就走 catch，部分失败的容错可以以后再细化
    const [ov, trend, funnel, rank] = await Promise.all([
      getOverview(),
      getCustomerTrend(),
      getDealFunnel(),
      getSalesRank(),
    ])

    overview.value = ov

    // ---- 折线图：本月新增客户趋势 ----
    setTrendOption({
      tooltip: { trigger: 'axis' },
      grid: { left: 40, right: 20, top: 30, bottom: 30 },
      xAxis: {
        type: 'category',
        // 去掉年份只显示 MM-DD，比 2026-05-30 整段更紧凑
        data: trend.data.map((d) => d.date.slice(5)),
        boundaryGap: false,
      },
      yAxis: {
        type: 'value',
        // 整数 y 轴：客户数是整数，避免 0.5 这种刻度
        minInterval: 1,
      },
      series: [
        {
          name: '新增客户',
          type: 'line',
          smooth: true,
          data: trend.data.map((d) => d.count),
          // areaStyle 加面积填充，视觉比纯线条饱满
          areaStyle: { opacity: 0.3 },
          itemStyle: { color: '#1677ff' },
        },
      ],
    })

    // ---- 漏斗图：商机分布 ----
    setFunnelOption({
      tooltip: { trigger: 'item', formatter: '{b}: {c}' },
      series: [
        {
          name: '商机漏斗',
          type: 'funnel',
          left: '10%',
          width: '80%',
          // sort='none' 保留后端给的固定顺序（lead → contact → quote → won）
          // 默认 sort 是 descending，会按数量重排，把 lead 0 排到最底层，看起来漏斗倒过来了
          sort: 'none',
          gap: 2,
          label: { show: true, position: 'inside' },
          labelLine: { length: 10 },
          data: funnel.data.map((d) => ({
            name: stageLabelMap[d.stage] || d.stage,
            value: d.count,
          })),
        },
      ],
    })

    // ---- 横柱图：销售排行 ----
    // 关键：reverse() —— ECharts 横柱默认从下往上画，反转后金额高的在最上面
    const sortedRank = [...rank.data].reverse()
    setRankOption({
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: unknown) => {
          const arr = params as Array<{ name: string; value: number }>
          const item = arr[0]
          return `${item.name}<br/>¥${item.value.toLocaleString('zh-CN')}`
        },
      },
      grid: { left: 80, right: 60, top: 20, bottom: 30 },
      xAxis: { type: 'value' },
      yAxis: {
        type: 'category',
        data: sortedRank.map((r) => r.ownerName || '未知'),
      },
      series: [
        {
          name: '成交金额',
          type: 'bar',
          data: sortedRank.map((r) => r.totalAmount),
          itemStyle: { color: '#52c41a' },
          // 柱子右侧显示金额
          // 注：ECharts CallbackDataParams 类型 value 是 string|number|Date|array|object|null
          // 太宽不能直接用，formatter 函数本身 cast 一下规避签名不匹配
          label: {
            show: true,
            position: 'right',
            formatter: ((params: { value: number }) =>
              '¥' + params.value.toLocaleString('zh-CN')) as never,
          },
        },
      ],
    })
  } catch {
    message.error('加载仪表盘数据失败')
  } finally {
    loading.value = false
  }
}

onMounted(fetchAll)
</script>

<template>
  <a-spin :spinning="loading">
    <h2>工作台</h2>
    <p class="welcome">
      欢迎，<strong>{{ userStore.userInfo?.name || '用户' }}</strong>
      <a-tag style="margin-left: 8px">{{ userStore.userInfo?.role }}</a-tag>
    </p>

    <!-- 4 个核心指标卡片 -->
    <a-row :gutter="16" class="stat-cards">
      <a-col :span="6">
        <a-card>
          <a-statistic title="总客户数" :value="overview.totalCustomers">
            <template #prefix><TeamOutlined /></template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <a-statistic
            title="本月新增客户"
            :value="overview.newCustomersThisMonth"
            :value-style="{ color: '#3f8600' }"
          >
            <template #prefix><UserAddOutlined /></template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <a-statistic title="进行中商机" :value="overview.activeDeals">
            <template #prefix><FundOutlined /></template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <a-statistic
            title="加权预期金额"
            :value="overview.weightedExpectedAmount"
            :precision="0"
            :value-style="{ color: '#cf1322' }"
          >
            <template #prefix>¥</template>
            <template #suffix>
              <AccountBookOutlined style="font-size: 14px; color: #999" />
            </template>
          </a-statistic>
        </a-card>
      </a-col>
    </a-row>

    <!-- 折线图：占整行 -->
    <a-card title="本月新增客户趋势" class="chart-card">
      <div ref="trendRef" class="chart" style="height: 280px"></div>
    </a-card>

    <!-- 漏斗 + 排行：左右各半 -->
    <a-row :gutter="16">
      <a-col :span="12">
        <a-card title="商机漏斗" class="chart-card">
          <div ref="funnelRef" class="chart" style="height: 320px"></div>
        </a-card>
      </a-col>
      <a-col :span="12">
        <a-card title="销售排行（仅成交商机）" class="chart-card">
          <div ref="rankRef" class="chart" style="height: 320px"></div>
        </a-card>
      </a-col>
    </a-row>
  </a-spin>
</template>

<style scoped>
h2 {
  margin: 0 0 8px;
}
.welcome {
  color: #666;
  margin-bottom: 16px;
}
.stat-cards {
  margin-bottom: 16px;
}
.chart-card {
  margin-bottom: 16px;
}
.chart {
  width: 100%;
}
</style>
