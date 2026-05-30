// v-auth 自定义指令（D9）
//
// 用法：
//   <a-button v-auth="'customer:delete'">删除</a-button>
//   <a-button v-auth="['customer:delete', 'admin:override']">删除</a-button>
//
// 行为：用户有"任一所需权限码"就保留 DOM；没有 → 元素从 DOM 移除（不渲染）
//
// 为什么直接移除 DOM 而不用 display: none？
//   - 视觉上一样隐藏，但 display: none 在 DevTools 里还能看到节点存在
//   - 安全上的差别有限（前端权限本就不是真正的安全边界，后端中间件才是）
//   - 但"DOM 不存在"比"DOM 存在被 CSS 隐藏"更彻底，符合"按钮没权限就不该出现"的语义
//
// 局限：
//   - 指令只在 mounted 时检查一次；如果用户在页面上改了角色（理论上不会发生），按钮不会跟着重渲染
//   - 真要响应权限变化，用计算属性 + v-if 替代

import type { Directive } from 'vue'
import { useUserStore } from '@/stores/user'

// Directive<HTMLElement, string | string[]>:
//   第一个泛型：指令挂载到的元素类型
//   第二个泛型：binding.value 的类型（用户传 string 或 string[]）
export const vAuth: Directive<HTMLElement, string | string[]> = {
  mounted(el, binding) {
    // 拿当前用户的权限信息
    const userStore = useUserStore()

    // 检查权限：复用 store 里的 hasPermission（OR 关系）
    const ok = userStore.hasPermission(binding.value)

    if (!ok) {
      // 没权限 → 从父节点删掉这个元素
      // 注意：mounted 时 el.parentNode 必然存在（DOM 已挂载）
      el.parentNode?.removeChild(el)
    }
  },
}
