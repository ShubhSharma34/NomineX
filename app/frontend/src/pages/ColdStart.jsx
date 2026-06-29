import { useState } from 'react'
import { Form, Input, InputNumber, Select, Button, Card, Table,
         Typography, Progress, Tag, message } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { coldStart } from '../api/api'
import AppLayout from '../components/Layout'

const { Title, Text } = Typography

const QUAL_OPTIONS = [
  { value: 1, label: 'High School' }, { value: 2, label: 'Diploma' },
  { value: 3, label: "Bachelor's" },  { value: 4, label: "Master's" },
  { value: 5, label: 'MBA' },         { value: 6, label: 'PhD' },
]
const LEVEL_OPTIONS = [
  { value: 1, label: 'Beginner' }, { value: 2, label: 'Intermediate' }, { value: 3, label: 'Advanced' }
]
const WEEK_OPTIONS = [
  { value: 1, label: 'Week 1 (Jun 9-13)' },  { value: 2, label: 'Week 2 (Jun 16-20)' },
  { value: 3, label: 'Week 3 (Jun 23-27)' }, { value: 4, label: 'Week 4 (Jun 30-Jul 4)' },
]

export default function ColdStart() {
  const [form]    = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState(null)

  const columns = [
    { title: '#', key: 'idx', render: (_, __, i) => i+1, width: 45 },
    { title: 'Program', dataIndex: 'program_name',
      render: t => <Text style={{ color: '#e2e8f0', fontWeight: 500 }}>{t}</Text> },
    { title: 'Skill Required', dataIndex: 'skill_required',
      render: t => <Tag color="blue">{t}</Tag> },
    { title: 'Week', dataIndex: 'week',
      render: t => <Text style={{ color: '#94a3b8', fontSize: 12 }}>{t}</Text> },
    { title: 'Min Exp', dataIndex: 'min_exp',
      render: t => <Text style={{ color: '#94a3b8' }}>{t}y</Text>, width: 75 },
    { title: 'Compatibility', dataIndex: 'compatibility',
      render: t => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Progress percent={t} size="small" showInfo={false}
            strokeColor={t>=75?'#10b981':t>=50?'#f59e0b':'#ef4444'}
            trailColor="#1e2130" style={{ width: 80 }} />
          <Text style={{ color: t>=75?'#10b981':t>=50?'#f59e0b':'#ef4444',
            fontWeight: 600 }}>{t}%</Text>
        </div>
      )},
    { title: 'Fit', dataIndex: 'compatibility', key: 'fit',
      render: t => {
        if (!t) return null
        if (t >= 75) return <Tag color="success">Strong Fit</Tag>
        if (t >= 50) return <Tag color="warning">Moderate Fit</Tag>
        if (t >= 30) return <Tag color="orange">Weak Fit</Tag>
        return <Tag color="error">Poor Fit</Tag>
      }},
  ]

  const onFinish = async (vals) => {
    setLoading(true)
    try {
      const res = await coldStart({
        name          : vals.name,
        experience    : vals.experience,
        qual_input    : vals.qual_input,
        skill_1_name  : vals.skill_1_name,
        skill_1_level : vals.skill_1_level,
        skill_2_name  : vals.skill_2_name,
        skill_2_level : vals.skill_2_level,
        skill_3_name  : vals.skill_3_name  || '',
        skill_3_level : vals.skill_3_level || 0,
        free_weeks    : vals.free_weeks || [],
        perf_rating   : vals.perf_rating,
        months_since  : vals.months_since || 24,
      })
      setResult(res.data)
    } catch(e) {
      message.error('Error getting recommendations')
    }
    setLoading(false)
  }

  return (
    <AppLayout>
      <Title level={4} style={{ color: '#e2e8f0', marginBottom: 4 }}>
        Training Program Recommender
      </Title>
      <Text style={{ color: '#64748b', display: 'block', marginBottom: 24 }}>
        Enter your details to find the best training programs for you
      </Text>

      <Card style={{ background: '#13151f', border: '1px solid #2a2d3a',
        borderRadius: 10, marginBottom: 24 }}>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
            <Form.Item label={<Text style={{color:'#94a3b8'}}>Your Name</Text>}
              name="name" rules={[{required:true}]}>
              <Input placeholder="Enter your name"
                style={{ background: '#0f1117', borderColor: '#2a2d3a' }} />
            </Form.Item>
            <Form.Item label={<Text style={{color:'#94a3b8'}}>Qualification</Text>}
              name="qual_input" rules={[{required:true}]}>
              <Select options={QUAL_OPTIONS} placeholder="Select qualification" />
            </Form.Item>
            <Form.Item label={<Text style={{color:'#94a3b8'}}>Experience (years)</Text>}
              name="experience" rules={[{required:true}]}>
              <InputNumber min={0} max={40} style={{ width:'100%',
                background:'#0f1117', borderColor:'#2a2d3a' }} />
            </Form.Item>
            <Form.Item label={<Text style={{color:'#94a3b8'}}>Performance Rating (1-5)</Text>}
              name="perf_rating" rules={[{required:true}]}>
              <InputNumber min={1} max={5} step={0.1} style={{ width:'100%',
                background:'#0f1117', borderColor:'#2a2d3a' }} />
            </Form.Item>
            <Form.Item label={<Text style={{color:'#94a3b8'}}>Skill 1</Text>}
              name="skill_1_name" rules={[{required:true}]}>
              <Input placeholder="e.g. Python"
                style={{ background:'#0f1117', borderColor:'#2a2d3a' }} />
            </Form.Item>
            <Form.Item label={<Text style={{color:'#94a3b8'}}>Skill 1 Level</Text>}
              name="skill_1_level" rules={[{required:true}]}>
              <Select options={LEVEL_OPTIONS} placeholder="Select level" />
            </Form.Item>
            <Form.Item label={<Text style={{color:'#94a3b8'}}>Skill 2</Text>}
              name="skill_2_name" rules={[{required:true}]}>
              <Input placeholder="e.g. SQL"
                style={{ background:'#0f1117', borderColor:'#2a2d3a' }} />
            </Form.Item>
            <Form.Item label={<Text style={{color:'#94a3b8'}}>Skill 2 Level</Text>}
              name="skill_2_level" rules={[{required:true}]}>
              <Select options={LEVEL_OPTIONS} placeholder="Select level" />
            </Form.Item>
            <Form.Item label={<Text style={{color:'#94a3b8'}}>Skill 3 (optional)</Text>}
              name="skill_3_name">
              <Input placeholder="e.g. Excel"
                style={{ background:'#0f1117', borderColor:'#2a2d3a' }} />
            </Form.Item>
            <Form.Item label={<Text style={{color:'#94a3b8'}}>Skill 3 Level</Text>}
              name="skill_3_level">
              <Select options={LEVEL_OPTIONS} placeholder="Select level" allowClear />
            </Form.Item>
            <Form.Item label={<Text style={{color:'#94a3b8'}}>Months Since Last Training</Text>}
              name="months_since" initialValue={12}>
              <InputNumber min={0} max={120} style={{ width:'100%',
                background:'#0f1117', borderColor:'#2a2d3a' }} />
            </Form.Item>
          </div>
          <Form.Item label={<Text style={{color:'#94a3b8'}}>Available Weeks</Text>}
            name="free_weeks" rules={[{required:true}]}>
            <Select mode="multiple" options={WEEK_OPTIONS}
              placeholder="Select weeks you are free" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}
            icon={<SearchOutlined />} size="large">
            Find My Programs
          </Button>
        </Form>
      </Card>

      {result && (
        <>
          <div style={{ display:'flex', gap:12, marginBottom:16 }}>
            <Card size="small" style={{ background:'#13151f',
              border:'1px solid #2a2d3a', borderRadius:8, flex:1 }}>
              <Text style={{ color:'#64748b', fontSize:12 }}>Candidate</Text>
              <Text style={{ color:'#e2e8f0', fontWeight:600, display:'block',
                fontSize:16 }}>{result.employee_name}</Text>
            </Card>
            <Card size="small" style={{ background:'#13151f',
              border:'1px solid #2a2d3a', borderRadius:8, flex:1 }}>
              <Text style={{ color:'#64748b', fontSize:12 }}>AI Candidate Score</Text>
              <Text style={{ color:'#3b82f6', fontWeight:600, display:'block',
                fontSize:22 }}>{result.ai_score} / 100</Text>
            </Card>
          </div>
          <Card title={<Text style={{ color:'#94a3b8' }}>Recommended Programs</Text>}
            style={{ background:'#13151f', border:'1px solid #2a2d3a', borderRadius:10 }}>
            <Table dataSource={result.programs} columns={columns}
              rowKey="program_id" size="small"
              pagination={{ pageSize: 8 }} />
          </Card>
        </>
      )}
    </AppLayout>
  )
}