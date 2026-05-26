// 鉴权相关接口的封装
// 对应后端的 /api/auth/* 和 /api/me

import request from '../utils/request'
import type { UserInfo } from '../stores/user'

// =====================================================
// 入参 & 返回 类型定义
// =====================================================

// 登录入参
export interface LoginParams {
  email: string
  password: string
}

// 注册入参（name 可选）
export interface RegisterParams {
  email: string
  password: string
  name?: string
}

// 登录 / 注册成功后后端返回的结构
// 跟 api/src/routes/auth.ts 里 c.json({ user, token }) 一一对应
export interface AuthResponse {
  user: UserInfo
  token: string
}

// =====================================================
// 接口函数
// =====================================================

/**
 * 登录
 * POST /api/auth/login
 */
export async function login(params: LoginParams): Promise<AuthResponse> {
  // 注意路径只写 '/auth/login'（不带 /api），因为 request 实例 baseURL 已经是 '/api'
  // 然后被 vite proxy 转发到后端 http://localhost:3000/api/auth/login
  const res = await request.post<AuthResponse>('/auth/login', params)
  return res.data
}

/**
 * 注册
 * POST /api/auth/register
 * 注册成功后后端会直接返回 token，前端可以"注册即登录"
 */
export async function register(params: RegisterParams): Promise<AuthResponse> {
  const res = await request.post<AuthResponse>('/auth/register', params)
  return res.data
}

/**
 * 获取当前登录用户信息
 * GET /api/me
 * 必须在请求头带上 Authorization，axios 拦截器会自动注入
 *
 * 用途：
 *   1. F5 刷新后验证 token 是否还有效
 *   2. 用户改了昵称/头像后拉最新数据
 */
export async function getMe(): Promise<UserInfo> {
  const res = await request.get<UserInfo>('/me')
  return res.data
}
