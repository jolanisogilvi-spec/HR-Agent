import { useEffect, useState } from 'react'
import { Table, Button, Space, Tag, Card, Modal, Form, Input, InputNumber, DatePicker, Select, message, Tabs, List, Popconfirm, TimePicker, Upload, Progress, Typography, Divider } from 'antd'
import { PlusOutlined, CalendarOutlined, DeleteOutlined, UploadOutlined, FileSearchOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { interviewsApi, resumesApi } from '../../services/api'
import type { Interview, Resume } from '../../types'

const DAY_NAMES = ['周一','周二','周三','周四','周五','周六','周日']
const formatAvailabilityTime = (value?: string) => value ? value.slice(0, 5) : ''
const scoreColor = (score?: number) => {
  if (score == null) return 'default'
  if (score >= 85) return 'success'
  if (score >= 70) return 'processing'
  if (score >= 60) return 'warning'
  return 'error'
}

export default function Interviews() {
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [autoOpen, setAutoOpen] = useState(false)
  const [form] = Form.useForm()
  const [autoForm] = Form.useForm()
  const [resumes, setResumes] = useState<Resume[]>([])
  const [suggestedTimes, setSuggestedTimes] = useState<string[]>([])
  const [availability, setAvailability] = useState<any[]>([])
  const [addingAvailability, setAddingAvailability] = useState(false)
  const [avForm] = Form.useForm()
  const [minutesOpen, setMinutesOpen] = useState(false)
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null)
  const [minutesFileList, setMinutesFileList] = useState<any[]>([])
  const [evaluatingMinutes, setEvaluatingMinutes] = useState(false)
  const availableResumes = resumes.filter(r => r.status !== '面试通过')

  const fetchAll = async () => {
    setLoading(true)
    const [ivRes, avRes] = await Promise.all([
      interviewsApi.list(),
      interviewsApi.getHrAvailability(),
    ])
    setInterviews(ivRes.items)
    setTotal(ivRes.total)
    setAvailability(avRes)
    setLoading(false)
  }

  useEffect(() => {
    fetchAll()
    resumesApi.list({ limit: 200 }).then(r => setResumes(r.items))
  }, [])

  const handleCreate = async (values: any) => {
    await interviewsApi.create({
      ...values,
      scheduled_time: values.scheduled_time.toISOString(),
    })
    message.success('面试已安排')
    setCreateOpen(false)
    form.resetFields()
    fetchAll()
  }

  const handleAutoSchedule = async (values: any) => {
    const res = await interviewsApi.autoSchedule({
      resume_id: values.resume_id,
      duration_minutes: values.duration_minutes,
    })
    setSuggestedTimes(res.suggested_times)
  }

  const handleConfirmTime = async (time: string) => {
    const resumeId = autoForm.getFieldValue('resume_id')
    const duration = autoForm.getFieldValue('duration_minutes') || 60
    const interviewerName = autoForm.getFieldValue('interviewer_name')
    await interviewsApi.create({
      resume_id: resumeId,
      scheduled_time: time,
      duration_minutes: duration,
      interviewer_name: interviewerName,
    })
    message.success('面试已确认安排')
    setAutoOpen(false)
    setSuggestedTimes([])
    autoForm.resetFields()
    fetchAll()
  }

  const handleAddAvailability = async (values: any) => {
    const startDay = values.day_start
    const endDay = values.day_end
    if (startDay == null || endDay == null) {
      message.error('请选择星期范围')
      return
    }
    if (startDay > endDay) {
      message.error('结束星期不能早于开始星期')
      return
    }
    const startTime = values.start_time?.format?.('HH:mm')
    const endTime = values.end_time?.format?.('HH:mm')
    if (!startTime || !endTime) {
      message.error('请选择开始和结束时间')
      return
    }
    if (startTime >= endTime) {
      message.error('开始时间必须早于结束时间')
      return
    }

    setAddingAvailability(true)
    try {
      const tasks = []
      for (let day = startDay; day <= endDay; day += 1) {
        tasks.push(interviewsApi.addHrAvailability({
          day_of_week: day,
          start_time: startTime,
          end_time: endTime,
          is_active: true,
        }))
      }
      await Promise.all(tasks)
      message.success(`已添加 ${tasks.length} 个可用时间段`)
      avForm.resetFields()
      fetchAll()
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      message.error(detail || '添加可用时间失败')
    } finally {
      setAddingAvailability(false)
    }
  }

  const handleDeleteInterview = async (id: number) => {
    await interviewsApi.delete(id)
    message.success('面试记录已删除')
    fetchAll()
  }

  const openMinutesModal = (interview: Interview) => {
    setSelectedInterview(interview)
    setMinutesFileList([])
    setMinutesOpen(true)
  }

  const handleUploadMinutes = async () => {
    if (!selectedInterview) return
    const file = minutesFileList[0]?.originFileObj
    if (!file) {
      message.warning('请先选择会议纪要文件')
      return
    }
    const formData = new FormData()
    formData.append('file', file)
    setEvaluatingMinutes(true)
    try {
      const updated = await interviewsApi.uploadMinutes(selectedInterview.id, formData)
      setSelectedInterview(updated)
      message.success('会议纪要已上传，AI评估完成')
      fetchAll()
      setMinutesFileList([])
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      message.error(detail || '会议纪要评估失败')
    } finally {
      setEvaluatingMinutes(false)
    }
  }

  const columns = [
    { title: '候选人', dataIndex: 'candidate_name', key: 'name' },
    { title: '应聘岗位', dataIndex: 'job_title', key: 'job' },
    { title: '面试时间', dataIndex: 'scheduled_time', key: 'time',
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm') },
    { title: '时长', dataIndex: 'duration_minutes', key: 'dur', render: (d: number) => `${d}分钟` },
    { title: '面试官', dataIndex: 'interviewer_name', key: 'iv', render: (n?: string) => n || '-' },
    { title: '地点/链接', key: 'loc', render: (_: unknown, r: Interview) =>
      r.meeting_link ? <a href={r.meeting_link} target="_blank" rel="noopener noreferrer">线上会议</a> : r.location || '-' },
    { title: '状态', dataIndex: 'status', key: 'status',
      render: (s: string) => <Tag color={s === '已完成' ? 'success' : s === '已取消' ? 'error' : 'blue'}>{s}</Tag> },
    { title: '面试评分', dataIndex: 'interview_ai_score', key: 'interview_ai_score',
      render: (score?: number) => score == null ? <Tag>未评估</Tag> : <Tag color={scoreColor(score)}>{Math.round(score)}分</Tag> },
    { title: '邮件', dataIndex: 'email_sent', key: 'email',
      render: (s: boolean) => <Tag color={s ? 'success' : 'default'}>{s ? '已发送' : '未发送'}</Tag> },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, r: Interview) => (
        <Space>
          <Button size="small" icon={<FileSearchOutlined />} onClick={() => openMinutesModal(r)}>
            纪要评估
          </Button>
          <Popconfirm title="确定删除此面试记录？" onConfirm={() => handleDeleteInterview(r.id)}>
            <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      )
    },
  ]

  return (
    <>
      <Tabs defaultActiveKey="list" items={[
        {
          key: 'list',
          label: '面试列表',
          children: (
            <Card>
              <Space style={{ marginBottom: 16 }}>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>安排面试</Button>
                <Button icon={<CalendarOutlined />} onClick={() => setAutoOpen(true)}>智能推荐时间</Button>
              </Space>
              <Table rowKey="id" dataSource={interviews} columns={columns} loading={loading} scroll={{ x: 1180 }}
                     pagination={{ total, pageSize: 20 }} />
            </Card>
          )
        },
        {
          key: 'availability',
          label: 'HR可用时间管理',
          children: (
            <Card>
              <Form
                form={avForm}
                layout="inline"
                onFinish={handleAddAvailability}
                style={{ marginBottom: 16, rowGap: 12 }}
                initialValues={{
                  day_start: 0,
                  day_end: 4,
                  start_time: dayjs().hour(9).minute(0).second(0),
                  end_time: dayjs().hour(18).minute(0).second(0),
                }}
              >
                <Form.Item name="day_start" label="开始星期" rules={[{ required: true, message: '请选择开始星期' }]}>
                  <Select style={{ width: 112 }}>
                    {DAY_NAMES.map((d, i) => <Select.Option key={i} value={i}>{d}</Select.Option>)}
                  </Select>
                </Form.Item>
                <Form.Item name="day_end" label="结束星期" rules={[{ required: true, message: '请选择结束星期' }]}>
                  <Select style={{ width: 112 }}>
                    {DAY_NAMES.map((d, i) => <Select.Option key={i} value={i}>{d}</Select.Option>)}
                  </Select>
                </Form.Item>
                <Form.Item name="start_time" label="开始时间" rules={[{ required: true, message: '请选择开始时间' }]}>
                  <TimePicker format="HH:mm" minuteStep={15} showNow={false} inputReadOnly style={{ width: 112 }} />
                </Form.Item>
                <Form.Item name="end_time" label="结束时间" rules={[{ required: true, message: '请选择结束时间' }]}>
                  <TimePicker format="HH:mm" minuteStep={15} showNow={false} inputReadOnly style={{ width: 112 }} />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit" loading={addingAvailability}>添加时间段</Button>
                </Form.Item>
              </Form>
              <List dataSource={availability} renderItem={(slot: any) => (
                <List.Item actions={[
                  <Popconfirm title="确定删除此时间段？"
                              onConfirm={() => interviewsApi.deleteHrAvailability(slot.id).then(fetchAll)}>
                    <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
                  </Popconfirm>
                ]}>
                  <span>{slot.day_name}：{formatAvailabilityTime(slot.start_time)} -- {formatAvailabilityTime(slot.end_time)}</span>
                </List.Item>
              )} />
            </Card>
          )
        }
      ]} />

      <Modal
        title="安排面试"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => form.submit()}
        okText="确认安排"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" onFinish={handleCreate} initialValues={{ duration_minutes: 60 }}>
          <Form.Item name="resume_id" label="候选人" rules={[{ required: true, message: '请选择候选人' }]}>
            <Select placeholder="选择候选人">
              {availableResumes.map(r => (
                <Select.Option key={r.id} value={r.id}>
                  {r.candidate_name} ｜ {r.status}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="scheduled_time" label="面试时间" rules={[{ required: true, message: '请选择面试时间' }]}>
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="duration_minutes" label="面试时长（分钟）">
            <InputNumber min={15} max={480} step={15} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="interviewer_name" label="面试官">
            <Input placeholder="面试官姓名" />
          </Form.Item>
          <Form.Item name="location" label="面试地点">
            <Input placeholder="线下面试地点" />
          </Form.Item>
          <Form.Item name="meeting_link" label="线上会议链接">
            <Input placeholder="https://..." />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="智能推荐时间"
        open={autoOpen}
        onCancel={() => {
          setAutoOpen(false)
          setSuggestedTimes([])
        }}
        footer={null}
      >
        <Form form={autoForm} layout="vertical" onFinish={handleAutoSchedule} initialValues={{ duration_minutes: 60 }}>
          <Form.Item name="resume_id" label="候选人" rules={[{ required: true, message: '请选择候选人' }]}>
            <Select placeholder="选择候选人">
              {availableResumes.map(r => (
                <Select.Option key={r.id} value={r.id}>
                  {r.candidate_name} ｜ {r.status}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="duration_minutes" label="面试时长（分钟）">
            <InputNumber min={15} max={480} step={15} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="interviewer_name" label="面试官">
            <Input placeholder="面试官姓名" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>生成推荐时间</Button>
        </Form>
        {suggestedTimes.length > 0 && (
          <List
            style={{ marginTop: 16 }}
            dataSource={suggestedTimes}
            renderItem={time => (
              <List.Item actions={[
                <Button type="link" onClick={() => handleConfirmTime(time)}>确认</Button>
              ]}>
                {dayjs(time).format('YYYY-MM-DD HH:mm')}
              </List.Item>
            )}
          />
        )}
      </Modal>

      <Modal
        title="面试会议纪要 AI 评估"
        open={minutesOpen}
        onCancel={() => setMinutesOpen(false)}
        footer={[
          <Button key="close" onClick={() => setMinutesOpen(false)}>关闭</Button>,
          <Button key="upload" type="primary" icon={<UploadOutlined />} loading={evaluatingMinutes} onClick={handleUploadMinutes}>
            上传并评估
          </Button>,
        ]}
        width={720}
      >
        {selectedInterview && (
          <>
            <Space direction="vertical" size={4} style={{ marginBottom: 16 }}>
              <Typography.Text strong>{selectedInterview.candidate_name || '-'} ｜ {selectedInterview.job_title || '-'}</Typography.Text>
              <Typography.Text type="secondary">
                支持 PDF、Word、TXT、Markdown，上传后会自动解析纪要并调用当前设置的 AI 模型评分。
              </Typography.Text>
            </Space>

            <Upload.Dragger
              accept=".pdf,.doc,.docx,.txt,.md"
              maxCount={1}
              fileList={minutesFileList}
              beforeUpload={() => false}
              onChange={({ fileList }) => setMinutesFileList(fileList)}
            >
              <p className="ant-upload-drag-icon"><UploadOutlined /></p>
              <p className="ant-upload-text">点击或拖拽上传会议纪要</p>
              <p className="ant-upload-hint">上传后系统会自动进行面试复盘、评分和后续建议生成</p>
            </Upload.Dragger>

            {selectedInterview.interview_ai_score != null && selectedInterview.interview_ai_evaluation && (
              <>
                <Divider />
                <Space align="center" size={16} style={{ marginBottom: 12 }}>
                  <Progress
                    type="circle"
                    percent={Math.round(selectedInterview.interview_ai_score)}
                    size={86}
                    strokeColor={selectedInterview.interview_ai_score >= 70 ? '#20c997' : '#f5a524'}
                  />
                  <Space direction="vertical" size={4}>
                    <Tag color={scoreColor(selectedInterview.interview_ai_score)}>
                      {selectedInterview.interview_ai_evaluation.decision || '已评估'}
                    </Tag>
                    <Typography.Text strong>{selectedInterview.interview_ai_evaluation.summary}</Typography.Text>
                    {selectedInterview.meeting_minutes_file_name && (
                      <Typography.Text type="secondary">纪要文件：{selectedInterview.meeting_minutes_file_name}</Typography.Text>
                    )}
                  </Space>
                </Space>
                <List
                  size="small"
                  header="优势"
                  dataSource={selectedInterview.interview_ai_evaluation.strengths || []}
                  renderItem={item => <List.Item>{item}</List.Item>}
                />
                <List
                  size="small"
                  header="风险"
                  dataSource={selectedInterview.interview_ai_evaluation.risks || []}
                  renderItem={item => <List.Item>{item}</List.Item>}
                />
                <List
                  size="small"
                  header="后续建议"
                  dataSource={selectedInterview.interview_ai_evaluation.next_steps || []}
                  renderItem={item => <List.Item>{item}</List.Item>}
                />
              </>
            )}
          </>
        )}
      </Modal>
    </>
  )
}
