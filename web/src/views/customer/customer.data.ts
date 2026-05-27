// 客户模块的"数据/配置"层
//
// 这里放：表格列定义、表单 schemas、枚举映射、Select options
// 不放：响应式状态（ref/reactive）、事件 handler、生命周期 —— 那些留在 .vue 里
//
// 拆出来的好处：
//   1. CustomerList.vue 里只剩业务逻辑，文件变短、关注点清晰
//   2. CustomerList.vue / CustomerFormModal.vue / 未来的导出/详情页 共享这里的数据
//   3. 改一个枚举（比如新增一个销售阶段），改这一处就够

import type { TableColumnsType } from 'ant-design-vue'

import type { FormSchema } from '../../components/BasicForm'
import type { Customer } from '../../api/customer'

// =====================================================
// 单一数据源：销售阶段
// =====================================================
//
// "单一数据源派生多视图"模式：
//   STAGE_LIST 是源头，下面的 stageMap / STAGE_OPTIONS 都是从这一份数据派生出来的
// 加一个新阶段只改 STAGE_LIST 一处，表格染色、Select 下拉、Excel 导出全自动跟上
type StageItem = {
  value: Customer['stage']
  label: string
  color: string  // a-tag 的颜色名（'blue'/'green' 等 Ant Design 预设色）
}

export const STAGE_LIST: StageItem[] = [
  { value: 'lead', label: '线索', color: 'default' },
  { value: 'contact', label: '联系中', color: 'blue' },
  { value: 'qualified', label: '已意向', color: 'purple' },
  { value: 'won', label: '成交', color: 'green' },
  { value: 'lost', label: '流失', color: 'red' },
]

// 派生 1：表格染色用 —— 给定 stage 值快速拿到 label + color
// Object.fromEntries 把 [[k, v], [k, v]] 变成 { k: v, k: v }
// as Record<...> 是因为 fromEntries 默认推导成 { [k: string]: ... }，我们要更严格的字面量 key 类型
export const stageMap = Object.fromEntries(
  STAGE_LIST.map((s) => [s.value, { label: s.label, color: s.color }]),
) as Record<Customer['stage'], { label: string; color: string }>

// 派生 2：a-select 的 options 用
export const STAGE_OPTIONS = STAGE_LIST.map(({ value, label }) => ({ value, label }))

// =====================================================
// 单一数据源：客户等级
// =====================================================
//
// 跟 stage 的设计一样，但有个细节差异：
//   - 表格里展示 'A' / 'B' / 'C'（已经用 Tag 颜色区分了，不必再加文字说明）
//   - Select 里展示 'A（重点）' / 'B（一般）' / 'C（普通）'（让用户填表时知道含义）
// 所以 LevelItem 有两个 label 字段（label / selectLabel）
type LevelItem = {
  value: NonNullable<Customer['level']>  // 'A' | 'B' | 'C'
  selectLabel: string                     // Select 用的长 label
  color: string
}

export const LEVEL_LIST: LevelItem[] = [
  { value: 'A', selectLabel: 'A（重点）', color: 'red' },
  { value: 'B', selectLabel: 'B（一般）', color: 'orange' },
  { value: 'C', selectLabel: 'C（普通）', color: 'blue' },
]

// 派生：表格染色用
export const levelColorMap = Object.fromEntries(
  LEVEL_LIST.map((l) => [l.value, l.color]),
) as Record<NonNullable<Customer['level']>, string>

// 派生：a-select 的 options
export const LEVEL_OPTIONS = LEVEL_LIST.map(({ value, selectLabel }) => ({
  value,
  label: selectLabel,
}))

// =====================================================
// 表格列定义
// =====================================================
//
// 注意 source（来源）字段：故意不在表格里展示
// DB / 新增编辑弹窗 / Excel 导出 三处都有，但表格故意省略
// 这是中后台常见取舍："表格只显示核心字段（用户最常用来过滤/识别的），详情和导出含全字段"
// 原因：屏幕宽度有限，列太多用户反而看不过来；想看 source 的话点编辑或导出 Excel
// 后续如果加新字段（如 phone / address），优先级低的也按这个规则只放编辑弹窗 + 导出
export const columns: TableColumnsType = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
  { title: '姓名', dataIndex: 'name', key: 'name', width: 100 },
  { title: '公司', dataIndex: 'company', key: 'company', width: 160 },
  { title: '等级', dataIndex: 'level', key: 'level', width: 80 },
  { title: '行业', dataIndex: 'industry', key: 'industry', width: 100 },
  { title: '阶段', dataIndex: 'stage', key: 'stage', width: 100 },
  { title: '标签', dataIndex: 'tags', key: 'tags', width: 200 },
  { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 180 },
  // 操作列：fixed: 'right' 让它在表格水平滚动时固定在右侧
  { title: '操作', key: 'action', width: 120, fixed: 'right' },
]

// =====================================================
// 新增 / 编辑弹窗的表单字段配置
// =====================================================
//
// 这是给 BasicForm 用的 schemas 数组：描述每个字段是什么类型的输入、什么 placeholder、是否必填等
// 抽到这里后，CustomerFormModal.vue 里只剩"打开/关闭/提交"这种业务逻辑
export const formSchemas: FormSchema[] = [
  {
    field: 'name',
    label: '姓名',
    component: 'Input',
    required: true,
    span: 12,
    componentProps: { placeholder: '请输入客户姓名', allowClear: true },
  },
  {
    field: 'company',
    label: '公司',
    component: 'Input',
    span: 12,
    componentProps: { placeholder: '可空（个人客户填不填都行）', allowClear: true },
  },
  {
    field: 'level',
    label: '等级',
    component: 'Select',
    span: 12,
    componentProps: {
      placeholder: '请选择等级',
      allowClear: true,
      // 用上面派生出来的 options，跟表格染色的颜色映射共享同一份数据源
      options: LEVEL_OPTIONS,
    },
  },
  {
    field: 'stage',
    label: '销售阶段',
    component: 'Select',
    span: 12,
    componentProps: {
      placeholder: '请选择阶段',
      options: STAGE_OPTIONS,
    },
  },
  {
    field: 'industry',
    label: '行业',
    component: 'Input',
    span: 12,
    componentProps: { placeholder: '如：互联网、制造业', allowClear: true },
  },
  {
    field: 'source',
    label: '来源',
    component: 'Input',
    span: 12,
    componentProps: { placeholder: '如：官网注册、展会', allowClear: true },
  },
  {
    field: 'tags',
    label: '标签',
    component: 'Select',
    span: 24,
    componentProps: {
      // mode: 'tags' 让 Select 支持任意输入新值（按回车确认）
      mode: 'tags',
      placeholder: '输入标签后按回车（可加多个）',
      options: [],
      style: 'width: 100%',
    },
  },
]
