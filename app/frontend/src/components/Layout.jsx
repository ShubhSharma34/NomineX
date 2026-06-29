import { Layout, Menu, Avatar, Typography, Badge } from 'antd'
import {
  DashboardOutlined, TeamOutlined, HistoryOutlined,
  UserAddOutlined, LogoutOutlined, FileSearchOutlined
} from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'

const { Sider, Header, Content } = Layout
const { Text } = Typography

export default function AppLayout({ children }) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const role      = localStorage.getItem('role')
  const username  = localStorage.getItem('username')

  const handleLogout = () => {
    localStorage.clear()
    navigate('/')
  }

  const allItems = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard',        roles: ['admin','manager','employee'] },
    { key: '/shortlist', icon: <TeamOutlined />,      label: 'Generate Shortlist',roles: ['admin','manager'] },
    { key: '/history',   icon: <HistoryOutlined />,   label: 'History',           roles: ['admin','manager'] },
    { key: '/coldstart', icon: <UserAddOutlined />,   label: 'My Programs',       roles: ['employee'] },
  ]

  const menuItems = allItems
    .filter(i => i.roles.includes(role))
    .map(i => ({ key: i.key, icon: i.icon, label: i.label }))

  menuItems.push({
    key: 'logout', icon: <LogoutOutlined />, label: 'Logout',
    danger: true, onClick: handleLogout
  })

  const roleBadgeColor = {
    admin   : '#3b82f6',
    manager : '#8b5cf6',
    employee: '#10b981',
  }

  return (
    <Layout style={{ minHeight: '100vh', background: '#0f1117' }}>
      <Sider width={220} style={{ background: '#13151f', borderRight: '1px solid #2a2d3a' }}>
        {/* Logo */}
        <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid #2a2d3a' }}>
          <Text style={{ fontSize: 16, fontWeight: 600, color: '#e2e8f0', display: 'block' }}>
            NomineX
          </Text>
          <Text style={{ fontSize: 11, color: '#64748b' }}>
            Nomination Filtering System
          </Text>
        </div>

        {/* Role badge */}
        <div style={{ margin: '12px 16px', background: '#1e2a3a',
          borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%',
            background: roleBadgeColor[role] || '#3b82f6' }} />
          <Text style={{ fontSize: 12, color: roleBadgeColor[role] || '#3b82f6',
            fontWeight: 500, textTransform: 'capitalize' }}>
            {role} View
          </Text>
        </div>

        {/* Nav */}
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          onClick={({ key }) => { if (key !== 'logout') navigate(key) }}
          items={menuItems}
          style={{ background: 'transparent', border: 'none', marginTop: 8 }}
        />
      </Sider>

      <Layout style={{ background: '#0f1117' }}>
        {/* Top bar */}
        <Header style={{ background: '#0f1117', borderBottom: '1px solid #2a2d3a',
          padding: '0 24px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', height: 56 }}>
          <Text style={{ color: '#94a3b8', fontSize: 13 }}>
            Welcome back, <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{username}</span>
          </Text>
          <Avatar style={{ background: '#1e3a5f', color: '#60a5fa', fontSize: 13 }}>
            {username?.charAt(0).toUpperCase()}
          </Avatar>
        </Header>

        <Content style={{ padding: 24, background: '#0f1117' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}