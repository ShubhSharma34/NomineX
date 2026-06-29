import { useEffect, useState } from 'react'
import { Table, Card, Tag, Typography, Button, Space, message, Spin } from 'antd'
import { CheckOutlined, CloseOutlined } from '@ant-design/icons'
import { getNominations, approveNomination } from '../api/api'
import AppLayout from '../components/Layout'
import { useParams } from 'react-router-dom'

const { Title, Text } = Typography

export default function Nominations() {
  const { id }  = useParams()
  const [nominations, setNominations] = useState([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    getNominations(id).then(r => { setNominations(r.data); setLoading(false) })
  }
  useEffect(() => { load() }, [id])

  const approve = async (nomination_id, decision) => {
    try {
      await approveNomination({ nomination_id, decision })
      message.success(`${decision} successfully`)
      load()
    } catch { message.error('Error updating approval') }
  }

  const approvalTag = (a) => {
    const map = {
      Approved : <Tag color="success">Approved</Tag>,
      Rejected : <Tag color="error">Rejected</Tag>,
      Promoted : <Tag color="purple">Promoted</Tag>,
      Pending  : <Tag color="default">Pending</Tag>,
    }
    return map[a] || <Tag>{a}</Tag>
  }

  const columns = [
    { title: '#', dataIndex: 'rank', width: 45 },
    { title: 'Name', dataIndex: 'employee_name',
      render: t => <Text style={{ color: '#e2e8f0', fontWeight: 500 }}>{t}</Text> },
    { title: 'Department', dataIndex: 'department',
      render: t => <Text style={{ color: '#94a3b8', fontSize: 12 }}>{t}</Text> },
    { title: 'Area', dataIndex: 'area_of_work',
      render: t => <Text style={{ color: '#94a3b8', fontSize: 12 }}>{t}</Text> },
    { title: 'Exp', dataIndex: 'experience',
      render: t => <Text style={{ color: '#94a3b8' }}>{t}y</Text>, width: 55 },
    { title: 'AI Score', dataIndex: 'ai_score',
      render: t => <Text style={{ color: '#3b82f6', fontWeight: 600 }}>{t}</Text> },
    { title: 'Match%', dataIndex: 'fuzzy_match',
      render: t => <Text style={{ color: '#10b981' }}>{t}%</Text> },
    { title: 'Status', dataIndex: 'status',
      render: t => <Tag color={t==='Selected'?'blue':'orange'}>{t}</Tag> },
    { title: 'Approval', dataIndex: 'approval', render: approvalTag },
    { title: 'Actions', key: 'actions',
      render: (_, r) => r.approval === 'Pending' && r.status === 'Selected' ? (
        <Space>
          <Button size="small" type="primary" icon={<CheckOutlined />}
            onClick={() => approve(r.nomination_id, 'Approved')}>
            Approve
          </Button>
          <Button size="small" danger icon={<CloseOutlined />}
            onClick={() => approve(r.nomination_id, 'Rejected')}>
            Reject
          </Button>
        </Space>
      ) : null
    },
  ]

  const selected = nominations.filter(n => n.status === 'Selected')
  const waitlist = nominations.filter(n => n.status === 'Waitlist')

  return (
    <AppLayout>
      <Title level={4} style={{ color: '#e2e8f0', marginBottom: 4 }}>
        Nominations — Program #{id}
      </Title>
      <Text style={{ color: '#64748b', display: 'block', marginBottom: 24 }}>
        Review and approve nominations
      </Text>

      {loading ? <Spin /> : (
        <>
          <Card title={<Text style={{ color: '#10b981' }}>✅ Selected ({selected.length})</Text>}
            style={{ background: '#13151f', border: '1px solid #2a2d3a',
              borderRadius: 10, marginBottom: 16 }}>
            <Table dataSource={selected} columns={columns}
              rowKey="nomination_id" size="small" pagination={false} />
          </Card>
          <Card title={<Text style={{ color: '#f59e0b' }}>⏳ Waitlist ({waitlist.length})</Text>}
            style={{ background: '#13151f', border: '1px solid #2a2d3a', borderRadius: 10 }}>
            <Table dataSource={waitlist} columns={columns}
              rowKey="nomination_id" size="small" pagination={false} />
          </Card>
        </>
      )}
    </AppLayout>
  )
}