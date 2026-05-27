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
import { useRouter } from 'vue-router'
import type { TablePaginationConfig } from 'ant-design-vue'
import {
  DownloadOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons-vue'

import { message } from 'ant-design-vue'

import { deleteCustomer, getCustomerList, type Customer } from '@/api/customer'
import { exportToExcel } from '@/utils/excel'
import { formatTime } from '@/utils/format'
import { columns, levelColorMap, stageMap } from './customer.data'
import CustomerFormModal from './CustomerFormModal.vue'

const router = useRouter()

// 点姓名链接 → 进详情页
function goDetail(record: Customer) {
  router.push(`/customer/${record.id}`)
}

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
// 新增 / 编辑：打开弹窗
// =====================================================
// 拿到 CustomerFormModal 实例的 ref，调它暴露的 open 方法
// InstanceType<typeof CustomerFormModal> 让 TS 知道这个 ref 上能调哪些方法
const modalRef = ref<InstanceType<typeof CustomerFormModal>>()

function handleCreate() {
  // 不传参数 → 新增模式
  modalRef.value?.open()
}

function handleEdit(record: Customer) {
  // 传当前行 → 编辑模式（弹窗内会预填数据）
  modalRef.value?.open(record)
}

// 弹窗 success 事件：新增或编辑完成，刷新列表
// 编辑保持当前页；新增跳回第 1 页（按 createdAt 倒序排，新增的会在第 1 页最上面）
function handleModalSuccess() {
  fetchList()
}

// =====================================================
// 删除
// =====================================================
// a-popconfirm 的 @confirm 触发后调这里
//
// 边界处理：
//   如果当前页只剩 1 条且不是第 1 页，删除后该页就空了
//   把 current 减 1，避免出现"分页器显示在第 2 页但表格是空"的尴尬状态
async function handleDelete(record: Customer) {
  await deleteCustomer(record.id)
  message.success('删除成功')

  if (dataSource.value.length === 1 && (pagination.current || 1) > 1) {
    pagination.current = (pagination.current || 1) - 1
  }
  fetchList()
}

// =====================================================
// Excel 导出
// =====================================================
// 范围："导出筛选后的全部" —— 带当前搜索关键字，传一个大 pageSize 一次拉完
//
// 列定义跟表格显示对齐，但有几个差异：
//   - 增加 source 列（表格因空间紧没显示，Excel 不缺空间）
//   - stage / level / tags / createdAt 都做 format 转换
const exporting = ref(false)

async function handleExport() {
  exporting.value = true
  try {
    // 拉全部（pageSize 给一个很大的数字一次拉完）
    // 真实业务如果数据量超大（>1w 条），应该分批拉 + 用 stream/web worker 避免卡浏览器
    // 学习项目这一步先简化
    const res = await getCustomerList({
      page: 1,
      pageSize: 9999,
      keyword: keyword.value,
    })

    exportToExcel<Customer>({
      data: res.data,
      filename: `客户列表_${new Date().toISOString().slice(0, 10)}.xlsx`,
      columns: [
        { key: 'id', title: 'ID' },
        { key: 'name', title: '姓名' },
        { key: 'company', title: '公司' },
        { key: 'level', title: '等级' },
        { key: 'industry', title: '行业' },
        { key: 'source', title: '来源' },
        // 阶段：枚举值翻译成中文
        {
          key: 'stage',
          title: '阶段',
          format: (val) => stageMap[val as Customer['stage']].label,
        },
        // 标签：数组拼成字符串
        {
          key: 'tags',
          title: '标签',
          format: (val) => ((val as string[] | null) || []).join('、'),
        },
        // 创建时间：ISO 字符串 → 本地化格式
        {
          key: 'createdAt',
          title: '创建时间',
          format: (val) => formatTime(val as string),
        },
      ],
    })

    message.success(`导出成功，共 ${res.data.length} 条`)
  } finally {
    exporting.value = false
  }
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
      <!-- 左侧：搜索 -->
      <a-input-search
        v-model:value="keyword"
        placeholder="搜索姓名或公司"
        style="width: 280px"
        enter-button
        allow-clear
        @search="handleSearch"
      />

      <!-- 右侧：操作按钮组 -->
      <a-space>
        <a-button type="primary" @click="handleCreate">
          <template #icon><PlusOutlined /></template>
          新增客户
        </a-button>
        <a-button :loading="exporting" @click="handleExport">
          <template #icon><DownloadOutlined /></template>
          导出
        </a-button>
        <a-button @click="handleRefresh">
          <template #icon><ReloadOutlined /></template>
          刷新
        </a-button>
      </a-space>
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
        <!-- 姓名列：点击进详情页 -->
        <template v-if="column.key === 'name'">
          <a-button type="link" size="small" @click="goDetail(record as Customer)">
            {{ (record as Customer).name }}
          </a-button>
        </template>

        <!-- level 列：用带颜色的 a-tag 显示 A/B/C -->
        <template v-else-if="column.key === 'level'">
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

        <!-- 操作列：编辑 + 删除 -->
        <template v-else-if="column.key === 'action'">
          <a-button type="link" size="small" @click="handleEdit(record as Customer)">
            编辑
          </a-button>

          <!-- a-popconfirm 包在按钮外层，点按钮不直接删，先弹气泡问 -->
          <!-- @confirm 是用户点"确定"后才触发 -->
          <!-- ok-type="danger" 让确定按钮也变红，强化"危险操作"语义 -->
          <a-popconfirm
            :title="`确认删除「${(record as Customer).name}」吗？此操作不可恢复`"
            ok-text="确认删除"
            cancel-text="取消"
            ok-type="danger"
            @confirm="handleDelete(record as Customer)"
          >
            <a-button type="link" size="small" danger>
              删除
            </a-button>
          </a-popconfirm>
        </template>

        <!-- 其他列没有 v-else，会走 a-table 默认渲染（直接显示 dataIndex 对应字段） -->
        <!-- 但 company / industry 可能是 null，统一兜底显示 "-" 更友好 -->
        <template v-else-if="['company', 'industry'].includes(column.key as string)">
          {{ record[column.dataIndex as string] || '-' }}
        </template>
      </template>
    </a-table>

    <!-- 新增/编辑共用弹窗 -->
    <!-- ref 拿到组件实例，可以调它暴露的 open 方法 -->
    <!-- @success 事件：弹窗内提交成功后触发，刷新列表 -->
    <CustomerFormModal ref="modalRef" @success="handleModalSuccess" />
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
