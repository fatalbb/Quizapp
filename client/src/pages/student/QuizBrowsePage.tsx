import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography,
  Card,
  Row,
  Col,
  Button,
  Pagination,
  Spin,
  Empty,
  Tag,
  Space,
  message,
} from 'antd';
import {
  ClockCircleOutlined,
  TrophyOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { quizzesApi } from '../../api/quizzesApi';
import type { QuizListDto } from '../../types/quiz';
import { QuizStatus, QuizMode, ExamStartMode } from '../../types/enums';

const PAGE_SIZE = 9;

interface AvailabilityResult {
  canStart: boolean;
  buttonLabel: string;
  reason?: string;
}

function getAvailability(quiz: QuizListDto): AvailabilityResult {
  const isExam = quiz.mode === QuizMode.Exam;

  // Attempts limit applies to all quizzes when maxAttempts > 0
  if (quiz.maxAttempts > 0 && quiz.attemptsUsed >= quiz.maxAttempts) {
    return {
      canStart: false,
      buttonLabel: `Already completed (${quiz.attemptsUsed}/${quiz.maxAttempts} attempts used)`,
    };
  }

  if (!isExam) {
    return { canStart: true, buttonLabel: 'Start Quiz' };
  }

  const now = dayjs();

  if (quiz.startMode === ExamStartMode.Manual) {
    if (!quiz.manualStartedAt) {
      return {
        canStart: false,
        buttonLabel: 'Waiting for teacher to start',
      };
    }
    const started = dayjs(quiz.manualStartedAt);
    const windowEnd = started.add(quiz.joinWindowMinutes, 'minute');
    if (now.isAfter(windowEnd)) {
      return { canStart: false, buttonLabel: 'Join window closed' };
    }
    return { canStart: true, buttonLabel: 'Start Exam' };
  }

  if (quiz.startMode === ExamStartMode.Scheduled) {
    const start = quiz.scheduledStartAt ? dayjs(quiz.scheduledStartAt) : null;
    const end = quiz.scheduledEndAt ? dayjs(quiz.scheduledEndAt) : null;
    if (start && now.isBefore(start)) {
      return {
        canStart: false,
        buttonLabel: `Starts at ${start.format('YYYY-MM-DD HH:mm')}`,
      };
    }
    if (end && now.isAfter(end)) {
      return { canStart: false, buttonLabel: 'Closed' };
    }
    return { canStart: true, buttonLabel: 'Start Exam' };
  }

  return { canStart: true, buttonLabel: 'Start Exam' };
}

export default function QuizBrowsePage() {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<QuizListDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageNumber, setPageNumber] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [, setTick] = useState(0);

  // Live tick to update countdown / availability text every second when there's a live exam
  useEffect(() => {
    const hasLiveExam = quizzes.some(
      (q) =>
        q.mode === QuizMode.Exam &&
        ((q.startMode === ExamStartMode.Manual && q.manualStartedAt) ||
          q.startMode === ExamStartMode.Scheduled),
    );
    if (!hasLiveExam) return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [quizzes]);

  const fetchQuizzes = async (page: number) => {
    setLoading(true);
    try {
      const { data } = await quizzesApi.getQuizzes({
        pageNumber: page,
        pageSize: PAGE_SIZE,
        status: QuizStatus.Published,
      });
      setQuizzes(data.items);
      setTotalCount(data.totalCount);
    } catch {
      message.error('Failed to load quizzes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizzes(pageNumber);
  }, [pageNumber]);

  const handlePageChange = (page: number) => {
    setPageNumber(page);
  };

  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={3}>Available Quizzes</Typography.Title>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <Spin size="large" />
        </div>
      ) : quizzes.length === 0 ? (
        <Empty description="No quizzes available at the moment." />
      ) : (
        <>
          <Row gutter={[24, 24]}>
            {quizzes.map((quiz) => {
              const availability = getAvailability(quiz);
              const isExam = quiz.mode === QuizMode.Exam;
              return (
                <Col xs={24} sm={12} lg={8} key={quiz.id}>
                  <Card
                    hoverable
                    style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                    bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                  >
                    <Space style={{ marginBottom: 8 }} wrap>
                      <Tag color={isExam ? 'purple' : 'blue'}>
                        {quiz.mode || 'Learning'}
                      </Tag>
                      {quiz.maxAttempts > 0 && (
                        <Tag color="default">
                          {quiz.attemptsUsed}/{quiz.maxAttempts} attempts used
                        </Tag>
                      )}
                    </Space>

                    <Typography.Title level={5} style={{ marginBottom: 8 }}>
                      {quiz.title}
                    </Typography.Title>
                    <Typography.Paragraph
                      type="secondary"
                      ellipsis={{ rows: 2 }}
                      style={{ marginBottom: 16 }}
                    >
                      {quiz.description || 'No description provided.'}
                    </Typography.Paragraph>

                    <div style={{ marginTop: 'auto' }}>
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 16,
                          marginBottom: 16,
                          color: 'rgba(0,0,0,0.65)',
                          fontSize: 13,
                        }}
                      >
                        <span>
                          <ClockCircleOutlined style={{ marginRight: 4 }} />
                          {quiz.timeLimitMinutes} minutes
                        </span>
                        <span>
                          <TrophyOutlined style={{ marginRight: 4 }} />
                          Pass: {quiz.passingScorePercentage}%
                        </span>
                        <span>
                          <FileTextOutlined style={{ marginRight: 4 }} />
                          {quiz.totalQuestions} questions
                        </span>
                      </div>

                      <Button
                        type="primary"
                        block
                        disabled={!availability.canStart}
                        onClick={() =>
                          navigate(`/student/quizzes/${quiz.id}/take`)
                        }
                      >
                        {availability.buttonLabel}
                      </Button>
                    </div>
                  </Card>
                </Col>
              );
            })}
          </Row>

          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <Pagination
              current={pageNumber}
              total={totalCount}
              pageSize={PAGE_SIZE}
              onChange={handlePageChange}
              showSizeChanger={false}
            />
          </div>
        </>
      )}
    </div>
  );
}
