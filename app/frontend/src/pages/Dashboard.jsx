import { useEffect, useState } from 'react'
import { Row, Col, Card, Statistic, Table, Tag, Typography, Spin } from 'antd'
import { TeamOutlined, TrophyOutlined, ClockCircleOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { getStats, getPrograms } from '../api/api'
import AppLayout from '../components/Layout'
import { useNavigate } from 'react-router-dom'

const { Title, Text } = Typography

export default function Dashboard() {
  const [stats,    setStats]    = useState(null)
  const [programs, setPrograms] = useState([])
  const [loading,  setLoading]  = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([getStats(), getPrograms()]).then(([s, p]) => {
      setStats(s.data)
      setPrograms(p.data.slice(0, 6))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const columns = [
    { title: 'Program Name', dataIndex: 'program_name', key: 'program_name',
      render: t => <Text style={{ color: '#e2e8f0' }}>{t}</Text> },
    { title: 'Week', dataIndex: 'training_week', key: 'training_week',
      render: t => <Tag color="blue">{t}</Tag> },
    { title: 'Batch', dataIndex: 'batch_size', key: 'batch_size',
      render: t => <Text style={{ color: '#94a3b8' }}>{t} seats</Text> },
    { title: 'Created', dataIndex: 'run_at', key: 'run_at',
      render: t => <Text style={{ color: '#64748b', fontSize: 12 }}>{t}</Text> },
    { title: '', key: 'action',
      render: (_, r) => (
        <a onClick={() => navigate(`/nominations/${r.program_id}`)}
          style={{ color: '#3b82f6', fontSize: 12 }}>View →</a>
      )
    },
  ]

  const statCards = stats ? [
    { title: 'Total Employees', value: stats.total_employees, icon: <TeamOutlined />,        color: '#3b82f6' },
    { title: 'Programs Run',    value: stats.total_programs,  icon: <TrophyOutlined />,       color: '#8b5cf6' },
    { title: 'Pending Approval',value: stats.pending_approval,icon: <ClockCircleOutlined />,  color: '#f59e0b' },
    { title: 'Approved',        value: stats.approved,        icon: <CheckCircleOutlined />,  color: '#10b981' },
  ] : []

  return (
    <AppLayout>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ color: '#e2e8f0', margin: 0 }}>Dashboard</Title>
        <Text style={{ color: '#64748b' }}>Overview of your nomination system</Text>
      </div>

      {loading ? <Spin size="large" /> : (
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            {statCards.map(s => (
              <Col span={6} key={s.title}>
                <Card style={{ background: '#13151f', border: '1px solid #2a2d3a', borderRadius: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Statistic
                      title={<Text style={{ color: '#64748b', fontSize: 12 }}>{s.title}</Text>}
                      value={s.value}
                      valueStyle={{ color: '#e2e8f0', fontSize: 24, fontWeight: 600 }}
                    />
                    <div style={{ fontSize: 24, color: s.color, opacity: 0.8 }}>{s.icon}</div>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>

          <Card title={<Text style={{ color: '#94a3b8' }}>Recent Programs</Text>}
            style={{ background: '#13151f', border: '1px solid #2a2d3a', borderRadius: 10 }}>
            <Table
              dataSource={programs}
              columns={columns}
              rowKey="program_id"
              pagination={false}
              size="small"
              style={{ background: 'transparent' }}
            />
          </Card>
        </>
      )}
    </AppLayout>
  )
}