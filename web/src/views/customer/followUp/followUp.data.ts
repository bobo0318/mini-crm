// 跟进记录配置层
// type 枚举的中文 + 颜色映射，跟 stage 是一个套路（单一数据源派生）

import type { FollowUp } from '@/api/followUp'

type TypeItem = {
  value: FollowUp['type']
  label: string
  color: string
}

export const TYPE_LIST: TypeItem[] = [
  { value: 'call', label: '电话', color: 'blue' },
  { value: 'visit', label: '拜访', color: 'green' },
  { value: 'email', label: '邮件', color: 'orange' },
  { value: 'wechat', label: '微信', color: 'purple' },
]

// 派生：根据 type 拿 label + color（时间线上展示用）
export const typeMap = Object.fromEntries(
  TYPE_LIST.map((t) => [t.value, { label: t.label, color: t.color }]),
) as Record<FollowUp['type'], { label: string; color: string }>

// 派生：a-select 的 options（弹窗里选跟进方式用）
export const TYPE_OPTIONS = TYPE_LIST.map(({ value, label }) => ({ value, label }))
