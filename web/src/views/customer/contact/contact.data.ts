// 联系人模块的"数据/配置"层
// 列定义 + 表单 schemas，跟 customer.data.ts 的角色完全一致

import type { TableColumnsType } from 'ant-design-vue'

import type { FormSchema } from '@/components/BasicForm'

// =====================================================
// 联系人表格列
// =====================================================
// 列比客户少很多——核心是 姓名/电话/邮箱/职位/是否主 + 操作
// fixed: 'right' 让操作列在水平滚动时固定
export const columns: TableColumnsType = [
  { title: '姓名', dataIndex: 'name', key: 'name', width: 140 },
  { title: '电话', dataIndex: 'phone', key: 'phone', width: 140 },
  { title: '邮箱', dataIndex: 'email', key: 'email', width: 200 },
  { title: '职位', dataIndex: 'position', key: 'position', width: 140 },
  { title: '操作', key: 'action', width: 140, fixed: 'right' },
]

// =====================================================
// 联系人表单 schemas（给 ContactFormModal 用）
// =====================================================
// span 12 让两个字段排一行
// isPrimary 用什么组件？BasicForm 当前只支持 Input/InputNumber/Textarea/Select
// 这里临时用 Select 代替 Switch（true/false 两个选项）——能跑通，
// 等 D6 全部交付后如果需要可以再给 BasicForm 加 Switch 支持
export const formSchemas: FormSchema[] = [
  {
    field: 'name',
    label: '姓名',
    component: 'Input',
    required: true,
    span: 12,
    componentProps: { placeholder: '请输入联系人姓名', allowClear: true },
  },
  {
    field: 'phone',
    label: '电话',
    component: 'Input',
    span: 12,
    componentProps: { placeholder: '可空', allowClear: true },
  },
  {
    field: 'email',
    label: '邮箱',
    component: 'Input',
    span: 12,
    rules: [
      // 自定义校验：不传不校验，传了就必须是邮箱格式
      // 用 Ant Design 的 type: 'email' 内置规则
      { type: 'email', message: '邮箱格式不正确', trigger: ['blur', 'change'] },
    ],
    componentProps: { placeholder: '可空', allowClear: true },
  },
  {
    field: 'position',
    label: '职位',
    component: 'Input',
    span: 12,
    componentProps: { placeholder: '如：采购经理 / 老板', allowClear: true },
  },
  {
    field: 'isPrimary',
    label: '是否主联系人',
    component: 'Select',
    span: 12,
    componentProps: {
      placeholder: '请选择',
      options: [
        { label: '是（主联系人）', value: true },
        { label: '否（普通）', value: false },
      ],
    },
  },
]
