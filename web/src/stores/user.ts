// 用户 store —— 管理"当前登录用户"的所有状态
// 这是前端 D3 鉴权的中枢：token 在这、用户信息在这、登录/登出动作也在这

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// =====================================================
// 用户信息类型
// 跟后端 /api/auth/login、/api/me 返回的 user 字段对齐
// D9 新增 role + permissions
// =====================================================
export interface UserInfo {
  id: number
  email: string
  name: string | null
  role: 'admin' | 'sales' | 'viewer'
  permissions: string[]
}

// =====================================================
// 定义 store
// defineStore('唯一 id', () => { 组合式风格 })
// 这个唯一 id 也是 persistedstate 在 localStorage 里的 key 名
// =====================================================
export const useUserStore = defineStore(
  'user',
  () => {
    // ---------- state（响应式状态）----------
    // 用 ref 而不是 reactive：原始类型只能 ref；对象用哪个都行，但 ref 风格更统一
    const token = ref<string>('') // 没登录时是空串
    const userInfo = ref<UserInfo | null>(null)

    // "本次会话是否已通过 getMe 验证过 token"
    // 关键：这个字段不持久化（在下面 persist 配置里排除）
    //      所以每次 F5 都会重置成 false，路由守卫据此判断要不要重新验证 token
    //      防止用户手动改 localStorage 伪造登录态
    const isInitialized = ref(false)

    // ---------- getters（派生状态，类似 computed）----------
    // 是否已登录 = 有 token
    // 注意：这里不验证 token 是否过期，过期与否由 axios 拦截器 + 后端 401 来判断
    const isLoggedIn = computed(() => !!token.value)

    // ---------- actions（动作，等价于 Vuex 的 mutation+action）----------

    /**
     * 登录成功后调用：把后端返回的 token 和 user 存进 store
     * 入参跟后端 /api/auth/login 的响应结构对齐
     */
    function setAuth(payload: { token: string; user: UserInfo }) {
      token.value = payload.token
      userInfo.value = payload.user
      // 登录接口刚验过密码，相当于这次会话已经验证过身份
      isInitialized.value = true
    }

    /**
     * 登出：清空所有状态
     * 视图层（如点头像下拉 → 退出登录）调用这个
     */
    function logout() {
      token.value = ''
      userInfo.value = null
      isInitialized.value = false
    }

    /**
     * 标记本次会话已经通过 token 验证（路由守卫调用）
     */
    function setInitialized() {
      isInitialized.value = true
    }

    /**
     * 更新最新的 user 信息（不动 token）
     * F5 刷新后路由守卫会调它来验证 token 是否还有效 + 拉最新 user
     */
    function setUserInfo(user: UserInfo) {
      userInfo.value = user
    }

    /**
     * 权限检查工具（D9）
     * @param perm  权限码（string）或权限码列表（string[]）
     * @returns 任一权限码命中即 true（OR 关系，跟后端中间件一致）
     *
     * 用途：
     *   - v-auth 自定义指令内部调它
     *   - 组件里手动判断也能用（比如计算属性算可见按钮）
     *   - 路由守卫调它
     */
    function hasPermission(perm: string | string[]): boolean {
      if (!userInfo.value) return false
      const required = Array.isArray(perm) ? perm : [perm]
      return required.some((p) => userInfo.value!.permissions.includes(p))
    }

    // ---------- 暴露给外部 ----------
    // 组合式写法必须显式 return；没 return 的就是 store 私有
    return {
      token,
      userInfo,
      isInitialized,
      isLoggedIn,
      setAuth,
      logout,
      setUserInfo,
      setInitialized,
      hasPermission,
    }
  },
  {
    // ---------- 持久化配置 ----------
    // paths 指定哪些字段需要同步到 localStorage
    // 显式列出 token / userInfo，**故意不包含 isInitialized**
    //   → F5 后 isInitialized 会重置成默认值 false
    //   → 路由守卫据此重新验证 token，防止伪造登录态
    persist: {
      pick: ['token', 'userInfo'],
    },
  },
)
