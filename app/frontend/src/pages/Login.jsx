import { useState } from 'react'
import { Form, Input, Button, Typography, Select, Card, message } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'

const { Title, Text } = Typography

const USERS = [
  { username: 'rajesh.kumar',  password: 'Manager@123', role: 'manager',  name: 'Rajesh Kumar'  },
  { username: 'priya.sharma',  password: 'Manager@456', role: 'manager',  name: 'Priya Sharma'  },
  { username: 'amit.verma',    password: 'Admin@789',   role: 'admin',    name: 'Amit Verma'    },
  { username: 'sneha.employee',password: 'Emp@123',     role: 'employee', name: 'Sneha Gupta'   },
]

export default function Login() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const onFinish = ({ username, password }) => {
    setLoading(true)
    setTimeout(() => {
      const user = USERS.find(u => u.username === username && u.password === password)
      if (user) {
        localStorage.setItem('role',     user.role)
        localStorage.setItem('username', user.name)
        navigate('/dashboard')
      } else {
        message.error('Invalid username or password')
        setLoading(false)
      }
    }, 600)
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0f1117',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{ width: 400 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, background: '#1e3a5f',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', fontSize: 24
          }}>🎯</div>
          <Title level={3} style={{ color: '#e2e8f0', margin: 0 }}>NomineX</Title>
          <Text style={{ color: '#64748b', fontSize: 13 }}>Nomination Filtering System</Text>
        </div>

        {/* Login card */}
        <Card style={{
          background: '#13151f', border: '1px solid #2a2d3a', borderRadius: 12
        }}>
          <Title level={5} style={{ color: '#94a3b8', marginTop: 0, marginBottom: 24 }}>
            Sign in to continue
          </Title>
          <Form layout="vertical" onFinish={onFinish}>
            <Form.Item name="username" rules={[{ required: true, message: 'Enter username' }]}>
              <Input
                prefix={<UserOutlined style={{ color: '#64748b' }} />}
                placeholder="Username"
                size="large"
                style={{ background: '#0f1117', borderColor: '#2a2d3a' }}
              />
            </Form.Item>
            <Form.Item name="password" rules={[{ required: true, message: 'Enter password' }]}>
              <Input.Password
                prefix={<LockOutlined style={{ color: '#64748b' }} />}
                placeholder="Password"
                size="large"
                style={{ background: '#0f1117', borderColor: '#2a2d3a' }}
              />
            </Form.Item>
            <Button type="primary" htmlType="submit" size="large"
              loading={loading} block style={{ marginTop: 8 }}>
              Sign In
            </Button>
          </Form>

          {/* Demo credentials */}
          <div style={{ marginTop: 20, padding: '12px', background: '#0f1117',
            borderRadius: 8, border: '1px solid #2a2d3a' }}>
            <Text style={{ color: '#64748b', fontSize: 11, display: 'block', marginBottom: 6 }}>
              DEMO CREDENTIALS
            </Text>
            {[
              { role: 'Manager', u: 'rajesh.kumar',   p: 'Manager@123' },
              { role: 'Admin',   u: 'amit.verma',     p: 'Admin@789'   },
              { role: 'Employee',u: 'sneha.employee', p: 'Emp@123'     },
            ].map(c => (
              <div key={c.role} style={{ display: 'flex', justifyContent: 'space-between',
                padding: '3px 0', borderBottom: '1px solid #1e2130' }}>
                <Text style={{ color: '#3b82f6', fontSize: 11, fontWeight: 500 }}>{c.role}</Text>
                <Text style={{ color: '#94a3b8', fontSize: 11 }}>{c.u} / {c.p}</Text>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}