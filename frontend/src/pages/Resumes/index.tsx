import { useEffect, useState } from 'react'
import { Table, Button, Space, Tag, Select, Upload, message, Card, Progress, Modal, Form } from 'antd'
import { UploadOutlined, EyeOutlined, RobotOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { resumesApi, jobsApi } from '../../services/api'
import type { Resume, Job } from '../../types'
import type { UploadFile } from 'antd/es/upload/interface'

const statusColor: Record<string, string> = {
  新投递: 'default', 评估中: 'processing', 面试邀约: 'blue', 面试通过: 'success', 淘汰: 'error'
}

export default function Resumes() {
  const [resumes, setResumes] = useState<Resume[]>([])
  const [total, setTotal] = useState(0)
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(false)
  const [jobFilter, setJobFilter] = useState<number | undefined>()
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [evaluatingIds, setEvaluatingIds] = useState<Set<number>>(new Set())
  const [uploadForm] = Form.useForm()
  const navigate = useNavigate()

  const fetchResumes = async () => {
    setLoading(true)
    try {
      const res = await resumesApi.list({ job_id: jobFilter, status: statusFilter })
      setResumes(res.items)
      setTotal(res.total)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchResumes() }, [jobFilter, statusFilter])
  useEffect(() => { jobsApi.list({ limit: 100 }).then(r => setJobs(r.items)) }, [])

  const handleUpload = async () => {
    const jobId = uploadForm.getFieldValue('job_id')
    if (!jobId) { message.error('请选择关联岗位'); return false }
    if (fileList.length === 0) { message.error('请选择简历文件'); return false }
    setUploading(true)
    try {
      const files = fileList
        .map(item => item.originFileObj)
        .filter((file): file is NonNullable<UploadFile['originFileObj']> => !!file)
      const uploadTasks = files.map(file => {
          const fd = new FormData()
          fd.append('file', file)
          fd.append('job_id', String(jobId))
          return resumesApi.upload(fd)
        })

      const results = await Promise.allSettled(uploadTasks)
      const successCount = results.filter(r => r.status === 'fulfilled').length
      const failCount = results.length - successCount

      if (successCount === 0) {
        const failed = results.find(r => r.status === 'rejected')
        const reason = failed?.status === 'rejected' ? failed.reason?.response?.data?.detail : undefined
        message.error(reason || '上传失败')
        return false
      }

      if (failCount > 0) {
        message.warning(`已上传 ${successCount} 份，${failCount} 份失败`)
      } else {
        message.success(`已上传 ${successCount} 份简历，可稍后点击 AI评估`)
      }
      setUploadOpen(false)
      setFileList([])
      uploadForm.resetFields()
      fetchResumes()
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      message.error(detail || '上传失败')
    } finally {
      setUploading(false)
    }
    return false
  }

  const handleEvaluate = async (id: number) => {
    if (evaluatingIds.has(id)) return
    setEvaluatingIds(prev => new Set(prev).add(id))
    try {
      const res: any = await resumesApi.evaluate(id)
      message.success(res?.match_score != null ? `AI评估完成：${res.match_score}分` : 'AI评估完成')
      fetchResumes()
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      message.error(detail || 'AI评估失败，请检查简历解析状态和模型配置')
    } finally {
      setEvaluatingIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const columns = [
    { title: '姓名', dataIndex: 'candidate_name', key: 'name',
      render: (n: string, r: Resume) => <a onClick={() => navigate(`/resumes/${r.id}`)}>{n}</a> },
    { title: '岗位', key: 'job',
      render: (_: unknown, r: Resume) => jobs.find(j => j.id === r.job_id)?.title || '-' },
    { title: 'AI匹配度', dataIndex: 'match_score', key: 'score', width: 180,
      render: (s?: number) => {
        const score = typeof s === 'number' ? Math.round(s) : null
        if (score == null) return <span style={{ color: '#999' }}>未评估</span>
        const color = score >= 75 ? '#52c41a' : score >= 60 ? '#1677ff' : '#ff4d4f'
        return (
          <div style={{ width: 150 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ color, fontWeight: 600 }}>{score}%</span>
              <span style={{ color: '#999', fontSize: 12 }}>{score >= 75 ? '推荐' : score >= 60 ? '待定' : '风险'}</span>
            </div>
            <Progress
              percent={score}
              size="small"
              showInfo={false}
              status={score >= 75 ? 'success' : score >= 60 ? 'normal' : 'exception'}
            />
          </div>
        )
      },
      sorter: (a: Resume, b: Resume) => (a.match_score || 0) - (b.match_score || 0) },
    { title: '状态', dataIndex: 'status', key: 'status',
      render: (s: string) => <Tag color={statusColor[s]}>{s}</Tag> },
    { title: '邮箱', dataIndex: 'email', key: 'email' },
    { title: '投递时间', dataIndex: 'created_at', key: 'time', render: (t: string) => t?.slice(0, 10) },
    {
      title: '操作', key: 'action',
      render: (_: unknown, r: Resume) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/resumes/${r.id}`)}>详情</Button>
          <Button
            size="small"
            icon={<RobotOutlined />}
            loading={evaluatingIds.has(r.id)}
            disabled={evaluatingIds.has(r.id)}
            onClick={() => handleEvaluate(r.id)}
          >
            AI评估
          </Button>
        </Space>
      )
    }
  ]

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space>
          <Select placeholder="按岗位筛选" allowClear style={{ width: 180 }}
                  onChange={v => setJobFilter(v)} value={jobFilter}>
            {jobs.map(j => <Select.Option key={j.id} value={j.id}>{j.title}</Select.Option>)}
          </Select>
          <Select placeholder="按状态筛选" allowClear style={{ width: 140 }}
                  onChange={setStatusFilter} value={statusFilter}>
            {['新投递','评估中','面试邀约','面试通过','淘汰'].map(s =>
              <Select.Option key={s} value={s}>{s}</Select.Option>)}
          </Select>
        </Space>
        <Button type="primary" icon={<UploadOutlined />} onClick={() => setUploadOpen(true)}>上传简历</Button>
      </div>
      <Table rowKey="id" dataSource={resumes} columns={columns} loading={loading}
             pagination={{ total, pageSize: 20, showTotal: t => `共 ${t} 条` }} />

      <Modal
        title="上传简历"
        open={uploadOpen}
        onCancel={() => {
          setUploadOpen(false)
          setFileList([])
        }}
        onOk={handleUpload}
        okText="开始上传"
        confirmLoading={uploading}
        cancelText="取消"
      >
        <Form form={uploadForm} layout="vertical">
          <Form.Item name="job_id" label="关联岗位" rules={[{ required: true, message: '请选择岗位' }]}>
            <Select placeholder="选择应聘岗位">
              {jobs.map(j => <Select.Option key={j.id} value={j.id}>{j.title}</Select.Option>)}
            </Select>
          </Form.Item>
          <Upload
            multiple
            accept=".pdf,.docx,.doc"
            fileList={fileList}
            beforeUpload={() => false}
            onChange={({ fileList: nextFileList }) => setFileList(nextFileList)}
          >
            <Button icon={<UploadOutlined />}>选择简历文件（可多选）</Button>
          </Upload>
        </Form>
      </Modal>
    </Card>
  )
}
