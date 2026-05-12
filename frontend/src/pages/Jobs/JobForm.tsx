import { useEffect, useState } from 'react'
import { Form, Input, InputNumber, Select, Button, Card, Space, message, Spin, Divider } from 'antd'
import { useNavigate, useParams } from 'react-router-dom'
import { jobsApi } from '../../services/api'
import type { Job } from '../../types'

const { TextArea } = Input

export default function JobForm() {
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
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
      if (isEdit) {
        await jobsApi.update(Number(id), { ...values, evaluation_criteria: criteria })
        message.success('岗位已更新')
      } else {
        await jobsApi.create({ ...values, evaluation_criteria: criteria })
        message.success('岗位已创建')
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

  return (
    <Card title={isEdit ? '编辑岗位' : '新建招聘岗位'}
          extra={<Button onClick={() => navigate('/jobs')}>返回列表</Button>}>
      <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ maxWidth: 800 }}>
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
    </Card>
  )
}
