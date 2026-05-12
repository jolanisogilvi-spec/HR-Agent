import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Row, Col, Tag, Button, Timeline, Descriptions, Space, Select, message, Divider, List } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { resumesApi, jobsApi } from '../../services/api'
import type { Resume, Job } from '../../types'

const statusColor: Record<string, string> = {
  新投递: 'default', 评估中: 'processing', 面试邀约: 'blue', 面试通过: 'success', 淘汰: 'error'
}

export default function ResumeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [resume, setResume] = useState<Resume | null>(null)
  const [job, setJob] = useState<Job | null>(null)

  const fetchData = async () => {
    const r = await resumesApi.get(Number(id))
    setResume(r)
    if (r.job_id) {
      const j = await jobsApi.get(r.job_id)
      setJob(j)
    }
  }

  useEffect(() => { fetchData() }, [id])

  const handleStatusChange = async (status: string) => {
    await resumesApi.updateStatus(Number(id), status)
    message.success('状态已更新')
    fetchData()
  }

  if (!resume) return null

  const dimScores = resume.ai_evaluation?.dimension_scores || {}
  const radarIndicators = Object.keys(dimScores).length > 0
    ? Object.keys(dimScores).map(k => ({ name: k, max: 100 }))
    : ['技能匹配度', '经验匹配度', '学历匹配度', '综合素质'].map(k => ({ name: k, max: 100 }))

  const radarValues = radarIndicators.map(ind => dimScores[ind.name] || 0)

  const radarOption = {
    title: { text: '候选人能力雷达图', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: {},
    radar: { indicator: radarIndicators, radius: 100 },
    series: [{
      type: 'radar',
      data: [{ value: radarValues, name: resume.candidate_name,
               areaStyle: { opacity: 0.2 }, itemStyle: { color: '#1890ff' } }],
    }]
  }

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/resumes')} style={{ marginBottom: 16 }}>
        返回人才库
      </Button>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title="候选人信息"
                extra={
                  <Space>
                    <Select value={resume.status} onChange={handleStatusChange} style={{ width: 140 }}>
                      {['新投递','评估中','面试邀约','面试通过','淘汰'].map(s =>
                        <Select.Option key={s} value={s}><Tag color={statusColor[s]}>{s}</Tag></Select.Option>)}
                    </Select>
                    {resume.match_score != null && (
                      <Tag color={resume.match_score >= 75 ? 'success' : resume.match_score >= 60 ? 'blue' : 'error'}
                           style={{ fontSize: 14, padding: '4px 12px' }}>
                        AI匹配度: {resume.match_score}分
                      </Tag>
                    )}
                  </Space>
                }>
            <Descriptions column={3}>
              <Descriptions.Item label="姓名">{resume.candidate_name}</Descriptions.Item>
              <Descriptions.Item label="邮箱">{resume.email || '-'}</Descriptions.Item>
              <Descriptions.Item label="电话">{resume.phone || '-'}</Descriptions.Item>
              <Descriptions.Item label="应聘岗位">{job?.title || '-'}</Descriptions.Item>
              <Descriptions.Item label="简历文件">{resume.file_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="投递时间">{resume.created_at?.slice(0, 10)}</Descriptions.Item>
            </Descriptions>
            {resume.skills?.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <strong>技能标签：</strong>
                {resume.skills.map(s => <Tag key={s} color="blue" style={{ margin: 2 }}>{s}</Tag>)}
              </div>
            )}
          </Card>
        </Col>

        <Col span={10}>
          <Card title="能力评估雷达图" style={{ height: 380 }}>
            {Object.keys(dimScores).length > 0
              ? <ReactECharts option={radarOption} style={{ height: 300 }} />
              : <div style={{ textAlign: 'center', paddingTop: 80, color: '#999' }}>暂无评估数据，请先进行AI评估</div>}
          </Card>
        </Col>
        <Col span={14}>
          {resume.ai_evaluation && (
            <Card title="AI综合评估报告">
              <div style={{ marginBottom: 12 }}>
                <strong>推荐结论：</strong>
                <Tag color={resume.ai_evaluation.recommendation?.includes('强烈') ? 'success' :
                             resume.ai_evaluation.recommendation?.includes('推荐') ? 'blue' : 'warning'}
                     style={{ marginLeft: 8 }}>
                  {resume.ai_evaluation.recommendation}
                </Tag>
              </div>
              <div style={{ marginBottom: 12 }}>
                <strong>综合评价：</strong>
                <p style={{ marginTop: 4, color: '#555' }}>{resume.ai_evaluation.overall_assessment}</p>
              </div>
              <Row gutter={16}>
                <Col span={12}>
                  <strong style={{ color: '#52c41a' }}>核心优势</strong>
                  <List size="small" dataSource={resume.ai_evaluation.core_strengths}
                        renderItem={item => <List.Item style={{ padding: '4px 0', fontSize: 13 }}>{item}</List.Item>} />
                </Col>
                <Col span={12}>
                  <strong style={{ color: '#fa8c16' }}>潜在风险</strong>
                  <List size="small" dataSource={resume.ai_evaluation.potential_risks}
                        renderItem={item => <List.Item style={{ padding: '4px 0', fontSize: 13 }}>{item}</List.Item>} />
                </Col>
              </Row>
              <Divider style={{ margin: '12px 0' }} />
              <strong>面试重点建议</strong>
              <List size="small" dataSource={resume.ai_evaluation.interview_suggestions}
                    renderItem={item => <List.Item style={{ padding: '4px 0', fontSize: 13 }}>* {item}</List.Item>} />
            </Card>
          )}
        </Col>

        {resume.experience?.length > 0 && (
          <Col span={24}>
            <Card title="工作经历">
              <Timeline items={resume.experience.map(exp => ({
                children: (
                  <div>
                    <div style={{ fontWeight: 600 }}>{exp.company} - {exp.position}</div>
                    <div style={{ color: '#888', fontSize: 12 }}>{exp.start_date} -- {exp.end_date || '至今'}</div>
                    <div style={{ marginTop: 4, color: '#555' }}>{exp.description}</div>
                    {exp.achievements?.length > 0 && (
                      <ul style={{ marginTop: 4, paddingLeft: 20, fontSize: 13 }}>
                        {exp.achievements.map((a, i) => <li key={i}>{a}</li>)}
                      </ul>
                    )}
                  </div>
                )
              }))} />
            </Card>
          </Col>
        )}

        {resume.education?.length > 0 && (
          <Col span={24}>
            <Card title="教育经历">
              {resume.education.map((edu, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <strong>{edu.school}</strong>
                  <span style={{ marginLeft: 12 }}>{edu.degree} - {edu.major}</span>
                  <span style={{ marginLeft: 12, color: '#888' }}>{edu.start_year} -- {edu.end_year}</span>
                </div>
              ))}
            </Card>
          </Col>
        )}
      </Row>
    </div>
  )
}
