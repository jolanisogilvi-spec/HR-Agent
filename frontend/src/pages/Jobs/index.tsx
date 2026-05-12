import { useEffect, useState } from 'react'
import { Table, Button, Space, Tag, Popconfirm, message, Select, Card } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { jobsApi } from '../../services/api'
import type { Job } from '../../types'

const statusColor: Record<string, string> = { 开放: 'green', 暂停: 'orange', 关闭: 'red' }

export default function Jobs() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const navigate = useNavigate()

  const fetchJobs = async () => {
    setLoading(true)
    try {
      const res = await jobsApi.list({ status: statusFilter })
      setJobs(res.items)
      setTotal(res.total)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchJobs() }, [statusFilter])

  const handleDelete = async (id: number) => {
    await jobsApi.delete(id)
    message.success('岗位已删除')
    fetchJobs()
  }

  const columns = [
    { title: '岗位名称', dataIndex: 'title', key: 'title', render: (t: string, r: Job) =>
      <a onClick={() => navigate(`/jobs/${r.id}/edit`)}>{t}</a> },
    { title: '部门', dataIndex: 'department', key: 'department' },
    { title: '经验要求', key: 'exp',
      render: (_: unknown, r: Job) => `${r.experience_years_min}-${r.experience_years_max}年` },
    { title: '学历要求', dataIndex: 'education_requirement', key: 'edu' },
    { title: '关键技能', dataIndex: 'key_skills', key: 'skills',
      render: (skills: string[]) => skills?.slice(0, 3).map(s => <Tag key={s}>{s}</Tag>) },
    { title: '状态', dataIndex: 'status', key: 'status',
      render: (s: string) => <Tag color={statusColor[s]}>{s}</Tag> },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at',
      render: (t: string) => t?.slice(0, 10) },
    {
      title: '操作', key: 'action',
      render: (_: unknown, r: Job) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => navigate(`/jobs/${r.id}/edit`)}>编辑</Button>
          <Popconfirm title="确定删除此岗位？" onConfirm={() => handleDelete(r.id)}>
            <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space>
          <Select placeholder="按状态筛选" allowClear style={{ width: 140 }}
                  onChange={setStatusFilter} value={statusFilter}>
            <Select.Option value="开放">开放</Select.Option>
            <Select.Option value="暂停">暂停</Select.Option>
            <Select.Option value="关闭">关闭</Select.Option>
          </Select>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/jobs/new')}>
          新建岗位
        </Button>
      </div>
      <Table rowKey="id" dataSource={jobs} columns={columns} loading={loading}
             pagination={{ total, pageSize: 20, showTotal: t => `共 ${t} 条` }} />
    </Card>
  )
}
