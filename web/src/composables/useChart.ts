// ECharts 生命周期封装（D10）
//
// 用法（在 .vue 组件里）：
//   const { chartRef, setOption } = useChart()
//   <template>
//     <div ref="chartRef" style="width: 100%; height: 320px"></div>
//   </template>
//
//   // 拿到数据后：
//   setOption({ xAxis: { ... }, yAxis: { ... }, series: [...] })
//
// 这个 composable 自动处理：
//   - onMounted 时 echarts.init(容器)
//   - window resize 时 chart.resize() 让图表跟着容器变
//   - onBeforeUnmount 时 dispose + 移除监听（防内存泄漏）
//
// 关于 ECharts 引入方式：
//   学习项目用全量 `import * as echarts from 'echarts'` 最省心
//   生产环境推荐按需引入（echarts/core + 单独 import 用到的组件），bundle 能减 60%+
//   D10 先不优化，简单优先

import { ref, onMounted, onBeforeUnmount, shallowRef } from 'vue'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'

export function useChart() {
  // 模板里 ref="chartRef" 会自动赋值
  const chartRef = ref<HTMLElement | null>(null)

  // 用 shallowRef 而不是 ref 装 ECharts 实例：
  //   ECharts 内部对象巨大、自带很多内部状态，被 Vue 深度响应式追踪会严重拖慢性能
  //   shallowRef 只追踪"引用变化"，不深入对象内部
  const chartInstance = shallowRef<echarts.ECharts | null>(null)

  // resize handler：onMounted 注册，onBeforeUnmount 移除
  // 抽成命名函数（而不是匿名箭头）是为了 removeEventListener 能找到同一个引用
  function handleResize() {
    chartInstance.value?.resize()
  }

  // 暴露给调用方：拿到数据后 setOption 更新图表
  // notMerge: true 让"全量替换 option"而不是合并（避免上次数据残留）
  function setOption(option: EChartsOption) {
    chartInstance.value?.setOption(option, { notMerge: true })
  }

  onMounted(() => {
    if (!chartRef.value) return
    // 初始化：把 DOM 容器变成一个 ECharts 实例
    chartInstance.value = echarts.init(chartRef.value)
    // 窗口缩放联动
    window.addEventListener('resize', handleResize)
  })

  onBeforeUnmount(() => {
    // 顺序很重要：先移除监听，再 dispose，避免 dispose 后 resize 触发空指针
    window.removeEventListener('resize', handleResize)
    chartInstance.value?.dispose()
    chartInstance.value = null
  })

  return {
    chartRef,
    setOption,
  }
}
