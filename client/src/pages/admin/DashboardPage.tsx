import { useEffect, useState } from 'react';
import {
  Typography,
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Spin,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  BookOutlined,
  FileTextOutlined,
  BarChartOutlined,
  TrophyOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { analyticsApi } from '../../api/analyticsApi';
import type {
  TeacherDashboardDto,
  RecentAttemptDto,
} from '../../types/analytics';

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<TeacherDashboardDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const { data } = await analyticsApi.getDashboard();
        setDashboard(data);
      } catch {
        message.error('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 120 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div style={{ padding: 24 }}>
        <Typography.Text type="danger">
          Failed to load dashboard.
        </Typography.Text>
      </div>
    );
  }

  const stats = [
    {
      title: 'Total Quizzes',
      value: dashboard.totalQuizzes,
      icon: <BookOutlined style={{ color: '#1677ff' }} />,
    },
    {
      title: 'Total Questions',
      value: dashboard.totalQuestions,
      icon: <FileTextOutlined style={{ color: '#722ed1' }} />,
    },
    {
      title: 'Total Attempts',
      value: dashboard.totalAttempts,
      icon: <BarChartOutlined style={{ color: '#13c2c2' }} />,
    },
    {
      title: 'Average Score',
      value: dashboard.averageScore,
      suffix: '%',
      icon: <TrophyOutlined style={{ color: '#faad14' }} />,
    },
    {
      title: 'Pass Rate',
      value: dashboard.passRate,
      suffix: '%',
      icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
    },
  ];

  const recentColumns: ColumnsType<RecentAttemptDto> = [
    {
      title: 'Student Name',
      dataIndex: 'studentName',
      key: 'studentName',
    },
    {
      title: 'Quiz Title',
      dataIndex: 'quizTitle',
      key: 'quizTitle',
      ellipsis: true,
    },
    {
      title: 'Score',
      dataIndex: 'score',
      key: 'score',
      width: 100,
      render: (score?: number) =>
        score != null ? `${Math.round(score)}%` : '--',
    },
    {
      title: 'Completed At',
      dataIndex: 'completedAt',
      key: 'completedAt',
      width: 180,
      render: (val: string) => new Date(val).toLocaleString(),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={3}>Admin Dashboard</Typography.Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
        {stats.map((s) => (
          <Col xs={24} sm={12} md={8} lg={4} xl={4} key={s.title}>
            <Card>
              <Statistic
                title={s.title}
                value={s.value}
                suffix={s.suffix}
                prefix={s.icon}
                precision={s.suffix ? 1 : 0}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Typography.Title level={4}>Recent Attempts</Typography.Title>
      <Table<RecentAttemptDto>
        columns={recentColumns}
        dataSource={dashboard.recentAttempts}
        rowKey={(_, index) => String(index)}
        pagination={false}
        scroll={{ x: 600 }}
      />
    </div>
  );
}
