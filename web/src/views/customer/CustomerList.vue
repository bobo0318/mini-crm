<script setup lang="ts">
// 客户列表页（D4 真实版本）
//
// 功能：
//   - 搜索（按 name 或 company 模糊匹配）
//   - 分页（页码切换、每页条数切换都会重新请求）
//   - 刷新（重新拉当前页）
//   - 表格展示：level / stage / tags 用 a-tag 染色
//
// 流程：
//   onMounted → 拉第 1 页 → 用户改搜索/翻页 → 重新拉 → 渲染

import { onMounted, reactive, ref } from 'vue'
import type { TablePaginationConfig, TableColumnsType } from 'ant-design-vue'
import { ReloadOutlined } from '@ant-design/icons-vue'

import { getCustomerList, type Customer } from '../../api/customer'

// =====================================================
// 表格数据 & 加载状态
// =====================================================
//
// loading：a-table 的 :loading 绑这个，加载时表格上面盖一层半透明 + 转圈
// dataSource：表格的行数据，类型就是 Customer[]
//
// 注意一个常见小坑：列表数据要用 ref<Customer[]>([])，初始值给一个空数组；
// 给 undefined 会让 a-table 短暂报警告（找不到 length）
const loading = ref(false)
const dataSource = ref<Customer[]>([])

// =====================================================
// 分页状态
// =====================================================
//
// 用 reactive 而不是分散的 ref，是因为这几个字段经常一起改、一起读
// total 由后端返回填进来，current / pageSize 由用户操作改
//
// 整个 pagination 对象会直接传给 a-table 的 :pagination prop，
// 所以字段名必须用 Ant Design 约定的：current（当前页）/ pageSize / total / showSizeChanger 等
const pagination = reactive<TablePaginationConfig>({
  current: 1,
  pageSize: 10,
  total: 0,
  // 显示"每页 X 条"的下拉切换器
  showSizeChanger: true,
  // 显示"共 N 条"
  showTotal: (total) => `共 ${total} 条`,
})

// =====================================================
// 搜索关键字
// =====================================================
const keyword = ref('')

// =====================================================
// 表格列定义
// =====================================================
//
// TableColumnsType 是 ant-design-vue 给的列类型，让 dataIndex / customRender 有提示
//
// 设计取舍：
//   - 显示 ID 列：开发期方便排查，正式产品可能会去掉
//   - level / stage 列宽固定，否则会被中文长短撑得参差不齐
//   - createdAt 列尽量给宽点，本地化后字符串挺长的
const columns: TableColumnsType = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
  { title: '姓名', dataIndex: 'name', key: 'name', width: 100 },
  { title: '公司', dataIndex: 'company', key: 'company', width: 160 },
  { title: '等级', dataIndex: 'level', key: 'level', width: 80 },
  { title: '行业', dataIndex: 'industry', key: 'industry', width: 100 },
  { title: '阶段', dataIndex: 'stage', key: 'stage', width: 100 },
  { title: '标签', dataIndex: 'tags', key: 'tags', width: 200 },
  { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 180 },
]

// =====================================================
// 枚举值 → 中文 + 颜色映射
// =====================================================
//
// stage 五个枚举值翻译成中文标签和对应颜色
// 颜色用的是 Ant Design 预设颜色名（"blue" / "green" 等），a-tag 接受这些字符串
const stageMap: Record<Customer['stage'], { label: string; color: string }> = {
  lead: { label: '线索', color: 'default' },
  contact: { label: '联系中', color: 'blue' },
  qualified: { label: '已意向', color: 'purple' },
  won: { label: '成交', color: 'green' },
  lost: { label: '流失', color: 'red' },
}

// level A/B/C 三档对应不同颜色（A 最重要 → 红，B 次 → 橙，C 普通 → 蓝）
const levelColorMap: Record<NonNullable<Customer['level']>, string> = {
  A: 'red',
  B: 'orange',
  C: 'blue',
}

// =====================================================
// 时间格式化
// =====================================================
//
// 后端给 ISO 字符串，直接用 Date 构造再 toLocaleString 转成本地时区
// 不引入 dayjs/moment 是为了少一个依赖；后面真的需要复杂格式化再装
function formatTime(iso: string) {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('zh-CN', { hour12: false })
}

// =====================================================
// 拉数据
// =====================================================
//
// 单独抽成函数：搜索、翻页、刷新都调它，参数都从外层响应式状态里取
async function fetchList() {
  loading.value = true
  try {
    const res = await getCustomerList({
      page: pagination.current,
      pageSize: pagination.pageSize,
      keyword: keyword.value,
    })
    dataSource.value = res.data
    pagination.total = res.total
  } finally {
    // 不管成功失败，loading 都要关掉
    // 错误提示由 axios 响应拦截器统一弹，这里不用再 catch + message.error
    loading.value = false
  }
}

// =====================================================
// 事件处理
// =====================================================

// a-table 翻页 / 改每页条数 时触发
// 参数 pag 是 Ant Design 给的"用户操作后的最新分页对象"，
// 直接同步到我们的 pagination 状态，然后重新拉数据
function handleTableChange(pag: TablePaginationConfig) {
  pagination.current = pag.current || 1
  pagination.pageSize = pag.pageSize || 10
  fetchList()
}

// 搜索：用户按回车 / 点搜索按钮触发
// 搜索时回到第 1 页（不然搜出来的结果数变少，留在第 3 页可能没数据）
function handleSearch() {
  pagination.current = 1
  fetchList()
}

// 刷新：保持当前页 + 关键字，重拉一次
function handleRefresh() {
  fetchList()
}

// =====================================================
// 首次进入页面：拉第 1 页
// =====================================================
onMounted(fetchList)
</script>

<template>
  <div>
    <!-- 顶部操作栏 -->
    <div class="toolbar">
      <!-- a-input-search：输入框 + 搜索按钮的组合控件 -->
      <!-- @search：点搜索按钮 或 按回车 时触发，回调参数是当前输入值 -->
      <!-- v-model:value：双向绑定到 keyword（Ant Design Vue 用 :value，不是 v-model="" 简写） -->
      <a-input-search
        v-model:value="keyword"
        placeholder="搜索姓名或公司"
        style="width: 280px"
        enter-button
        allow-clear
        @search="handleSearch"
      />

      <!-- 刷新按钮：靠右 -->
      <a-button @click="handleRefresh">
        <template #icon><ReloadOutlined /></template>
        刷新
      </a-button>
    </div>

    <!-- 表格 -->
    <!-- row-key 告诉 a-table 用哪个字段作为每行的唯一标识（Vue diff 用） -->
    <!-- bordered：加边框，中后台风格更明显 -->
    <a-table
      :columns="columns"
      :data-source="dataSource"
      :pagination="pagination"
      :loading="loading"
      row-key="id"
      bordered
      @change="handleTableChange"
    >
      <!-- 自定义单元格渲染 -->
      <!-- a-table 的 #bodyCell 具名插槽：每渲染一行的每一列都触发一次 -->
      <!-- column 是当前列定义，record 是当前行数据 -->
      <template #bodyCell="{ column, record }">
        <!-- level 列：用带颜色的 a-tag 显示 A/B/C -->
        <template v-if="column.key === 'level'">
          <a-tag v-if="record.level" :color="levelColorMap[record.level as 'A' | 'B' | 'C']">
            {{ record.level }}
          </a-tag>
          <span v-else style="color: #ccc">-</span>
        </template>

        <!-- stage 列：用 stageMap 把枚举值翻译成中文 + 上色 -->
        <template v-else-if="column.key === 'stage'">
          <a-tag :color="stageMap[record.stage as Customer['stage']].color">
            {{ stageMap[record.stage as Customer['stage']].label }}
          </a-tag>
        </template>

        <!-- tags 列：数组渲染成多个小 tag -->
        <template v-else-if="column.key === 'tags'">
          <template v-if="record.tags && record.tags.length">
            <a-tag v-for="tag in record.tags" :key="tag">{{ tag }}</a-tag>
          </template>
          <span v-else style="color: #ccc">-</span>
        </template>

        <!-- createdAt 列：格式化时间 -->
        <template v-else-if="column.key === 'createdAt'">
          {{ formatTime(record.createdAt) }}
        </template>

        <!-- 其他列没有 v-else，会走 a-table 默认渲染（直接显示 dataIndex 对应字段） -->
        <!-- 但 company / industry 可能是 null，统一兜底显示 "-" 更友好 -->
        <template v-else-if="['company', 'industry'].includes(column.key as string)">
          {{ record[column.dataIndex as string] || '-' }}
        </template>
      </template>
    </a-table>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
</style>
