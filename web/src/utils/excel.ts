// Excel 导出工具
// 基于 xlsx (SheetJS)，所有模块（客户、联系人、商机...）的导出都走这里
//
// 工业级 Excel 导出的两个核心问题：
//   1. 字段名要变中文（"name" → "姓名"）
//   2. 复杂字段要展平（枚举翻译、数组拼字符串、时间格式化）
// 这两个都靠 columns 配置解决

import * as XLSX from 'xlsx'

// =====================================================
// 列配置类型
// =====================================================
//
// <T> 是泛型：调用方传客户数据 Customer[] 时，key 会被约束成 Customer 的字段名
// 这样写 columns 时如果手抖打错字段名（比如把 'name' 写成 'nmae'），TS 立刻报错
//
// format 是可选的"值转换函数"：raw 是原始值，row 是整行数据
//   - 用 row 而不是只给 raw，是因为有时候要根据"另一个字段"决定怎么展示
//   - 没传 format 就直接用原始值
export interface ExcelColumn<T> {
  // 字段 key（必须是 T 的属性名之一）
  key: keyof T

  // Excel 表头显示的中文
  title: string

  // 值转换函数：把原始值变成最终 Excel 单元格里要显示的内容
  // 返回 string | number | null 都行，xlsx 会自动处理
  format?: (raw: T[keyof T], row: T) => string | number | null
}

// =====================================================
// 导出函数
// =====================================================
export interface ExportOptions<T> {
  data: T[]                  // 要导出的数据数组
  columns: ExcelColumn<T>[]  // 列配置
  filename: string           // 下载的文件名（要带 .xlsx 后缀）
  sheetName?: string         // sheet 标签名（默认 'Sheet1'）
}

export function exportToExcel<T extends Record<string, any>>(
  options: ExportOptions<T>,
): void {
  const { data, columns, filename, sheetName = 'Sheet1' } = options

  // ---------- 步骤 1：把每行数据转成"中文 key 对象" ----------
  //
  // 原始数据：[{ id: 1, name: '张三', stage: 'won', ... }]
  // 目标格式：[{ 'ID': 1, '姓名': '张三', '阶段': '成交', ... }]
  //
  // 为什么不直接传原始数据给 xlsx？
  //   xlsx 的 json_to_sheet 会拿对象的 key 当表头，
  //   所以"想要中文表头"就只能先把 key 变成中文
  const formatted = data.map((row) => {
    const result: Record<string, string | number | null> = {}
    for (const col of columns) {
      const raw = row[col.key]
      // 有 format 函数就用它，没就直接用原始值
      // null 兜底成空字符串，避免 Excel 显示 "null"
      const value = col.format ? col.format(raw, row) : raw
      result[col.title] = value ?? ''
    }
    return result
  })

  // ---------- 步骤 2：把数据转成 worksheet（单张表）----------
  // utils.json_to_sheet：JS 对象数组 → xlsx 内部 sheet 结构
  const sheet = XLSX.utils.json_to_sheet(formatted)

  // ---------- 步骤 3：自动给列设置一个合理的宽度 ----------
  // 不设宽度的话，所有列默认 8 字符宽，长字段（公司名、时间）会被截断
  // 算法：每列宽度 = max(表头长度, 最长单元格长度) × 1.2，最少 10
  const colWidths = columns.map((col) => {
    const headerLen = col.title.length
    const maxCellLen = formatted.reduce((max, row) => {
      const str = String(row[col.title] ?? '')
      return Math.max(max, str.length)
    }, 0)
    return { wch: Math.max(10, Math.max(headerLen, maxCellLen) * 1.2) }
  })
  sheet['!cols'] = colWidths

  // ---------- 步骤 4：组装成 workbook（整个 .xlsx 文件）----------
  // 一个 workbook 可以有多个 sheet，我们只用一个
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName)

  // ---------- 步骤 5：触发浏览器下载 ----------
  // writeFile 内部会创建一个 Blob + a 标签 + 模拟点击下载
  // 我们什么都不用管，文件名传 .xlsx 后缀即可
  XLSX.writeFile(workbook, filename)
}
