import axios from 'axios'
import type {
  Job,
  Resume,
  Interview,
  DashboardStats,
  AppSettings,
  GeneratedJobDraft,
  JobGenerateInput,
  UsageStats,
} from '../types'

const api = axios.create({ baseURL: '/api', timeout: 120000 })

api.interceptors.response.use(
  res => res.data,
  err => {
    console.error('API错误:', err.response?.data || err.message)
    return Promise.reject(err)
  }
)

// 岗位管理
export const jobsApi = {
  list: (params?: { status?: string; skip?: number; limit?: number }) =>
    api.get<any, { total: number; items: Job[] }>('/jobs', { params }),
  get: (id: number) => api.get<any, Job>(`/jobs/${id}`),
  create: (data: Partial<Job>) => api.post<any, Job>('/jobs', data),
  update: (id: number, data: Partial<Job>) => api.put<any, Job>(`/jobs/${id}`, data),
  delete: (id: number) => api.delete(`/jobs/${id}`),
  generateDraft: (data: JobGenerateInput) => api.post<any, GeneratedJobDraft>('/jobs/generate-draft', data),
  generateCriteria: (id: number) => api.post<any, { evaluation_criteria: string }>(`/jobs/${id}/generate-criteria`),
}

// 简历管理
export const resumesApi = {
  list: (params?: { job_id?: number; status?: string; min_score?: number; skip?: number; limit?: number }) =>
    api.get<any, { total: number; items: Resume[] }>('/resumes', { params }),
  get: (id: number) => api.get<any, Resume>(`/resumes/${id}`),
  upload: (formData: FormData) =>
    api.post<any, Resume>('/resumes/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  updateStatus: (id: number, status: string) =>
    api.put(`/resumes/${id}/status`, { status }),
  evaluate: (id: number) => api.post(`/resumes/${id}/evaluate`),
}

// 面试管理
export const interviewsApi = {
  list: (params?: { job_id?: number; status?: string; skip?: number; limit?: number }) =>
    api.get<any, { total: number; items: Interview[] }>('/interviews', { params }),
  create: (data: Record<string, unknown>) => api.post<any, { id: number; message: string }>('/interviews', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/interviews/${id}`, data),
  delete: (id: number) => api.delete(`/interviews/${id}`),
  autoSchedule: (data: { resume_id: number; duration_minutes?: number }) =>
    api.post<any, { suggested_times: string[]; message: string }>('/interviews/auto-schedule', data),
  getHrAvailability: () => api.get<any, any[]>('/hr-availability'),
  addHrAvailability: (data: Record<string, unknown>) => api.post('/hr-availability', data),
  deleteHrAvailability: (id: number) => api.delete(`/hr-availability/${id}`),
}

// 看板数据
export const dashboardApi = {
  getStats: (job_id?: number) =>
    api.get<any, DashboardStats>('/dashboard/stats', { params: job_id ? { job_id } : {} }),
}

// 系统设置
export const settingsApi = {
  get: () => api.get<any, AppSettings>('/settings'),
  update: (data: Partial<AppSettings>) => api.put<any, AppSettings>('/settings', data),
}

// AI 用量统计
export const usageApi = {
  getStats: () => api.get<any, UsageStats>('/usage/stats'),
}
