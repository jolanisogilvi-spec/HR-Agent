import { useEffect, useState } from 'react'
import { Button, Card, Col, Divider, Form, Input, InputNumber, Row, Space, Spin, Tag, message } from 'antd'
import { SaveOutlined, ReloadOutlined } from '@ant-design/icons'
import { settingsApi } from '../../services/api'
import type { AppSettings } from '../../types'

type SettingsFormValues = {
  ai: AppSettings['ai']
  email: AppSettings['email']
  app: AppSettings['app']
}

export default function Settings() {
  const [form] = Form.useForm<SettingsFormValues>()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<AppSettings | null>(null)

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const data = await settingsApi.get()
      setSettings(data)
      form.setFieldsValue(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const handleSave = async (values: SettingsFormValues) => {
    setSaving(true)
    try {
      const data = await settingsApi.update(values)
      setSettings(data)
      form.setFieldsValue(data)
      message.success('设置已保存')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div style={{ textAlign: 'center', paddingTop: 100 }}><Spin size="large" /></div>
  }

  return (
    <Card
      title="系统设置"
      extra={
        <Space>
          {settings?.overrides.length ? <Tag color="blue">已覆盖 {settings.overrides.length} 项</Tag> : null}
          <Button icon={<ReloadOutlined />} onClick={fetchSettings}>刷新</Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" onFinish={handleSave}>
        <Divider orientation="left">AI 模型</Divider>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name={['ai', 'model']} label="模型名称" rules={[{ required: true, message: '请输入模型名称' }]}>
              <Input placeholder="deepseek-v4-pro" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name={['ai', 'base_url']} label="接口地址" rules={[{ required: true, message: '请输入接口地址' }]}>
              <Input placeholder="https://api.deepseek.com" />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item
              name={['ai', 'api_key']}
              label={settings?.ai.api_key_set ? 'API Key（已设置，留空则不修改）' : 'API Key'}
            >
              <Input.Password placeholder="输入新的 API Key" autoComplete="new-password" />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">邮件服务</Divider>
        <Row gutter={16}>
          <Col span={10}>
            <Form.Item name={['email', 'smtp_host']} label="SMTP 服务器">
              <Input placeholder="smtp.example.com" />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item name={['email', 'smtp_port']} label="端口">
              <InputNumber min={1} max={65535} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={10}>
            <Form.Item name={['email', 'smtp_user']} label="账号">
              <Input placeholder="hr@example.com" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name={['email', 'smtp_password']}
              label={settings?.email.smtp_password_set ? '密码（已设置，留空则不修改）' : '密码'}
            >
              <Input.Password placeholder="输入新的 SMTP 密码" autoComplete="new-password" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name={['email', 'smtp_from_email']} label="发件邮箱">
              <Input placeholder="hr@example.com" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name={['email', 'smtp_from_name']} label="发件名称">
              <Input placeholder="HR智能招聘系统" />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">基础配置</Divider>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name={['app', 'resume_watch_dir']} label="简历监听目录">
              <Input placeholder="./watched_resumes" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name={['app', 'cors_origins']} label="允许访问来源">
              <Input placeholder="http://localhost:5173,http://localhost:3000" />
            </Form.Item>
          </Col>
        </Row>

        <Divider />
        <Form.Item>
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
            保存设置
          </Button>
        </Form.Item>
      </Form>
    </Card>
  )
}
