// 商机模块的"数据/配置"层
// 跟 customer.data.ts 同一套思路：枚举/颜色/列定义集中放这里，组件只关心业务逻辑

import type { DealStage } from '@/api/deal'
import type { Customer } from '@/api/customer'
import type { FormSchema } from '@/components/BasicForm'

// =====================================================
// 单一数据源：商机阶段
// =====================================================
//
// STAGE_LIST 是源头，下面的 BOARD_STAGES / stageMap 都从这里派生
// 想改文案/颜色 → 只改这一处
type StageItem = {
  value: DealStage
  label: string
  color: string  // a-tag / 列头染色用
}

export const STAGE_LIST: StageItem[] = [
  { value: 'lead', label: '线索', color: 'default' },
  { value: 'contact', label: '沟通中', color: 'blue' },
  { value: 'quote', label: '已报价', color: 'orange' },
  { value: 'won', label: '已成交', color: 'green' },
  { value: 'lost', label: '已丢失', color: 'red' },
]

// 派生 1：看板列定义
// "丢失"不开第 5 列（D7 决策），所以看板只取前 4 个
// .filter(s => s.value !== 'lost') 也行，这里用 4 个字面量值更清晰
const BOARD_STAGE_VALUES: DealStage[] = ['lead', 'contact', 'quote', 'won']
export const BOARD_STAGES = STAGE_LIST.filter((s) =>
  BOARD_STAGE_VALUES.includes(s.value),
)

// 派生 2：stage 值 → { label, color } 的映射
// 用途：渲染卡片上的 stage tag、详情页显示"已丢失"等场景
// 跟 customer.data.ts 的 stageMap 同款写法
export const stageMap = Object.fromEntries(
  STAGE_LIST.map((s) => [s.value, { label: s.label, color: s.color }]),
) as Record<DealStage, { label: string; color: string }>

// 派生 3：a-select 的 options
// 弹窗里 stage 字段下拉选项用；含全部 5 个值（包括 lost，便于"在弹窗里直接标记丢失"）
export const STAGE_OPTIONS = STAGE_LIST.map(({ value, label }) => ({ value, label }))

// =====================================================
// 表单 schemas —— 工厂函数
// =====================================================
//
// 为什么写成函数而不是直接导出常量？
//   customerId 字段的 Select options 是动态的（要拉 /api/customers）
//   每次打开弹窗时调一次 getFormSchemas(customers) 拿到最新 schemas
//
// 注意：amount / probability / customerId 没填默认值的逻辑放在弹窗里管，
// 这里只描述"长什么样"。
export function getFormSchemas(customers: Customer[]): FormSchema[] {
  return [
    {
      field: 'customerId',
      label: '关联客户',
      component: 'Select',
      required: true,
      span: 12,
      componentProps: {
        placeholder: '请选择客户',
        // 把客户列表转成 Select 的 options 格式
        options: customers.map((c) => ({
          value: c.id,
          label: c.company ? `${c.name}（${c.company}）` : c.name,
        })),
        // showSearch + optionFilterProp 让用户可以输入关键字过滤选项
        // optionFilterProp='label' 表示按 label 文本匹配（默认按 value）
        showSearch: true,
        optionFilterProp: 'label',
        allowClear: true,
      },
    },
    {
      field: 'title',
      label: '商机标题',
      component: 'Input',
      required: true,
      span: 12,
      componentProps: {
        placeholder: '如：ERP 系统采购、年度服务续约',
        allowClear: true,
      },
    },
    {
      field: 'amount',
      label: '预估金额（元）',
      component: 'InputNumber',
      span: 12,
      componentProps: {
        placeholder: '可空',
        min: 0,
        // 千分位格式化（输入时实时显示）
        formatter: (v: number | string) =>
          `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ','),
        parser: (v: string) => v.replace(/,/g, ''),
        style: 'width: 100%',
      },
    },
    {
      field: 'probability',
      label: '成交概率（%）',
      component: 'InputNumber',
      span: 12,
      componentProps: {
        placeholder: '0 - 100',
        min: 0,
        max: 100,
        style: 'width: 100%',
      },
    },
    {
      field: 'stage',
      label: '阶段',
      component: 'Select',
      span: 24,
      componentProps: {
        placeholder: '不选 → 默认"线索"',
        options: STAGE_OPTIONS,
        allowClear: true,
      },
    },
  ]
}
