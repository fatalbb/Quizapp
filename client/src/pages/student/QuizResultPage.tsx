import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Typography,
  Card,
  Progress,
  Tag,
  List,
  Spin,
  Button,
  Row,
  Col,
  message,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { quizAttemptsApi } from '../../api/quizAttemptsApi';
import type { QuizAttemptResultDto } from '../../types/quizAttempt';
import { QuizAttemptStatus } from '../../types/enums';

export default function QuizResultPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<QuizAttemptResultDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!attemptId) return;

    const fetchResult = async () => {
      try {
        const { data } = await quizAttemptsApi.getAttemptResult(attemptId);
        setResult(data);
      } catch {
        message.error('Failed to load quiz result.');
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [attemptId]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 120 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!result) {
    return (
      <div style={{ padding: 24 }}>
        <Typography.Text type="danger">Result not found.</Typography.Text>
      </div>
    );
  }

  const statusLabel =
    result.status === QuizAttemptStatus.TimedOut ? 'Timed Out' : 'Completed';
  const statusColor =
    result.status === QuizAttemptStatus.TimedOut ? 'orange' : 'blue';

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <Typography.Title level={3}>Quiz Result</Typography.Title>

      <Card style={{ marginBottom: 24 }}>
        <Row gutter={24} align="middle">
          <Col xs={24} sm={8} style={{ textAlign: 'center' }}>
            <Progress
              type="circle"
              percent={Math.round(result.score)}
              size={140}
              strokeColor={result.passed ? '#52c41a' : '#ff4d4f'}
              format={(percent) => `${percent}%`}
            />
          </Col>
          <Col xs={24} sm={16}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <Tag
                  color={result.passed ? 'success' : 'error'}
                  style={{ fontSize: 16, padding: '4px 16px' }}
                >
                  {result.passed ? 'PASSED' : 'FAILED'}
                </Tag>
                <Tag color={statusColor} style={{ marginLeft: 8 }}>
                  {statusLabel}
                </Tag>
              </div>
              <Typography.Text style={{ fontSize: 15 }}>
                Correct: {result.correctAnswers} / {result.totalQuestions}
              </Typography.Text>
              <Typography.Text style={{ fontSize: 15 }}>
                Score: {Math.round(result.score)}%
              </Typography.Text>
            </div>
          </Col>
        </Row>
      </Card>

      <Typography.Title level={4} style={{ marginBottom: 16 }}>
        Question Breakdown
      </Typography.Title>

      <List
        dataSource={result.questionResults}
        renderItem={(qr, index) => (
          <List.Item>
            <List.Item.Meta
              avatar={
                qr.isCorrect ? (
                  <CheckCircleOutlined
                    style={{ fontSize: 22, color: '#52c41a' }}
                  />
                ) : (
                  <CloseCircleOutlined
                    style={{ fontSize: 22, color: '#ff4d4f' }}
                  />
                )
              }
              title={
                <span>
                  Question {index + 1}: {qr.questionText || 'N/A'}
                </span>
              }
              description={
                qr.aiEvaluationNotes ? (
                  <Typography.Text
                    type="secondary"
                    italic
                    style={{ display: 'block', marginTop: 4 }}
                  >
                    {qr.aiEvaluationNotes}
                  </Typography.Text>
                ) : null
              }
            />
            <Tag color={qr.isCorrect ? 'green' : 'red'}>
              {qr.isCorrect ? 'Correct' : 'Incorrect'}
            </Tag>
          </List.Item>
        )}
      />

      <div style={{ marginTop: 24 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/student/attempts')}
        >
          My Attempts
        </Button>
      </div>
    </div>
  );
}
