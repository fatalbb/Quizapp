import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Table,
  Button,
  Badge,
  Space,
  Popconfirm,
  message,
} from 'antd';
import { PlusOutlined, EditOutlined, BarChartOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { quizzesApi } from '../../api/quizzesApi';
import type { QuizListDto } from '../../types/quiz';
import { QuizStatus } from '../../types/enums';
import dayjs from 'dayjs';

const statusBadgeMap: Record<string, 'default' | 'success' | 'warning'> = {
  Draft: 'default',
  Published: 'success',
  Archived: 'warning',
};

export default function QuizzesListPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<QuizListDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchQuizzes = useCallback(() => {
    setLoading(true);
    quizzesApi
      .getQuizzes({ pageNumber: page, pageSize })
      .then((res) => {
        setData(res.data.items);
        setTotal(res.data.totalCount);
      })
      .catch(() => message.error('Failed to load quizzes'))
      .finally(() => setLoading(false));
  }, [page, pageSize]);

  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  const handlePublish = async (id: string) => {
    try {
      await quizzesApi.publishQuiz(id);
      message.success('Quiz published');
      fetchQuizzes();
    } catch {
      message.error('Failed to publish quiz');
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await quizzesApi.archiveQuiz(id);
      message.success('Quiz archived');
      fetchQuizzes();
    } catch {
      message.error('Failed to archive quiz');
    }
  };

  const columns: ColumnsType<QuizListDto> = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: 'Time Limit',
      dataIndex: 'timeLimitMinutes',
      key: 'timeLimitMinutes',
      width: 110,
      render: (val: number) => `${val} min`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => (
        <Badge status={statusBadgeMap[status] || 'default'} text={status} />
      ),
    },
    {
      title: 'Passing Score',
      dataIndex: 'passingScorePercentage',
      key: 'passingScorePercentage',
      width: 120,
      render: (val: number) => `${val}%`,
    },
    {
      title: 'Questions',
      dataIndex: 'totalQuestions',
      key: 'totalQuestions',
      width: 100,
      align: 'center',
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (val: string) => dayjs(val).format('YYYY-MM-DD'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_, record) => {
        const actions: React.ReactNode[] = [];

        if (record.status === QuizStatus.Draft) {
          actions.push(
            <Button
              key="edit"
              type="link"
              icon={<EditOutlined />}
              onClick={() => navigate(`../quizzes/${record.id}/edit`)}
            >
              Edit
            </Button>,
          );
          actions.push(
            <Popconfirm
              key="publish"
              title="Publish this quiz?"
              description="Students will be able to take this quiz."
              onConfirm={() => handlePublish(record.id)}
            >
              <Button type="link">Publish</Button>
            </Popconfirm>,
          );
        }

        if (record.status === QuizStatus.Published) {
          actions.push(
            <Popconfirm
              key="archive"
              title="Archive this quiz?"
              description="Students will no longer be able to take this quiz."
              onConfirm={() => handleArchive(record.id)}
            >
              <Button type="link">Archive</Button>
            </Popconfirm>,
          );
        }

        if (
          record.status === QuizStatus.Published ||
          record.status === QuizStatus.Archived
        ) {
          actions.push(
            <Button
              key="analytics"
              type="link"
              icon={<BarChartOutlined />}
              onClick={() => navigate(`../analytics/quiz/${record.id}`)}
            >
              Analytics
            </Button>,
          );
        }

        return <Space size="small">{actions}</Space>;
      },
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="Quizzes"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('../quizzes/new')}
          >
            Create Quiz
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
        />
      </Card>
    </div>
  );
}
