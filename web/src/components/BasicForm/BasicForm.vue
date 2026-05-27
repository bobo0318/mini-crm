<script setup lang="ts">
// BasicForm —— Schema 驱动的通用表单组件
//
// 设计：
//   - 父组件传一个 schemas 数组描述每个字段
//   - 父组件用 v-model:model-value 双向绑定数据对象
//   - 校验和提交由父组件控制（通过 ref 调 validate）
//
// 为什么不在内部做"提交按钮"？因为提交逻辑（要不要弹窗关闭、要不要 message.success、要不要刷新列表）
// 是业务的事，组件不该假设。父组件自己控制按钮和提交流程更清晰

import { computed, ref } from 'vue'
import {
  Input,
  InputNumber,
  Textarea,
  Select,
} from 'ant-design-vue'
import type { FormInstance, Rule } from 'ant-design-vue/es/form'

import type { FormSchema } from './types'

// =====================================================
// Props 定义
// =====================================================
// modelValue：表单数据对象（v-model 简写绑定这个）
// schemas：字段配置数组
//
// defineProps<T>() 是 Vue 3 的 setup 语法糖：纯类型方式声明 props，TS 友好
const props = defineProps<{
  modelValue: Record<string, any>
  schemas: FormSchema[]
}>()

// =====================================================
// Emits 定义（v-model 配套）
// =====================================================
// v-model:model-value="x" 等价于：
//   :model-value="x"
//   @update:model-value="x = $event"
// 所以子组件改值要 emit('update:modelValue', 新值)
const emit = defineEmits<{
  'update:modelValue': [value: Record<string, any>]
}>()

// =====================================================
// 内部代理：用 computed 把 props.modelValue 包成可写的引用
// =====================================================
//
// 这是 Vue 3 自定义 v-model 的经典模式：
//   - 读：返回 props.modelValue
//   - 写：emit 出去给父组件改
// 这样模板里就能写 v-model="formData[schema.field]"，跟普通 ref 一样
//
// 为啥不用 v-model="props.modelValue"？因为 props 是只读的（Vue 故意设计的"单向数据流"）
const formData = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

// =====================================================
// 组件映射表
// =====================================================
//
// schema.component 是字符串（'Input' / 'Select' / ...），模板里 <component :is="..."> 需要真正的组件对象
// 所以这里建一个字符串 → 组件 的映射表
//
// 为啥不直接在模板里 v-if 一堆？
//   - schema 类型越多，v-if 链越长且重复
//   - 映射表清晰、好维护，加一种组件改一处
const componentMap = {
  Input,
  InputNumber,
  Textarea,
  Select,
}

// =====================================================
// 由 schema.required 自动生成必填规则
// =====================================================
//
// 用户在 schema 里写 required: true 是个快捷方式
// 实际的 rules 需要拼成 Ant Design Vue 的 Rule 对象
// 同时尊重用户自己传的 rules（拼在前面）
function getRules(schema: FormSchema): Rule[] {
  const rules: Rule[] = [...(schema.rules || [])]
  if (schema.required) {
    rules.unshift({
      required: true,
      message: `请输入${schema.label}`,
      // trigger 让校验在两个时机触发：失焦时（blur）+ 值变化时（change）
      // change 让用户填一点立刻校验，blur 兜底
      trigger: ['blur', 'change'],
    })
  }
  return rules
}

// =====================================================
// 暴露给父组件的方法
// =====================================================
//
// formRef 拿到的是 a-form 实例（FormInstance 是 Ant Design Vue 给的类型）
// 它自带 validate / resetFields 等方法，我们直接转发即可
const formRef = ref<FormInstance>()

// defineExpose 让父组件通过 ref 能调这两个方法
// 如果不 expose，<script setup> 里所有东西默认对外不可见（强封装）
defineExpose({
  validate: () => formRef.value!.validate(),
  resetFields: () => formRef.value!.resetFields(),
})
</script>

<template>
  <!-- :model 是 a-form 的 props：表单数据对象（校验和取值都依赖它） -->
  <!-- ref 拿到 a-form 实例，转发 validate / resetFields -->
  <a-form
    ref="formRef"
    :model="formData"
    layout="vertical"
  >
    <!-- 用 a-row + a-col 实现栅格布局，schema 的 span 决定每个字段占几列 -->
    <a-row :gutter="16">
      <a-col v-for="schema in schemas" :key="schema.field" :span="schema.span || 24">
        <!-- a-form-item：一个字段的容器（标签 + 输入框 + 错误提示） -->
        <!-- :name 必须跟 a-form 的 model 里的 key 对应，校验时通过 name 定位字段 -->
        <a-form-item
          :label="schema.label"
          :name="schema.field"
          :rules="getRules(schema)"
        >
          <!-- 动态组件 -->
          <!-- :is 接受组件对象（componentMap[xxx]）或组件名字符串 -->
          <!-- v-model:value 是 Ant Design Vue 输入类组件的双向绑定约定（不是 v-model="" 简写） -->
          <!-- v-bind="schema.componentProps" 把 schema 里配的 props 一次性透传给具体组件 -->
          <component
            :is="componentMap[schema.component]"
            v-model:value="formData[schema.field]"
            v-bind="schema.componentProps"
          />
        </a-form-item>
      </a-col>
    </a-row>
  </a-form>
</template>
