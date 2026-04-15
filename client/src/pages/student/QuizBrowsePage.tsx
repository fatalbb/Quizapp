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
  message,
} from 'antd';
import { ClockCircleOutlined, TrophyOutlined, FileTextOutlined } from '@ant-design/icons';
import { quizzesApi } from '../../api/quizzesApi';
import type { QuizListDto } from '../../types/quiz';
import { QuizStatus } from '../../types/enums';

const PAGE_SIZE = 9;

export default function QuizBrowsePage() {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<QuizListDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageNumber, setPageNumber] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

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
            {quizzes.map((quiz) => (
              <Col xs={24} sm={12} lg={8} key={quiz.id}>
                <Card
                  hoverable
                  style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                  bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                >
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
                      onClick={() => navigate(`/student/quizzes/${quiz.id}/take`)}
                    >
                      Start Quiz
                    </Button>
                  </div>
                </Card>
              </Col>
            ))}
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
