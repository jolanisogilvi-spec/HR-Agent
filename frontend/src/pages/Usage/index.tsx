import { useEffect, useMemo, useState } from 'react'
import { Alert, Card, Col, Row, Space, Spin, Statistic, Table, Tag, Typography } from 'antd'
import { FileDoneOutlined, ThunderboltOutlined, DollarOutlined, FieldTimeOutlined } from '@ant-design/icons'
import { usageApi } from '../../services/api'
import type { UsageBreakdown, UsageStats } from '../../types'

const { Text } = Typography

const formatNumber = (value?: number) => (value || 0).toLocaleString()
const formatCost = (value?: number) => `¥${(value || 0).toFixed(6)}`

export default function Usage() {
  const [stats, setStats] = useState<UsageStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    usageApi.getStats().then(setStats).finally(() => setLoading(false))
  }, [])

  const modelRows = useMemo(() => stats?.by_model.map((row, index) => ({ ...row, key: `${row.model}-${index}` })) || [], [stats])
  const purposeRows = useMemo(
    () => stats?.by_purpose.map((row, index) => ({ ...row, key: `${row.purpose}-${row.model}-${index}` })) || [],
    [stats],
  )

  if (loading) return <div style={{ textAlign: 'center', paddingTop: 100 }}><Spin size="large" /></div>
  if (!stats) return null

  const tokenColumns = [
    { title: '实际模型', dataIndex: 'model', key: 'model',
      render: (model: string, row: UsageBreakdown) => (
        <Space>
          <Tag color={row.normalized_model.includes('pro') ? 'purple' : 'blue'}>{model}</Tag>
          {model !== row.normalized_model ? <Text type="secondary">按 {row.normalized_model} 计价</Text> : null}
        </Space>
      ) },
    { title: '调用次数', dataIndex: 'call_count', key: 'call_count', align: 'right' as const,
      render: formatNumber },
    { title: '输入 Token', dataIndex: 'prompt_tokens', key: 'prompt_tokens', align: 'right' as const,
      render: formatNumber },
    { title: '缓存命中', dataIndex: 'prompt_cache_hit_tokens', key: 'prompt_cache_hit_tokens', align: 'right' as const,
      render: formatNumber },
    { title: '缓存未命中', dataIndex: 'prompt_cache_miss_tokens', key: 'prompt_cache_miss_tokens', align: 'right' as const,
      render: formatNumber },
    { title: '输出 Token', dataIndex: 'completion_tokens', key: 'completion_tokens', align: 'right' as const,
      render: formatNumber },
    { title: '总 Token', dataIndex: 'total_tokens', key: 'total_tokens', align: 'right' as const,
      render: formatNumber },
    { title: '估算费用', dataIndex: 'estimated_cost_cny', key: 'estimated_cost_cny', align: 'right' as const,
      render: formatCost },
  ]

  return (
    <div style={{ padding: 8 }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={6}>
          <Card>
            <Statistic title="已评估简历" value={stats.summary.evaluated_resumes} prefix={<FileDoneOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card>
            <Statistic title="AI 调用次数" value={stats.summary.ai_call_count} prefix={<ThunderboltOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card>
            <Statistic title="累计 Token" value={stats.summary.total_tokens} prefix={<FieldTimeOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card>
            <Statistic title="估算费用（元）" value={stats.summary.estimated_cost_cny} precision={6}
                       prefix={<DollarOutlined />} />
          </Card>
        </Col>
      </Row>

      <Alert
        style={{ marginTop: 16 }}
        type="info"
        showIcon
        message="Token 用量从本功能上线后的模型调用开始精确记录；历史已评估简历会计入数量，但没有历史 token 明细。费用按 DeepSeek 官方价格文档估算，实际账单以平台后台为准。"
      />

      <Card title="按模型统计" style={{ marginTop: 16 }}>
        <Table
          rowKey="key"
          dataSource={modelRows}
          columns={tokenColumns}
          pagination={false}
          size="middle"
        />
      </Card>

      <Card title="按调用场景统计" style={{ marginTop: 16 }}>
        <Table
          rowKey="key"
          dataSource={purposeRows}
          columns={[
            { title: '场景', dataIndex: 'purpose_label', key: 'purpose_label' },
            ...tokenColumns,
          ]}
          pagination={false}
          size="middle"
        />
      </Card>

      <Card title="最近调用" style={{ marginTop: 16 }}>
        <Table
          rowKey="id"
          dataSource={stats.recent_calls}
          size="small"
          pagination={{ pageSize: 10 }}
          columns={[
            { title: '时间', dataIndex: 'created_at', key: 'created_at',
              render: (time: string) => time?.replace('T', ' ').slice(0, 19) },
            { title: '场景', dataIndex: 'purpose_label', key: 'purpose_label' },
            { title: '模型', dataIndex: 'model', key: 'model',
              render: (model: string) => <Tag>{model}</Tag> },
            { title: '输入', dataIndex: 'prompt_tokens', key: 'prompt_tokens', align: 'right',
              render: formatNumber },
            { title: '缓存命中', dataIndex: 'prompt_cache_hit_tokens', key: 'prompt_cache_hit_tokens', align: 'right',
              render: formatNumber },
            { title: '缓存未命中', dataIndex: 'prompt_cache_miss_tokens', key: 'prompt_cache_miss_tokens', align: 'right',
              render: formatNumber },
            { title: '输出', dataIndex: 'completion_tokens', key: 'completion_tokens', align: 'right',
              render: formatNumber },
            { title: '费用', dataIndex: 'estimated_cost_cny', key: 'estimated_cost_cny', align: 'right',
              render: formatCost },
          ]}
        />
      </Card>

      <Card title="当前计价口径" style={{ marginTop: 16 }}>
        <Space direction="vertical" size={8}>
          <Text>DeepSeek 价格单位：{stats.pricing.unit}</Text>
          {Object.entries(stats.pricing.models).map(([model, pricing]) => (
            <Text key={model}>
              {model}：输入缓存命中 {pricing.input_cache_hit}，输入缓存未命中 {pricing.input_cache_miss}，输出 {pricing.output}
            </Text>
          ))}
          <a href={stats.pricing.source_url} target="_blank" rel="noreferrer">{stats.pricing.source}</a>
        </Space>
      </Card>
    </div>
  )
}
