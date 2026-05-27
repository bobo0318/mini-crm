// BasicForm 模块的对外出口
// 外部 import 时直接：import { BasicForm, type FormSchema } from '@/components/BasicForm'
// 比 import BasicForm from '.../BasicForm.vue' 短，也隐藏了内部文件结构

export { default as BasicForm } from './BasicForm.vue'
export type { FormSchema, FormComponentType, BasicFormExpose } from './types'
