import { Layout, Menu } from 'antd'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  DashboardOutlined, TeamOutlined, FileTextOutlined, CalendarOutlined, SettingOutlined, BarChartOutlined
} from '@ant-design/icons'

const { Sider, Content, Header } = Layout

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '数据看板', desc: '招聘漏斗与趋势' },
  { key: '/jobs', icon: <TeamOutlined />, label: '岗位管理', desc: '岗位与评估标准' },
  { key: '/resumes', icon: <FileTextOutlined />, label: '人才库', desc: '简历解析与匹配' },
  { key: '/interviews', icon: <CalendarOutlined />, label: '面试管理', desc: '面试安排与跟进' },
  { key: '/usage', icon: <BarChartOutlined />, label: '用量统计', desc: '模型调用与成本' },
  { key: '/settings', icon: <SettingOutlined />, label: '系统设置', desc: '模型与基础配置' },
]

export default function MainLayout() {
  const navigate = useNavigate()
  const location = useLocation()

  const selectedKey = menuItems.find(item => location.pathname.startsWith(item.key))?.key || '/dashboard'
  const currentItem = menuItems.find(item => item.key === selectedKey) || menuItems[0]

  return (
    <Layout className="app-shell">
      <Sider theme="dark" width={220} className="app-sider">
        <div className="brand-panel">
          <div className="brand-mark">HR</div>
          <div>
            <div className="brand-title">智能HR Agent</div>
            <div className="brand-subtitle">AI Recruiting OS</div>
          </div>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          className="app-menu"
        />
      </Sider>
      <Layout className="app-main">
        <Header className="app-header">
          <div>
            <div className="page-kicker">{currentItem.desc}</div>
            <div className="page-title">{currentItem.label}</div>
          </div>
          <div className="system-status">
            <span className="status-dot" />
            系统在线
          </div>
        </Header>
        <Content className="app-content">
          <div className="content-panel">
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}
