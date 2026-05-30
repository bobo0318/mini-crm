// 中文语言包（D11）
// 结构按"模块"分组，比扁平结构好维护
// 加新文案：先在这边加 key + 中文，再去 en.ts 加同 key 的英文

export default {
  // 公共词条（按钮、状态等高频复用）
  common: {
    save: '保存',
    cancel: '取消',
    ok: '确定',
    delete: '删除',
    edit: '编辑',
    add: '新增',
    refresh: '刷新',
    search: '搜索',
    loading: '加载中…',
    success: '操作成功',
    failed: '操作失败',
  },

  // 顶栏 / 侧栏布局
  layout: {
    logout: '退出登录',
    languageTip: '切换语言',
    themeTip: '切换主题',
  },

  // 侧栏菜单（key 跟 MainLayout 里 menuItems 的 i18nKey 字段对应）
  menu: {
    dashboard: '工作台',
    customer: '客户管理',
    deal: '销售漏斗',
    system: '系统管理',
    systemRole: '角色管理',
    systemUser: '用户管理',
  },

  // 登录页
  login: {
    title: '欢迎登录 Mini CRM',
    subtitle: '请使用账号密码登录',
    emailPlaceholder: '请输入邮箱',
    passwordPlaceholder: '请输入密码',
    submit: '登录',
    emailRequired: '请输入邮箱',
    emailInvalid: '邮箱格式不正确',
    passwordRequired: '请输入密码',
  },
}
