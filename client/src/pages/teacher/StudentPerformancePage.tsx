import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Spin,
  Typography,
  message,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { analyticsApi } from '../../api/analyticsApi';
import type {
  StudentPerformanceDto,
  StudentAttemptDto,
} from '../../types/analytics';
import dayjs from 'dayjs';

const { Title } = Typography;

export default function StudentPerformancePage() {
  const { studentId } = useParams<{ studentId: string }>();
  const [data, setData] = useState<StudentPerformanceDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    analyticsApi
      .getStudentPerformance(studentId)
      .then((res) => setData(res.data))
      .catch(() => message.error('Failed to load student performance'))
      .finally(() => setLoading(false));
  }, [studentId]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!data) return null;

  const columns: ColumnsType<StudentAttemptDto> = [
    {
      title: 'Quiz Title',
      dataIndex: 'quizTitle',
      key: 'quizTitle',
    },
    {
      title: 'Score',
      dataIndex: 'score',
      key: 'score',
      render: (score?: number) =>
        score != null ? `${score.toFixed(1)}%` : '-',
    },
    {
      title: 'Passed',
      dataIndex: 'passed',
      key: 'passed',
      align: 'center',
      render: (passed: boolean) =>
        passed ? (
          <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18 }} />
        ) : (
          <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 18 }} />
        ),
    },
    {
      title: 'Completed At',
      dataIndex: 'completedAt',
      key: 'completedAt',
      render: (val: string) => dayjs(val).format('YYYY-MM-DD HH:mm'),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={3} style={{ marginBottom: 24 }}>
        {data.studentName} - Performance
      </Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="Total Attempts" value={data.totalAttempts} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Average Score"
              value={data.averageScore}
              precision={1}
              suffix="%"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="Quizzes Passed" value={data.quizzesPassed} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="Quizzes Failed" value={data.quizzesFailed} />
          </Card>
        </Col>
      </Row>

      <Card title="Attempt History">
        <Table
          columns={columns}
          dataSource={data.attempts}
          rowKey={(_, index) => String(index)}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
}
