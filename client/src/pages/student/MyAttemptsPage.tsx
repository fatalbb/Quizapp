import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography,
  Table,
  Tag,
  Progress,
  Button,
  message,
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { EyeOutlined } from '@ant-design/icons';
import { quizAttemptsApi } from '../../api/quizAttemptsApi';
import type { MyAttemptDto } from '../../types/quizAttempt';
import { QuizAttemptStatus } from '../../types/enums';

const PAGE_SIZE = 10;

export default function MyAttemptsPage() {
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState<MyAttemptDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageNumber, setPageNumber] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchAttempts = async (page: number) => {
    setLoading(true);
    try {
      const { data } = await quizAttemptsApi.getMyAttempts({
        pageNumber: page,
        pageSize: PAGE_SIZE,
      });
      setAttempts(data.items);
      setTotalCount(data.totalCount);
    } catch {
      message.error('Failed to load attempts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttempts(pageNumber);
  }, [pageNumber]);

  const statusColor = (status: QuizAttemptStatus) => {
    switch (status) {
      case QuizAttemptStatus.Completed:
        return 'green';
      case QuizAttemptStatus.TimedOut:
        return 'orange';
      case QuizAttemptStatus.InProgress:
        return 'blue';
      default:
        return 'default';
    }
  };

  const columns: ColumnsType<MyAttemptDto> = [
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
      width: 160,
      render: (score?: number) =>
        score != null ? (
          <Progress percent={Math.round(score)} size="small" />
        ) : (
          <Typography.Text type="secondary">--</Typography.Text>
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
      width: 120,
      render: (status: QuizAttemptStatus) => (
        <Tag color={statusColor(status)}>{status}</Tag>
      ),
    },
    {
      title: 'Started At',
      dataIndex: 'startedAt',
      key: 'startedAt',
      width: 170,
      render: (val: string) => new Date(val).toLocaleString(),
    },
    {
      title: 'Completed At',
      dataIndex: 'completedAt',
      key: 'completedAt',
      width: 170,
      render: (val?: string) =>
        val ? new Date(val).toLocaleString() : '--',
    },
    {
      title: 'Action',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/student/attempts/${record.attemptId}/result`)}
          disabled={record.status === QuizAttemptStatus.InProgress}
        >
          View Result
        </Button>
      ),
    },
  ];

  const handleTableChange = (pagination: TablePaginationConfig) => {
    setPageNumber(pagination.current || 1);
  };

  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={3}>My Attempts</Typography.Title>

      <Table<MyAttemptDto>
        columns={columns}
        dataSource={attempts}
        rowKey="attemptId"
        loading={loading}
        pagination={{
          current: pageNumber,
          total: totalCount,
          pageSize: PAGE_SIZE,
          showSizeChanger: false,
        }}
        onChange={handleTableChange}
        scroll={{ x: 900 }}
      />
    </div>
  );
}
