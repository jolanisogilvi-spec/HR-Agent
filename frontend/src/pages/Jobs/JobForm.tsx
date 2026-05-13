import { useEffect, useState } from 'react'
import { Alert, Form, Input, InputNumber, Select, Button, Card, Space, message, Spin, Divider, Modal } from 'antd'
import { BulbOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import { jobsApi } from '../../services/api'
import type { GeneratedJobDraft, Job, JobGenerateInput } from '../../types'

const { TextArea } = Input

export default function JobForm() {
  const [form] = Form.useForm()
  const [draftForm] = Form.useForm<JobGenerateInput>()
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [draftModalOpen, setDraftModalOpen] = useState(false)
  const [generatingDraft, setGeneratingDraft] = useState(false)
  const [criteria, setCriteria] = useState('')

  useEffect(() => {
    if (isEdit) {
      jobsApi.get(Number(id)).then(job => {
        form.setFieldsValue(job)
        setCriteria(job.evaluation_criteria || '')
      })
    }
  }, [id])

  const handleSubmit = async (values: Partial<Job>) => {
    setLoading(true)
    try {
      let savedJob: Job
      if (isEdit) {
        savedJob = await jobsApi.update(Number(id), { ...values, evaluation_criteria: criteria })
        message.success('岗位已更新')
      } else {
        savedJob = await jobsApi.create({ ...values, evaluation_criteria: criteria })
        message.success('岗位已创建')
      }
      setGenerating(true)
      message.loading({ content: '正在自动生成AI评估标准...', key: 'autoCriteria', duration: 0 })
      try {
        const res = await jobsApi.generateCriteria(savedJob.id)
        setCriteria(res.evaluation_criteria)
        message.success({ content: 'AI评估标准已自动生成', key: 'autoCriteria', duration: 2 })
      } catch (err: any) {
        const detail = err?.response?.data?.detail
        message.warning({
          content: detail || '岗位已保存，但AI评估标准生成失败，请检查模型配置后重试',
          key: 'autoCriteria',
          duration: 4,
        })
      } finally {
        setGenerating(false)
      }
      navigate('/jobs')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateCriteria = async () => {
    if (!isEdit) {
      message.warning('请先保存岗位，再生成评估标准')
      return
    }
    setGenerating(true)
    try {
      const res = await jobsApi.generateCriteria(Number(id))
      setCriteria(res.evaluation_criteria)
      message.success('AI评估标准生成完成')
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      message.error(detail || 'AI评估标准生成失败，请检查模型配置后重试')
    } finally {
      setGenerating(false)
    }
  }

  const applyGeneratedDraft = (draft: GeneratedJobDraft) => {
    const jobFields: Partial<Job> = {
      title: draft.title,
      department: draft.department,
      description: draft.description,
      requirements: draft.requirements,
      experience_years_min: draft.experience_years_min,
      experience_years_max: draft.experience_years_max,
      education_requirement: draft.education_requirement,
      key_skills: draft.key_skills,
      salary_range_min: draft.salary_range_min,
      salary_range_max: draft.salary_range_max,
      status: draft.status,
    }
    form.setFieldsValue(jobFields)
    setCriteria(draft.evaluation_criteria || '')
  }

  const handleGenerateDraft = async () => {
    try {
      const values = await draftForm.validateFields()
      setGeneratingDraft(true)
      const draft = await jobsApi.generateDraft(values)
      applyGeneratedDraft(draft)
      setDraftModalOpen(false)
      message.success(draft.generation_notes || '岗位草稿已生成，请检查后保存')
    } catch (err: any) {
      if (err?.errorFields) return
      const detail = err?.response?.data?.detail
      message.error(detail || '岗位生成失败，请检查模型配置后重试')
    } finally {
      setGeneratingDraft(false)
    }
  }

  return (
    <Card title={isEdit ? '编辑岗位' : '新建招聘岗位'}
          extra={
            <Space>
              <Button icon={<BulbOutlined />} onClick={() => setDraftModalOpen(true)}>
                一键生成岗位
              </Button>
              <Button onClick={() => navigate('/jobs')}>返回列表</Button>
            </Space>
          }>
      <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ maxWidth: 800 }}
            initialValues={{ status: '开放', education_requirement: '本科' }}>
        <Form.Item name="title" label="岗位名称" rules={[{ required: true }]}>
          <Input placeholder="例如：高级前端工程师" />
        </Form.Item>
        <Form.Item name="department" label="所属部门" rules={[{ required: true }]}>
          <Input placeholder="例如：技术部" />
        </Form.Item>
        <Form.Item name="description" label="岗位描述（JD）" rules={[{ required: true }]}>
          <TextArea rows={5} placeholder="详细描述岗位职责和工作内容" />
        </Form.Item>
        <Form.Item name="requirements" label="岗位要求" rules={[{ required: true }]}>
          <TextArea rows={5} placeholder="详细描述任职要求，包括技能、经验、学历等" />
        </Form.Item>
        <Space size={16} style={{ width: '100%' }}>
          <Form.Item name="experience_years_min" label="最低经验年限（年）" style={{ width: 200 }}>
            <InputNumber min={0} max={30} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="experience_years_max" label="最高经验年限（年）" style={{ width: 200 }}>
            <InputNumber min={0} max={30} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="education_requirement" label="学历要求" style={{ width: 200 }}>
            <Select>
              {['大专', '本科', '硕士', '博士', '不限'].map(e => (
                <Select.Option key={e} value={e}>{e}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Space>
        <Form.Item name="key_skills" label="关键技能（可多选输入）">
          <Select mode="tags" placeholder="输入技能后按回车添加，例如：React、Python" />
        </Form.Item>
        <Space size={16}>
          <Form.Item name="salary_range_min" label="薪资下限（K/月）">
            <InputNumber min={0} style={{ width: 150 }} />
          </Form.Item>
          <Form.Item name="salary_range_max" label="薪资上限（K/月）">
            <InputNumber min={0} style={{ width: 150 }} />
          </Form.Item>
          <Form.Item name="status" label="岗位状态">
            <Select style={{ width: 120 }}>
              <Select.Option value="开放">开放</Select.Option>
              <Select.Option value="暂停">暂停</Select.Option>
              <Select.Option value="关闭">关闭</Select.Option>
            </Select>
          </Form.Item>
        </Space>

        <Divider>AI 评估标准</Divider>
        <div style={{ marginBottom: 16 }}>
          <Button type="dashed" onClick={handleGenerateCriteria} loading={generating}>
            一键生成AI评估标准
          </Button>
          {!isEdit && <span style={{ marginLeft: 8, color: '#999', fontSize: 12 }}>（请先保存岗位后使用此功能）</span>}
        </div>
        {generating && <Spin />}
        {criteria && (
          <div style={{ background: '#f9f9f9', padding: 16, borderRadius: 6,
                        border: '1px solid #e8e8e8', whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.8 }}>
            {criteria}
          </div>
        )}

        <Divider />
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              {isEdit ? '保存修改' : '创建岗位'}
            </Button>
            <Button onClick={() => navigate('/jobs')}>取消</Button>
          </Space>
        </Form.Item>
      </Form>

      <Modal
        title="一键生成岗位"
        open={draftModalOpen}
        onCancel={() => setDraftModalOpen(false)}
        onOk={handleGenerateDraft}
        okText="生成并填入表单"
        cancelText="取消"
        confirmLoading={generatingDraft}
        width={720}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="填写岗位方向即可生成完整草稿；部门、级别、地点、业务背景、薪资预算会让结果更贴近实际。生成后不会自动保存。"
        />
        <Form form={draftForm} layout="vertical">
          <Form.Item
            name="role_prompt"
            label="岗位方向 / 招聘目标"
            rules={[{ required: true, message: '请输入要生成的岗位方向' }]}
          >
            <Input placeholder="例如：为 B 端 SaaS 产品招聘高级前端工程师" />
          </Form.Item>
          <Space size={16} style={{ width: '100%' }} wrap>
            <Form.Item name="department" label="所属部门" style={{ width: 210 }}>
              <Input placeholder="例如：技术部" />
            </Form.Item>
            <Form.Item name="seniority" label="岗位级别" style={{ width: 210 }}>
              <Select allowClear placeholder="请选择">
                {['实习', '初级', '中级', '高级', '专家', '负责人'].map(level => (
                  <Select.Option key={level} value={level}>{level}</Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="location" label="工作地点" style={{ width: 210 }}>
              <Input placeholder="例如：上海 / 远程" />
            </Form.Item>
          </Space>
          <Form.Item name="business_context" label="业务背景">
            <TextArea rows={3} placeholder="例如：负责招聘系统、简历解析、AI 匹配度等模块，需要快速迭代和稳定交付" />
          </Form.Item>
          <Space size={16} style={{ width: '100%' }} wrap>
            <Form.Item name="salary_budget" label="薪资预算" style={{ width: 320 }}>
              <Input placeholder="例如：20-35K，14薪" />
            </Form.Item>
            <Form.Item name="extra_requirements" label="补充要求" style={{ width: 320 }}>
              <Input placeholder="例如：必须有 React + Python 项目经验" />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </Card>
  )
}
