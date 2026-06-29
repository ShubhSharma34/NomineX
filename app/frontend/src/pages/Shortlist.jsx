import { useState } from 'react'
import { Form, Input, InputNumber, Select, Button, Card, Table, Tag,
         Typography, Divider, Progress, message, Space, Modal } from 'antd'
import { ThunderboltOutlined, SaveOutlined, DownloadOutlined } from '@ant-design/icons'
import axios from 'axios'
import { generateShortlist, saveShortlist } from '../api/api'
import AppLayout from '../components/Layout'

const { Title, Text } = Typography

const QUAL_OPTIONS = [
  { value: 1, label: 'High School' }, { value: 2, label: 'Diploma' },
  { value: 3, label: "Bachelor's" },  { value: 4, label: "Master's" },
  { value: 5, label: 'MBA' },         { value: 6, label: 'PhD' },
]
const WEEK_OPTIONS = [
  { value: 1, label: 'Week 1 (Jun 9-13)' },  { value: 2, label: 'Week 2 (Jun 16-20)' },
  { value: 3, label: 'Week 3 (Jun 23-27)' }, { value: 4, label: 'Week 4 (Jun 30-Jul 4)' },
]

function fitTag(pct) {
  if (pct >= 75) return <Tag color="success">Strong Fit</Tag>
  if (pct >= 50) return <Tag color="warning">Moderate Fit</Tag>
  if (pct >= 30) return <Tag color="orange">Weak Fit</Tag>
  return <Tag color="error">Poor Fit</Tag>
}

function FuzzyBar({ label, value }) {
  const color = value >= 75 ? '#10b981' : value >= 50 ? '#f59e0b' : '#ef4444'
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
        <Text style={{ color: '#94a3b8', fontSize: 11 }}>{label}</Text>
        <Text style={{ color, fontSize: 11, fontWeight: 500 }}>{value?.toFixed(0)}%</Text>
      </div>
      <Progress percent={value} showInfo={false} size="small"
        strokeColor={color} trailColor="#1e2130" />
    </div>
  )
}

export default function Shortlist() {
  const [form]      = Form.useForm()
  const [loading,   setLoading]   = useState(false)
  const [result,    setResult]    = useState(null)
  const [saving,    setSaving]    = useState(false)
  const [exporting, setExporting] = useState(false)
  const [detail,    setDetail]    = useState(null)
  const [saved,     setSaved]     = useState(false)

  const columns = () => [
    { title: '#', dataIndex: 'rank', width: 45,
      render: r => <Text style={{ color: '#64748b' }}>{r}</Text> },
    { title: 'Name', dataIndex: 'employee_name', key: 'name',
      render: (t, r) => (
        <a onClick={() => setDetail(r)} style={{ color: '#60a5fa' }}>{t}</a>
      )},
    { title: 'Department', dataIndex: 'department',
      render: t => <Text style={{ color: '#94a3b8', fontSize: 12 }}>{t}</Text> },
    { title: 'Area of Work', dataIndex: 'area_of_work',
      render: t => <Text style={{ color: '#94a3b8', fontSize: 12 }}>{t}</Text> },
    { title: 'Exp', dataIndex: 'experience',
      render: t => <Text style={{ color: '#94a3b8' }}>{t}y</Text>, width: 55 },
    { title: 'AI Score', dataIndex: 'ai_score',
      render: t => <Text style={{ color: '#3b82f6', fontWeight: 600 }}>{t}</Text>, width: 85 },
    { title: 'Match%', dataIndex: 'fuzzy_match',
      render: t => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Progress type="circle" percent={t} size={32}
            strokeColor={t>=75?'#10b981':t>=50?'#f59e0b':'#ef4444'}
            trailColor="#1e2130"
            format={p => <span style={{ color: '#e2e8f0', fontSize: 9 }}>{p}%</span>} />
        </div>
      ), width: 70 },
    { title: 'Fit', dataIndex: 'fuzzy_match', key: 'fit', render: fitTag, width: 110 },
  ]

  const onFinish = async (vals) => {
    setLoading(true)
    setResult(null)
    setSaved(false)
    try {
      const res = await generateShortlist({
        program_name : vals.program_name,
        min_qual     : vals.min_qual,
        min_exp      : vals.min_exp,
        week_choice  : vals.week_choice,
        batch_size   : vals.batch_size,
        waitlist_n   : vals.waitlist_n || 5,
        target_areas : vals.target_areas || [],
      })
      setResult(res.data)
    } catch(e) {
      message.error(e.response?.data?.detail || 'Error generating shortlist')
    }
    setLoading(false)
  }

  const onSave = async () => {
    setSaving(true)
    try {
      const vals = form.getFieldsValue()
      await axios.post('http://127.0.0.1:8000/save', {
        program_name : result.program_name,
        min_qual     : vals.min_qual,
        min_exp      : vals.min_exp,
        week_choice  : vals.week_choice,
        batch_size   : vals.batch_size,
        waitlist_n   : vals.waitlist_n || 5,
        selected     : result.selected,
        waitlist     : result.waitlist,
      })
      message.success('Shortlist saved successfully!')
      setSaved(true)
    } catch(e) {
      message.error('Error saving — ' + (e.response?.data?.detail || e.message))
    }
    setSaving(false)
  }

  const onExport = async () => {
    setExporting(true)
    try {
      const response = await axios.post(
        'http://127.0.0.1:8000/export',
        { program_name: result.program_name,
          selected    : result.selected,
          waitlist    : result.waitlist },
        { responseType: 'blob' }
      )
      const url  = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href  = url
      link.setAttribute('download', `Shortlist_${result.program_name}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      message.success('Excel downloaded successfully!')
    } catch(e) {
      message.error('Export failed — make sure backend has /export endpoint')
    }
    setExporting(false)
  }

  return (
    <AppLayout>
      <Title level={4} style={{ color: '#e2e8f0', marginBottom: 4 }}>Generate Shortlist</Title>
      <Text style={{ color: '#64748b', display: 'block', marginBottom: 24 }}>
        Enter training program details to get AI-ranked nominations
      </Text>

      {/* Form */}
      <Card style={{ background: '#13151f', border: '1px solid #2a2d3a',
        borderRadius: 10, marginBottom: 24 }}>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
            <Form.Item label={<Text style={{color:'#94a3b8'}}>Program Name</Text>}
              name="program_name" rules={[{required:true}]}>
              <Input placeholder="e.g. Advanced Python Training"
                style={{ background: '#0f1117', borderColor: '#2a2d3a' }} />
            </Form.Item>
            <Form.Item label={<Text style={{color:'#94a3b8'}}>Training Week</Text>}
              name="week_choice" rules={[{required:true}]}>
              <Select options={WEEK_OPTIONS} placeholder="Select week" />
            </Form.Item>
            <Form.Item label={<Text style={{color:'#94a3b8'}}>Min Qualification</Text>}
              name="min_qual" rules={[{required:true}]}>
              <Select options={QUAL_OPTIONS} placeholder="Select qualification" />
            </Form.Item>
            <Form.Item label={<Text style={{color:'#94a3b8'}}>Min Experience (years)</Text>}
              name="min_exp" rules={[{required:true}]}>
              <InputNumber min={0} max={20} style={{ width: '100%',
                background: '#0f1117', borderColor: '#2a2d3a' }} />
            </Form.Item>
            <Form.Item label={<Text style={{color:'#94a3b8'}}>Batch Size</Text>}
              name="batch_size" rules={[{required:true}]}>
              <InputNumber min={1} max={50} style={{ width: '100%',
                background: '#0f1117', borderColor: '#2a2d3a' }} />
            </Form.Item>
            <Form.Item label={<Text style={{color:'#94a3b8'}}>Waitlist Size</Text>}
              name="waitlist_n" initialValue={5}>
              <InputNumber min={1} max={10} style={{ width: '100%',
                background: '#0f1117', borderColor: '#2a2d3a' }} />
            </Form.Item>
          </div>
          <Form.Item label={
            <Text style={{color:'#94a3b8'}}>Target Areas of Work
              <span style={{color:'#475569', fontSize:11, marginLeft:8}}>(optional)</span>
            </Text>} name="target_areas">
            <Select mode="tags" placeholder="e.g. Software Development, DevOps" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}
            icon={<ThunderboltOutlined />} size="large">
            Generate Shortlist
          </Button>
        </Form>
      </Card>

      {/* Results */}
      {result && (
        <>
          {/* Summary bar */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            {[
              { label: 'Eligible Pool', value: result.total_eligible, color: '#3b82f6' },
              { label: 'Selected',      value: result.selected.length, color: '#10b981' },
              { label: 'Waitlist',      value: result.waitlist.length, color: '#f59e0b' },
              { label: 'Rejected',      value: result.rejected_count,  color: '#ef4444' },
            ].map(s => (
              <Card key={s.label} size="small" style={{ background: '#13151f',
                border: '1px solid #2a2d3a', borderRadius: 8, flex: 1 }}>
                <Text style={{ color: '#64748b', fontSize: 12, display: 'block' }}>{s.label}</Text>
                <Text style={{ color: s.color, fontSize: 20, fontWeight: 600 }}>{s.value}</Text>
              </Card>
            ))}
          </div>

          {/* Selected table */}
          <Card title={<Text style={{ color: '#10b981' }}>✅ Selected Candidates</Text>}
            style={{ background: '#13151f', border: '1px solid #2a2d3a',
              borderRadius: 10, marginBottom: 16 }}>
            <Table dataSource={result.selected} columns={columns()}
              rowKey="employee_id" size="small" pagination={false} />
          </Card>

          {/* Waitlist table */}
          <Card title={<Text style={{ color: '#f59e0b' }}>⏳ Waitlist</Text>}
            style={{ background: '#13151f', border: '1px solid #2a2d3a',
              borderRadius: 10, marginBottom: 16 }}>
            <Table dataSource={result.waitlist} columns={columns()}
              rowKey="employee_id" size="small" pagination={false} />
          </Card>

          {/* Action buttons */}
          <Space size="middle">
            <Button type="primary" icon={<SaveOutlined />} onClick={onSave}
              loading={saving} size="large" disabled={saved}>
              {saved ? 'Saved ✓' : 'Save Shortlist'}
            </Button>
            <Button icon={<DownloadOutlined />} onClick={onExport}
              loading={exporting} size="large"
              style={{ borderColor: '#2a2d3a', color: '#e2e8f0' }}>
              Export to Excel
            </Button>
          </Space>
        </>
      )}

      {/* Fuzzy detail modal */}
      <Modal open={!!detail} onCancel={() => setDetail(null)} footer={null}
        title={<Text style={{ color: '#e2e8f0' }}>{detail?.employee_name} — Match Breakdown</Text>}
        styles={{ content: { background: '#13151f', border: '1px solid #2a2d3a' },
                  header: { background: '#13151f', borderBottom: '1px solid #2a2d3a' } }}>
        {detail && (
          <div style={{ padding: '8px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between',
              marginBottom: 20, padding: '12px', background: '#0f1117', borderRadius: 8 }}>
              <div>
                <Text style={{ color: '#64748b', fontSize: 12 }}>AI Score</Text>
                <Text style={{ color: '#3b82f6', fontSize: 22, fontWeight: 600,
                  display: 'block' }}>{detail.ai_score}</Text>
              </div>
              <div style={{ textAlign: 'right' }}>
                <Text style={{ color: '#64748b', fontSize: 12 }}>Overall Match</Text>
                <Text style={{ color: '#10b981', fontSize: 22, fontWeight: 600,
                  display: 'block' }}>{detail.fuzzy_match}%</Text>
              </div>
            </div>
            <FuzzyBar label="Qualification Match" value={detail.fz_qual}  />
            <FuzzyBar label="Experience Match"    value={detail.fz_exp}   />
            <FuzzyBar label="Availability Match"  value={detail.fz_avail} />
            <FuzzyBar label="Skill Match"         value={detail.fz_skill} />
            <FuzzyBar label="Training History"    value={detail.fz_train} />
            <FuzzyBar label="Area of Work Match"  value={detail.fz_area}  />
            <Divider style={{ borderColor: '#2a2d3a', margin: '12px 0' }} />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Tag>{detail.department}</Tag>
              <Tag>{detail.area_of_work}</Tag>
              <Tag>{detail.qualification}</Tag>
              <Tag>{detail.experience} years exp</Tag>
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  )
}