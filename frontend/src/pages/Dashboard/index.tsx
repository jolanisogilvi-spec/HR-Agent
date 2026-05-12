import { useEffect, useState } from 'react'
import { Row, Col, Card, Statistic, Spin } from 'antd'
import { TeamOutlined, FileTextOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { dashboardApi } from '../../services/api'
import type { DashboardStats } from '../../types'

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dashboardApi.getStats().then(setStats).finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ textAlign: 'center', paddingTop: 100 }}><Spin size="large" /></div>
  if (!stats) return null

  const funnelOption = {
    title: { text: '招聘漏斗', left: 'center', textStyle: { fontSize: 16 } },
    tooltip: { trigger: 'item', formatter: '{b}: {c}人' },
    series: [{
      type: 'funnel',
      left: '10%', width: '80%',
      data: [
        { value: stats.funnel.funnel['新投递'] || 0, name: '新投递' },
        { value: stats.funnel.funnel['评估中'] || 0, name: '评估中' },
        { value: stats.funnel.funnel['面试邀约'] || 0, name: '面试邀约' },
        { value: stats.funnel.funnel['面试通过'] || 0, name: '面试通过' },
      ],
      label: { formatter: '{b}\n{c}人' },
    }]
  }

  const lineOption = {
    title: { text: '近7日投递趋势', left: 'center', textStyle: { fontSize: 16 } },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: stats.daily_resumes.map(d => d.date.slice(5)) },
    yAxis: { type: 'value', name: '投递数量' },
    series: [{ data: stats.daily_resumes.map(d => d.count), type: 'line', smooth: true,
               itemStyle: { color: '#1890ff' }, areaStyle: { opacity: 0.1 } }],
  }

  const barOption = {
    title: { text: '各岗位投递分布', left: 'center', textStyle: { fontSize: 16 } },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: stats.job_distribution.map(j => j.job_title),
              axisLabel: { interval: 0, rotate: 20 } },
    yAxis: { type: 'value', name: '投递数量' },
    series: [{ data: stats.job_distribution.map(j => j.count), type: 'bar',
               itemStyle: { color: '#52c41a' } }],
  }

  return (
    <div style={{ padding: 8 }}>
      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Card>
            <Statistic title="开放岗位" value={stats.open_jobs} prefix={<TeamOutlined />} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="总候选人" value={stats.funnel.total} prefix={<FileTextOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="面试通过" value={stats.funnel.funnel['面试通过'] || 0}
                       prefix={<CheckCircleOutlined />} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="待评估" value={stats.funnel.funnel['新投递'] || 0}
                       prefix={<ClockCircleOutlined />} valueStyle={{ color: '#fa8c16' }} />
          </Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={10}>
          <Card style={{ height: 380 }}>
            <ReactECharts option={funnelOption} style={{ height: 320 }} />
          </Card>
        </Col>
        <Col span={14}>
          <Card style={{ height: 380 }}>
            <ReactECharts option={lineOption} style={{ height: 320 }} />
          </Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card>
            <ReactECharts option={barOption} style={{ height: 280 }} />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
