import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Row, Col, Statistic, Spin, message, Typography } from 'antd';
import { analyticsApi } from '../../api/analyticsApi';
import type { QuizAnalyticsDto } from '../../types/analytics';

const { Title } = Typography;

export default function QuizAnalyticsPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const [data, setData] = useState<QuizAnalyticsDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!quizId) return;
    setLoading(true);
    analyticsApi
      .getQuizAnalytics(quizId)
      .then((res) => setData(res.data))
      .catch(() => message.error('Failed to load quiz analytics'))
      .finally(() => setLoading(false));
  }, [quizId]);

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
      <Title level={3} style={{ marginBottom: 24 }}>
        {data.quizTitle} - Analytics
      </Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic title="Total Attempts" value={data.totalAttempts} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={5}>
          <Card>
            <Statistic
              title="Average Score"
              value={data.averageScore}
              precision={1}
              suffix="%"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={5}>
          <Card>
            <Statistic
              title="Pass Rate"
              value={data.passRate}
              precision={1}
              suffix="%"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={5}>
          <Card>
            <Statistic
              title="Highest Score"
              value={data.highestScore}
              precision={1}
              suffix="%"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={5}>
          <Card>
            <Statistic
              title="Lowest Score"
              value={data.lowestScore}
              precision={1}
              suffix="%"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
