import { useEffect, useState } from 'react'
import { Table, Card, Tag, Typography, Button, Spin } from 'antd'
import { EyeOutlined } from '@ant-design/icons'
import { getPrograms } from '../api/api'
import AppLayout from '../components/Layout'
import { useNavigate } from 'react-router-dom'

const { Title, Text } = Typography

export default function History() {
  const [programs, setPrograms] = useState([])
  const [loading,  setLoading]  = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    getPrograms().then(r => { setPrograms(r.data); setLoading(false) })
  }, [])

  const columns = [
    { title: 'ID', dataIndex: 'program_id', width: 60,
      render: t => <Text style={{ color: '#64748b' }}>#{t}</Text> },
    { title: 'Program Name', dataIndex: 'program_name',
      render: t => <Text style={{ color: '#e2e8f0', fontWeight: 500 }}>{t}</Text> },
    { title: 'Min Qual', dataIndex: 'min_qual',
      render: t => <Tag color="blue">{t}</Tag> },
    { title: 'Min Exp', dataIndex: 'min_exp',
      render: t => <Text style={{ color: '#94a3b8' }}>{t} yrs</Text> },
    { title: 'Week', dataIndex: 'training_week',
      render: t => <Tag color="purple">{t}</Tag> },
    { title: 'Batch', dataIndex: 'batch_size',
      render: t => <Text style={{ color: '#94a3b8' }}>{t} seats</Text> },
    { title: 'Created At', dataIndex: 'run_at',
      render: t => <Text style={{ color: '#64748b', fontSize: 12 }}>{t}</Text> },
    { title: 'Action', key: 'action',
      render: (_, r) => (
        <Button type="link" icon={<EyeOutlined />} size="small"
          onClick={() => navigate(`/nominations/${r.program_id}`)}>
          View
        </Button>
      )},
  ]

  return (
    <AppLayout>
      <Title level={4} style={{ color: '#e2e8f0', marginBottom: 4 }}>Shortlist History</Title>
      <Text style={{ color: '#64748b', display: 'block', marginBottom: 24 }}>
        All past nomination shortlists
      </Text>
      <Card style={{ background: '#13151f', border: '1px solid #2a2d3a', borderRadius: 10 }}>
        {loading ? <Spin /> : (
          <Table dataSource={programs} columns={columns}
            rowKey="program_id" size="small"
            pagination={{ pageSize: 10, style: { color: '#94a3b8' } }} />
        )}
      </Card>
    </AppLayout>
  )
}