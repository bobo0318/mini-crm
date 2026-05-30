<script setup lang="ts">
// 跟进记录新增弹窗
//
// 跟客户/联系人的弹窗不同：
//   1. 只有"新增"，没有编辑（业务约定：跟进追加 only）
//   2. 字段少 + 含 Markdown 富文本，手写 a-form 比走 BasicForm 直接
//   3. 内容字段用 md-editor-v3
//
// 用法：
//   <FollowUpFormModal :customer-id="..." ref="modalRef" @success="..." />
//   modalRef.value?.open()

import { computed, ref, reactive } from 'vue'
import { message } from 'ant-design-vue'
import type { FormInstance } from 'ant-design-vue/es/form'
import type { Dayjs } from 'dayjs'

// md-editor-v3 的编辑器组件 + 必备样式
// 样式不 import 的话编辑器会"裸奔"（没有边框、按钮没图标），所以这行不能少
import { MdEditor } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'

import { createFollowUp } from '@/api/followUp'
import { TYPE_OPTIONS } from './followUp.data'
import { useSettingsStore } from '@/stores/settings'

// D11：md-editor-v3 自带主题，传 settings.theme 让它跟着切
const settings = useSettingsStore()
const mdTheme = computed(() => settings.theme)

const props = defineProps<{ customerId: number }>()
const emit = defineEmits<{ success: [] }>()

// =====================================================
// 弹窗状态
// =====================================================
const open = ref(false)
const submitting = ref(false)

// =====================================================
// 表单数据
// =====================================================
// nextAt 字段类型是 Dayjs | null：a-date-picker 的 v-model 给的是 dayjs 对象
// 提交时再 toISOString() 转字符串给后端
const formData = reactive<{
  type: 'call' | 'visit' | 'email' | 'wechat'
  content: string
  nextAt: Dayjs | null
}>({
  type: 'call',
  content: '',
  nextAt: null,
})

// 校验规则：跟之前的 schema 风格保持一致
const rules = {
  type: [{ required: true, message: '请选择跟进方式', trigger: 'change' }],
  // Markdown 内容比较特殊——不能用普通 required（trigger 不会响应富文本变化）
  // 所以这里只在提交时校验，下面 handleOk 里手动判断
  content: [
    {
      required: true,
      validator: (_rule: unknown, value: string) => {
        // value 是 a-form 维护的当前字段值
        if (!value || !value.trim()) {
          return Promise.reject('跟进内容不能为空')
        }
        return Promise.resolve()
      },
      trigger: 'change',
    },
  ],
}

const formRef = ref<FormInstance>()

// =====================================================
// 暴露 open 方法
// =====================================================
function openModal() {
  // 每次打开重置数据
  formData.type = 'call'
  formData.content = ''
  formData.nextAt = null
  open.value = true
}

defineExpose({ open: openModal })

// =====================================================
// 提交
// =====================================================
async function handleOk() {
  try {
    await formRef.value?.validate()
    submitting.value = true

    // nextAt 是 dayjs 对象，转 ISO 字符串给后端
    // 后端用 z.coerce.date() 接受 ISO 字符串
    await createFollowUp(props.customerId, {
      type: formData.type,
      content: formData.content,
      nextAt: formData.nextAt ? formData.nextAt.toISOString() : null,
    })

    message.success('新增成功')
    open.value = false
    emit('success')
  } catch (err) {
    void err
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <!-- destroy-on-close：跟其他弹窗一样，关闭时销毁 form 避免状态残留 -->
  <!-- width 给大一点（800px），Markdown 编辑器要够宽 -->
  <a-modal
    v-model:open="open"
    title="新增跟进记录"
    :confirm-loading="submitting"
    :mask-closable="false"
    :destroy-on-close="true"
    width="800px"
    ok-text="提交"
    cancel-text="取消"
    @ok="handleOk"
  >
    <a-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      layout="vertical"
    >
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="跟进方式" name="type">
            <a-select v-model:value="formData.type" :options="TYPE_OPTIONS" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="下次跟进时间" name="nextAt">
            <!-- show-time 让选择器同时选日期 + 时分秒 -->
            <!-- v-model:value 类型是 dayjs，配合上面 formData.nextAt 类型 Dayjs | null -->
            <a-date-picker
              v-model:value="formData.nextAt"
              show-time
              style="width: 100%"
              placeholder="可选"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <a-form-item label="跟进内容（支持 Markdown）" name="content">
        <!-- :preview="false" 关掉编辑器右侧的实时预览，节省弹窗宽度 -->
        <!-- :toolbarsExclude 隐藏不需要的工具（比如截图，怕浏览器权限弹窗） -->
        <!-- 高度 300px 够写一段内容了 -->
        <MdEditor
          v-model="formData.content"
          :theme="mdTheme"
          :preview="false"
          :toolbars-exclude="['github', 'save', 'catalog']"
          style="height: 300px"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>
