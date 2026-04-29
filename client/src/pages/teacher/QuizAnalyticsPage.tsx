import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Statistic,
  Spin,
  Table,
  Tag,
  Button,
  Progress,
  message,
  Typography,
  Space,
} from 'antd';
import { EyeOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { analyticsApi } from '../../api/analyticsApi';
import type { QuizAnalyticsDto, AttemptSummaryDto } from '../../types/analytics';

const { Title } = Typography;

export default function QuizAnalyticsPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState<QuizAnalyticsDto | null>(null);
  const [loading, setLoading] = useState(true);

  // Determine role-based base path for navigation
  const basePath = location.pathname.startsWith('/admin') ? '/admin' : '/teacher';

  useEffect(() => {
    if (!quizId) return;
    setLoading(true);
    analyticsApi
      .getQuizAnalytics(quizId)
      .then((res) => setData(res.data))
      .catch(() => message.error('Failed to load quiz analytics'))
      .finally(() => setLoading(false));
  }, [quizId]);

  const statusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'green';
      case 'TimedOut':
        return 'orange';
      case 'InProgress':
        return 'blue';
      default:
        return 'default';
    }
  };

  const columns: ColumnsType<AttemptSummaryDto> = [
    {
      title: 'Student',
      key: 'student',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.studentName}</div>
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>{record.studentEmail}</div>
        </div>
      ),
    },
    {
      title: 'Score',
      key: 'score',
      width: 200,
      render: (_, record) =>
        record.score != null ? (
          <Progress
            percent={Math.round(record.score)}
            size="small"
            status={record.passed ? 'success' : 'exception'}
            format={(p) => `${p}%`}
          />
        ) : (
          <span style={{ color: 'rgba(0,0,0,0.45)' }}>—</span>
        ),
    },
    {
      title: 'Correct',
      key: 'correct',
      width: 100,
      render: (_, record) => `${record.correctAnswers}/${record.totalQuestions}`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status: string) => <Tag color={statusColor(status)}>{status}</Tag>,
    },
    {
      title: 'Result',
      key: 'result',
      width: 100,
      render: (_, record) =>
        record.score != null ? (
          <Tag color={record.passed ? 'success' : 'error'}>
            {record.passed ? 'Passed' : 'Failed'}
          </Tag>
        ) : (
          <span style={{ color: 'rgba(0,0,0,0.45)' }}>—</span>
        ),
    },
    {
      title: 'Started',
      dataIndex: 'startedAt',
      key: 'startedAt',
      width: 150,
      render: (val: string) => dayjs(val).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: 'Completed',
      dataIndex: 'completedAt',
      key: 'completedAt',
      width: 150,
      render: (val?: string) => (val ? dayjs(val).format('YYYY-MM-DD HH:mm') : '—'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 110,
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => navigate(`${basePath}/attempts/${record.attemptId}/detailed`)}
        >
          Details
        </Button>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div style={{ padding: 24 }}>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
          Back
        </Button>
      </Space>

      <Title level={3} style={{ marginBottom: 24 }}>
        {data.quizTitle} — Analytics
      </Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8} md={4}>
          <Card>
            <Statistic title="Total Attempts" value={data.totalAttempts} />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={5}>
          <Card>
            <Statistic
              title="Average Score"
              value={data.averageScore}
              precision={1}
              suffix="%"
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={5}>
          <Card>
            <Statistic
              title="Pass Rate"
              value={data.passRate}
              precision={1}
              suffix="%"
              valueStyle={{ color: data.passRate >= 50 ? '#52c41a' : '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={5}>
          <Card>
            <Statistic
              title="Highest Score"
              value={data.highestScore}
              precision={1}
              suffix="%"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={5}>
          <Card>
            <Statistic
              title="Lowest Score"
              value={data.lowestScore}
              precision={1}
              suffix="%"
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title={`All Attempts (${data.attempts.length})`}>
        <Table
          columns={columns}
          dataSource={data.attempts}
          rowKey="attemptId"
          pagination={{ pageSize: 10, showSizeChanger: true }}
          scroll={{ x: 'max-content' }}
        />
      </Card>
    </div>
  );
}
