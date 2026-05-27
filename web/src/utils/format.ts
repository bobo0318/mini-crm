// 通用格式化工具
// 跟具体业务模块解耦，任何模块要用都从这里 import

/**
 * ISO 时间字符串 → 本地化字符串
 * 例：'2026-05-27T04:53:03.000Z' → '2026/5/27 12:53:03'
 *
 * 不引入 dayjs/moment 是为了少一个依赖；后面真要做复杂格式化（"3 分钟前"等）再装
 */
export function formatTime(iso: string | null | undefined): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('zh-CN', { hour12: false })
}
