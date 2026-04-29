import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Table,
  Button,
  Badge,
  Space,
  Popconfirm,
  Tag,
  Tooltip,
  message,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  BarChartOutlined,
  EyeOutlined,
  PlayCircleOutlined,
  WarningOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { quizzesApi } from '../../api/quizzesApi';
import type { QuizListDto } from '../../types/quiz';
import { QuizStatus, QuizMode, ExamStartMode } from '../../types/enums';
import dayjs from 'dayjs';

const statusBadgeMap: Record<string, 'default' | 'success' | 'warning'> = {
  Draft: 'default',
  Published: 'success',
  Archived: 'warning',
};

interface ExamStateInfo {
  color: string;
  text: string;
}

function getExamStateInfo(record: QuizListDto): ExamStateInfo | null {
  if (record.mode !== QuizMode.Exam || record.status !== QuizStatus.Published) {
    return null;
  }

  const now = dayjs();

  if (record.startMode === ExamStartMode.Manual) {
    if (!record.manualStartedAt) {
      return { color: 'orange', text: 'Awaiting start' };
    }
    const started = dayjs(record.manualStartedAt);
    const windowEnd = started.add(record.joinWindowMinutes, 'minute');
    if (now.isBefore(windowEnd)) {
      const minutesLeft = windowEnd.diff(now, 'minute');
      const secondsLeft = windowEnd.diff(now, 'second') % 60;
      return {
        color: 'green',
        text: `Live (${minutesLeft}m ${secondsLeft}s remaining to join)`,
      };
    }
    return { color: 'default', text: 'Closed' };
  }

  if (record.startMode === ExamStartMode.Scheduled) {
    const start = record.scheduledStartAt ? dayjs(record.scheduledStartAt) : null;
    const end = record.scheduledEndAt ? dayjs(record.scheduledEndAt) : null;
    if (start && now.isBefore(start)) {
      return { color: 'blue', text: `Starts at ${start.format('YYYY-MM-DD HH:mm')}` };
    }
    if (end && now.isAfter(end)) {
      return { color: 'default', text: 'Closed' };
    }
    return { color: 'green', text: 'Live' };
  }

  return null;
}

export default function QuizzesListPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<QuizListDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [, setTick] = useState(0); // forces re-render every second for live countdown

  // Tick every second only if there's a live manual exam to update countdown
  useEffect(() => {
    const hasLiveManualExam = data.some(
      (q) =>
        q.mode === QuizMode.Exam &&
        q.status === QuizStatus.Published &&
        q.startMode === ExamStartMode.Manual &&
        q.manualStartedAt &&
        dayjs().isBefore(dayjs(q.manualStartedAt).add(q.joinWindowMinutes, 'minute')),
    );
    if (!hasLiveManualExam) return;

    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [data]);

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
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { message?: string; title?: string } } };
      const msg =
        errObj?.response?.data?.message ||
        errObj?.response?.data?.title ||
        'Failed to publish quiz';
      message.error(msg);
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

  const handleReuse = async (id: string) => {
    try {
      const res = await quizzesApi.reuseQuiz(id);
      message.success('Quiz duplicated. Edit the copy to customize.');
      navigate(`../quizzes/${res.data.id}/edit`);
    } catch {
      message.error('Failed to reuse quiz');
    }
  };

  const handleStartExam = async (id: string) => {
    try {
      await quizzesApi.startExam(id);
      message.success('Exam started');
      fetchQuizzes();
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { message?: string; title?: string } } };
      const msg =
        errObj?.response?.data?.message ||
        errObj?.response?.data?.title ||
        'Failed to start exam';
      message.error(msg);
    }
  };

  const columns: ColumnsType<QuizListDto> = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (val: string, record) => (
        <Space>
          <span>{val}</span>
          {record.mode === QuizMode.Exam && !record.isValidated && (
            <Tooltip title="Not validated - preview required before publishing">
              <WarningOutlined style={{ color: '#faad14' }} />
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'Mode',
      dataIndex: 'mode',
      key: 'mode',
      width: 100,
      render: (mode: string) => (
        <Tag color={mode === QuizMode.Exam ? 'purple' : 'blue'}>{mode || 'Learning'}</Tag>
      ),
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
      title: 'Exam State',
      key: 'examState',
      width: 220,
      render: (_, record) => {
        const info = getExamStateInfo(record);
        if (!info) return <span style={{ color: 'rgba(0,0,0,0.45)' }}>-</span>;
        return <Tag color={info.color}>{info.text}</Tag>;
      },
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
      width: 320,
      render: (_, record) => {
        const actions: React.ReactNode[] = [];
        const isExam = record.mode === QuizMode.Exam;

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
        }

        if (
          isExam &&
          (record.status === QuizStatus.Draft || record.status === QuizStatus.Published)
        ) {
          actions.push(
            <Button
              key="preview"
              type="link"
              icon={<EyeOutlined />}
              onClick={() => navigate(`../quizzes/${record.id}/preview`)}
            >
              Preview
            </Button>,
          );
        }

        if (record.status === QuizStatus.Draft) {
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

        if (
          isExam &&
          record.status === QuizStatus.Published &&
          record.startMode === ExamStartMode.Manual &&
          !record.manualStartedAt
        ) {
          actions.push(
            <Popconfirm
              key="start-exam"
              title="Start exam now?"
              description={`Students will have ${record.joinWindowMinutes} minutes to join`}
              onConfirm={() => handleStartExam(record.id)}
            >
              <Button type="link" icon={<PlayCircleOutlined />}>
                Start Exam
              </Button>
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

        // Reuse button: available for Published and Archived quizzes
        if (
          record.status === QuizStatus.Published ||
          record.status === QuizStatus.Archived
        ) {
          const reuseDescription = isExam
            ? 'Creates a new draft copy. Validation, scheduled times, and start state will be reset for the exam.'
            : 'Creates a new draft copy with the same questions and settings.';

          actions.push(
            <Popconfirm
              key="reuse"
              title="Reuse this quiz?"
              description={reuseDescription}
              onConfirm={() => handleReuse(record.id)}
            >
              <Button type="link" icon={<CopyOutlined />}>
                Reuse
              </Button>
            </Popconfirm>,
          );
        }

        return <Space size="small" wrap>{actions}</Space>;
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
