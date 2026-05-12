import { create } from 'zustand'
import type { Job, Resume, Interview, DashboardStats } from '../types'
import { jobsApi, resumesApi, interviewsApi, dashboardApi } from '../services/api'

interface AppState {
  jobs: Job[]
  jobsTotal: number
  resumes: Resume[]
  resumesTotal: number
  interviews: Interview[]
  interviewsTotal: number
  dashboardStats: DashboardStats | null
  loading: boolean

  fetchJobs: (params?: { status?: string; skip?: number; limit?: number }) => Promise<void>
  fetchResumes: (params?: { job_id?: number; status?: string; min_score?: number; skip?: number; limit?: number }) => Promise<void>
  fetchInterviews: (params?: { job_id?: number; status?: string; skip?: number; limit?: number }) => Promise<void>
  fetchDashboardStats: (jobId?: number) => Promise<void>
}

export const useAppStore = create<AppState>((set) => ({
  jobs: [],
  jobsTotal: 0,
  resumes: [],
  resumesTotal: 0,
  interviews: [],
  interviewsTotal: 0,
  dashboardStats: null,
  loading: false,

  fetchJobs: async (params) => {
    set({ loading: true })
    try {
      const data = await jobsApi.list(params)
      set({ jobs: data.items, jobsTotal: data.total })
    } finally {
      set({ loading: false })
    }
  },

  fetchResumes: async (params) => {
    set({ loading: true })
    try {
      const data = await resumesApi.list(params)
      set({ resumes: data.items, resumesTotal: data.total })
    } finally {
      set({ loading: false })
    }
  },

  fetchInterviews: async (params) => {
    set({ loading: true })
    try {
      const data = await interviewsApi.list(params)
      set({ interviews: data.items, interviewsTotal: data.total })
    } finally {
      set({ loading: false })
    }
  },

  fetchDashboardStats: async (jobId) => {
    set({ loading: true })
    try {
      const data = await dashboardApi.getStats(jobId)
      set({ dashboardStats: data })
    } finally {
      set({ loading: false })
    }
  },
}))
