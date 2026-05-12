import { useEffect, useState } from 'react'
import { Table, Button, Space, Tag, Card, Modal, Form, Input, InputNumber, DatePicker, Select, message, Tabs, List, Popconfirm } from 'antd'
import { PlusOutlined, CalendarOutlined, DeleteOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { interviewsApi, resumesApi } from '../../services/api'
import type { Interview, Resume } from '../../types'

const DAY_NAMES = ['周一','周二','周三','周四','周五','周六','周日']

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
  const [avForm] = Form.useForm()

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
    await interviewsApi.addHrAvailability(values)
    message.success('可用时间已添加')
    avForm.resetFields()
    fetchAll()
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
    { title: '邮件', dataIndex: 'email_sent', key: 'email',
      render: (s: boolean) => <Tag color={s ? 'success' : 'default'}>{s ? '已发送' : '未发送'}</Tag> },
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
              <Table rowKey="id" dataSource={interviews} columns={columns} loading={loading}
                     pagination={{ total, pageSize: 20 }} />
            </Card>
          )
        },
        {
          key: 'availability',
          label: 'HR可用时间管理',
          children: (
            <Card>
              <Form form={avForm} layout="inline" onFinish={handleAddAvailability} style={{ marginBottom: 16 }}>
                <Form.Item name="day_of_week" label="星期" rules={[{ required: true }]}>
                  <Select style={{ width: 100 }}>
                    {DAY_NAMES.map((d, i) => <Select.Option key={i} value={i}>{d}</Select.Option>)}
                  </Select>
                </Form.Item>
                <Form.Item name="start_time" label="开始时间" rules={[{ required: true }]}>
                  <Input placeholder="09:00" style={{ width: 100 }} />
                </Form.Item>
                <Form.Item name="end_time" label="结束时间" rules={[{ required: true }]}>
                  <Input placeholder="18:00" style={{ width: 100 }} />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit">添加时间段</Button>
                </Form.Item>
              </Form>
              <List dataSource={availability} renderItem={(slot: any) => (
                <List.Item actions={[
                  <Popconfirm title="确定删除此时间段？"
                              onConfirm={() => interviewsApi.deleteHrAvailability(slot.id).then(fetchAll)}>
                    <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
                  </Popconfirm>
                ]}>
                  <span>{slot.day_name}：{slot.start_time} -- {slot.end_time}</span>
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
              {resumes.map(r => (
                <Select.Option key={r.id} value={r.id}>{r.candidate_name}</Select.Option>
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
              {resumes.map(r => (
                <Select.Option key={r.id} value={r.id}>{r.candidate_name}</Select.Option>
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
    </>
  )
}
