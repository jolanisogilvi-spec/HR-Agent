import { useEffect, useMemo, useState } from 'react'
import { Row, Col, Card, Statistic, Spin, Space, Tag } from 'antd'
import { TeamOutlined, FileTextOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { dashboardApi } from '../../services/api'
import type { DashboardStats } from '../../types'

const chartText = '#D7E6FF'
const chartMuted = 'rgba(215, 230, 255, 0.62)'
const gridLine = 'rgba(123, 190, 255, 0.14)'

const formatJobAxisLabel = (value: string) => {
  const chars = Array.from(value || '')
  if (chars.length <= 7) return value
  if (chars.length <= 14) return `${chars.slice(0, 7).join('')}\n${chars.slice(7).join('')}`
  return `${chars.slice(0, 7).join('')}\n${chars.slice(7, 13).join('')}...`
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dashboardApi.getStats().then(setStats).finally(() => setLoading(false))
  }, [])

  const todayCount = useMemo(() => {
    if (!stats?.daily_resumes.length) return 0
    return stats.daily_resumes[stats.daily_resumes.length - 1]?.count || 0
  }, [stats])

  if (loading) return <div style={{ textAlign: 'center', paddingTop: 100 }}><Spin size="large" /></div>
  if (!stats) return null

  const funnelData = [
    { value: stats.funnel.funnel['新投递'] || 0, name: '新投递', itemStyle: { color: '#00A3FF' } },
    { value: stats.funnel.funnel['评估中'] || 0, name: '评估中', itemStyle: { color: '#7C5CFF' } },
    { value: stats.funnel.funnel['面试邀约'] || 0, name: '面试邀约', itemStyle: { color: '#F5A524' } },
    { value: stats.funnel.funnel['面试通过'] || 0, name: '面试通过', itemStyle: { color: '#20C997' } },
  ]

  const funnelOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', formatter: '{b}: {c}人' },
    series: [{
      type: 'funnel',
      top: 34,
      bottom: 12,
      left: '8%',
      width: '84%',
      minSize: '28%',
      maxSize: '94%',
      sort: 'none',
      gap: 5,
      data: funnelData,
      label: {
        color: chartText,
        fontSize: 13,
        fontWeight: 600,
        formatter: '{b}  {c}人',
      },
      labelLine: { lineStyle: { color: 'rgba(215,230,255,0.36)' } },
      itemStyle: {
        borderColor: 'rgba(255,255,255,0.18)',
        borderWidth: 1,
      },
    }]
  }

  const lineOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(9, 18, 32, 0.92)',
      borderColor: 'rgba(0, 163, 255, 0.35)',
      textStyle: { color: '#fff' },
    },
    grid: { left: 42, right: 24, top: 34, bottom: 36 },
    xAxis: {
      type: 'category',
      data: stats.daily_resumes.map(d => d.date.slice(5)),
      axisLine: { lineStyle: { color: gridLine } },
      axisTick: { show: false },
      axisLabel: { color: chartMuted },
    },
    yAxis: {
      type: 'value',
      name: '投递',
      nameTextStyle: { color: chartMuted },
      splitLine: { lineStyle: { color: gridLine } },
      axisLabel: { color: chartMuted },
    },
    series: [{
      data: stats.daily_resumes.map(d => d.count),
      type: 'line',
      smooth: true,
      symbolSize: 8,
      lineStyle: { width: 4, color: '#00A3FF' },
      itemStyle: { color: '#20C997', borderColor: '#DDFBFF', borderWidth: 2 },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(0, 163, 255, 0.34)' },
            { offset: 1, color: 'rgba(0, 163, 255, 0.02)' },
          ],
        },
      },
    }],
  }

  const barOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(9, 18, 32, 0.92)',
      borderColor: 'rgba(32, 201, 151, 0.35)',
      textStyle: { color: '#fff' },
    },
    grid: { left: 42, right: 24, top: 34, bottom: 76 },
    xAxis: {
      type: 'category',
      data: stats.job_distribution.map(j => j.job_title),
      axisLine: { lineStyle: { color: gridLine } },
      axisTick: { show: false },
      axisLabel: {
        color: chartMuted,
        interval: 0,
        rotate: 0,
        fontSize: 12,
        lineHeight: 16,
        formatter: formatJobAxisLabel,
      },
    },
    yAxis: {
      type: 'value',
      name: '投递',
      nameTextStyle: { color: chartMuted },
      splitLine: { lineStyle: { color: gridLine } },
      axisLabel: { color: chartMuted },
    },
    series: [{
      data: stats.job_distribution.map(j => j.count),
      type: 'bar',
      barWidth: 34,
      itemStyle: {
        borderRadius: [6, 6, 0, 0],
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: '#20C997' },
            { offset: 1, color: '#00A3FF' },
          ],
        },
      },
    }],
  }

  const kpis = [
    { title: '开放岗位', value: stats.open_jobs, icon: <TeamOutlined />, tone: 'cyan', desc: 'Active Jobs' },
    { title: '总候选人', value: stats.funnel.total, icon: <FileTextOutlined />, tone: 'blue', desc: 'Candidates' },
    { title: '面试通过', value: stats.funnel.funnel['面试通过'] || 0, icon: <CheckCircleOutlined />, tone: 'green', desc: 'Passed' },
    { title: '待评估', value: stats.funnel.funnel['新投递'] || 0, icon: <ClockCircleOutlined />, tone: 'amber', desc: 'Pending' },
  ]

  return (
    <div className="bi-dashboard">
      <div className="bi-hero">
        <div>
          <div className="bi-eyebrow">Recruitment Intelligence Center</div>
          <h2>招聘数据驾驶舱</h2>
          <p>实时观察岗位、候选人、面试流转和投递趋势。</p>
        </div>
        <Space size={10} wrap>
          <Tag color="blue">近7日投递 {todayCount}</Tag>
          <Tag color="green">开放岗位 {stats.open_jobs}</Tag>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        {kpis.map(item => (
          <Col xs={24} md={12} xxl={6} key={item.title}>
            <Card className={`bi-kpi bi-kpi-${item.tone}`}>
              <div className="bi-kpi-icon">{item.icon}</div>
              <Statistic title={item.title} value={item.value} />
              <div className="bi-kpi-desc">{item.desc}</div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} xxl={10}>
          <Card className="bi-card" title="招聘漏斗">
            <ReactECharts option={funnelOption} style={{ height: 330 }} />
          </Card>
        </Col>
        <Col xs={24} xxl={14}>
          <Card className="bi-card" title="近7日投递趋势">
            <ReactECharts option={lineOption} style={{ height: 330 }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card className="bi-card" title="各岗位投递分布">
            <ReactECharts option={barOption} style={{ height: 310 }} />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
