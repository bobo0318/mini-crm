// BasicForm 的类型定义
// 单独抽出来：调用方需要 import FormSchema 来写 schemas 数组

import type { Rule } from 'ant-design-vue/es/form'

// =====================================================
// 支持的组件类型
// =====================================================
// 这是个字符串字面量联合类型 —— 限制 schema 里 component 字段只能是这几个值
// 想加新组件类型（如 DatePicker / Radio / Switch），在这里追加 + 在 BasicForm.vue 的 componentMap 里加渲染
export type FormComponentType =
  | 'Input'
  | 'InputNumber'
  | 'Textarea'
  | 'Select'

// =====================================================
// 单个字段的 schema 描述
// =====================================================
export interface FormSchema {
  // 字段名：对应 modelValue 对象的 key，比如 name / company
  field: string

  // 标签：表单左侧显示的中文
  label: string

  // 用什么组件渲染
  component: FormComponentType

  // 透传给具体组件的 props
  // 比如 Select 的 options、Input 的 placeholder、InputNumber 的 min/max
  // 类型用 Record<string, any>，因为不同组件 props 千差万别
  componentProps?: Record<string, any>

  // 是否必填（快捷方式，等价于 rules: [{ required: true, message: `请输入${label}` }]）
  required?: boolean

  // 自定义校验规则（跟 Ant Design Vue 的 a-form-item rules 一样）
  // 比如 [{ pattern: /^\d+$/, message: '只能填数字' }]
  rules?: Rule[]

  // 占栅格列数（1-24）。一行 24 格，span=12 就是一半，span=24 就是整行
  // 不传默认整行（24）
  span?: number
}

// =====================================================
// 暴露给父组件的方法
// =====================================================
// 父组件通过 ref 拿到 BasicForm 实例后，能调这两个方法
export interface BasicFormExpose {
  // 触发校验：所有规则通过返回 Promise<true>，失败 Promise.reject
  validate: () => Promise<unknown>

  // 重置表单（清空所有字段值 + 清掉校验状态）
  resetFields: () => void
}
