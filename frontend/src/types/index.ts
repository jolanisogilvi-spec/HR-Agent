export interface Job {
  id: number
  title: string
  department: string
  description: string
  requirements: string
  experience_years_min: number
  experience_years_max: number
  education_requirement: string
  key_skills: string[]
  salary_range_min?: number
  salary_range_max?: number
  status: '开放' | '暂停' | '关闭'
  evaluation_criteria?: string
  created_at: string
  updated_at: string
}

export interface JobGenerateInput {
  role_prompt: string
  department?: string
  seniority?: string
  location?: string
  business_context?: string
  salary_budget?: string
  extra_requirements?: string
}

export type GeneratedJobDraft = Omit<Job, 'id' | 'created_at' | 'updated_at'> & {
  generation_notes?: string
}

export interface Resume {
  id: number
  job_id: number
  candidate_name: string
  email?: string
  phone?: string
  file_name?: string
  match_score?: number
  status: '新投递' | '评估中' | '面试邀约' | '面试通过' | '淘汰'
  ai_evaluation?: {
    match_score: number
    dimension_scores: Record<string, number>
    core_strengths: string[]
    potential_risks: string[]
    interview_suggestions: string[]
    overall_assessment: string
    recommendation: string
  }
  skills: string[]
  education: Array<{
    school: string
    degree: string
    major: string
    start_year: number
    end_year: number
  }>
  experience: Array<{
    company: string
    position: string
    start_date: string
    end_date: string
    description: string
    achievements: string[]
  }>
  parsed_data?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Interview {
  id: number
  resume_id: number
  job_id: number
  candidate_name?: string
  job_title?: string
  scheduled_time: string
  duration_minutes: number
  location?: string
  meeting_link?: string
  interviewer_name?: string
  status: '已安排' | '已完成' | '已取消'
  email_sent: boolean
  notes?: string
  created_at: string
}

export interface DashboardStats {
  funnel: {
    total: number
    funnel: Record<string, number>
  }
  daily_resumes: Array<{ date: string; count: number }>
  job_distribution: Array<{ job_title: string; count: number; job_id: number }>
  total_jobs: number
  open_jobs: number
}

export interface UsageStats {
  summary: {
    evaluated_resumes: number
    ai_call_count: number
    total_tokens: number
    estimated_cost_cny: number
  }
  by_model: UsageBreakdown[]
  by_purpose: Array<UsageBreakdown & {
    purpose: string
    purpose_label: string
  }>
  recent_calls: Array<{
    id: number
    purpose: string
    purpose_label: string
    model: string
    prompt_tokens: number
    prompt_cache_hit_tokens: number
    prompt_cache_miss_tokens: number
    completion_tokens: number
    total_tokens: number
    estimated_cost_cny: number
    created_at: string
  }>
  pricing: {
    source: string
    source_url: string
    unit: string
    models: Record<string, {
      input_cache_hit: number
      input_cache_miss: number
      output: number
    }>
  }
}

export interface UsageBreakdown {
  model: string
  normalized_model: string
  call_count: number
  prompt_tokens: number
  prompt_cache_hit_tokens: number
  prompt_cache_miss_tokens: number
  completion_tokens: number
  total_tokens: number
  estimated_cost_cny: number
  pricing?: {
    input_cache_hit: number
    input_cache_miss: number
    output: number
  }
}

export interface AppSettings {
  ai: {
    api_key: string
    api_key_set: boolean
    base_url: string
    model: string
  }
  email: {
    smtp_host: string
    smtp_port: number
    smtp_user: string
    smtp_password: string
    smtp_password_set: boolean
    smtp_from_email: string
    smtp_from_name: string
  }
  app: {
    resume_watch_dir: string
    cors_origins: string
  }
  overrides: string[]
}
