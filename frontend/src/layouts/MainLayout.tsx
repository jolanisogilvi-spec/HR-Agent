import { Layout, Menu } from 'antd'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  DashboardOutlined, TeamOutlined, FileTextOutlined, CalendarOutlined, SettingOutlined, BarChartOutlined
} from '@ant-design/icons'

const { Sider, Content, Header } = Layout

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '数据看板' },
  { key: '/jobs', icon: <TeamOutlined />, label: '岗位管理' },
  { key: '/resumes', icon: <FileTextOutlined />, label: '人才库' },
  { key: '/interviews', icon: <CalendarOutlined />, label: '面试管理' },
  { key: '/usage', icon: <BarChartOutlined />, label: '用量统计' },
  { key: '/settings', icon: <SettingOutlined />, label: '系统设置' },
]

export default function MainLayout() {
  const navigate = useNavigate()
  const location = useLocation()

  const selectedKey = menuItems.find(item => location.pathname.startsWith(item.key))?.key || '/dashboard'

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="dark" width={200}>
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 16, fontWeight: 'bold', borderBottom: '1px solid #303030' }}>
          智能HR Agent
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ marginTop: 8 }}
        />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                         display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: 18, fontWeight: 600, color: '#333' }}>智能招聘管理系统</span>
        </Header>
        <Content style={{ margin: 24, background: '#f5f5f5', minHeight: 'calc(100vh - 112px)' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
