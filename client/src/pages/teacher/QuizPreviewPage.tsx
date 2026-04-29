import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Tag,
  Button,
  Alert,
  Spin,
  Image,
  Typography,
  Space,
  List,
  message,
} from 'antd';
import {
  CheckCircleFilled,
  CloseCircleOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { quizzesApi } from '../../api/quizzesApi';
import type { QuizPreviewDto, PreviewMediaDto } from '../../types/quiz';
import { QuizMode, MediaType } from '../../types/enums';

const { Title, Text, Paragraph } = Typography;

const difficultyColor: Record<string, string> = {
  Easy: 'green',
  Medium: 'gold',
  Hard: 'red',
};

function isImageMedia(m: PreviewMediaDto): boolean {
  return (
    m.mediaType === MediaType.Image ||
    m.mediaType === 'Image' ||
    !!m.url?.match(/\.(png|jpg|jpeg|gif|webp)$/i)
  );
}

function isTableMedia(m: PreviewMediaDto): boolean {
  return (
    m.mediaType === MediaType.ExcelTable ||
    m.mediaType === 'ExcelTable' ||
    !!m.url?.match(/\.(xlsx|xls)$/i)
  );
}

export default function QuizPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<QuizPreviewDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    quizzesApi
      .previewQuiz(id)
      .then((res) => setData(res.data))
      .catch(() => message.error('Failed to load quiz preview'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleValidate = async () => {
    if (!id) return;
    setValidating(true);
    try {
      await quizzesApi.validateQuiz(id);
      message.success('Quiz marked as validated');
      load();
    } catch {
      message.error('Failed to validate quiz');
    } finally {
      setValidating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: 24 }}>
        <Alert type="error" message="Quiz preview not available" />
      </div>
    );
  }

  const isExam = data.mode === QuizMode.Exam || data.mode === 'Exam';

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      <Space style={{ marginBottom: 16 }} align="center">
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
          Back
        </Button>
        <Title level={3} style={{ margin: 0 }}>
          Quiz Preview: {data.title}
        </Title>
        <Tag color={isExam ? 'purple' : 'blue'}>{data.mode}</Tag>
        {isExam && (
          <Tag color={data.isValidated ? 'green' : 'orange'}>
            {data.isValidated ? 'Validated' : 'Not Validated'}
          </Tag>
        )}
      </Space>

      {data.description && (
        <Paragraph type="secondary">{data.description}</Paragraph>
      )}

      {isExam && !data.isValidated && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="This exam needs validation before it can be published"
          description="Please review all questions and answers below, then click 'Mark as Validated' at the bottom."
        />
      )}

      {data.questions.map((q, idx) => {
        const images = q.media.filter(isImageMedia);
        const tables = q.media.filter(isTableMedia);

        return (
          <Card
            key={q.id}
            style={{ marginBottom: 16 }}
            title={
              <Space wrap>
                <Text strong>Question {idx + 1}</Text>
                <Tag>{q.questionType}</Tag>
                <Tag color={difficultyColor[q.difficultyLevel] || 'default'}>
                  {q.difficultyLevel}
                </Tag>
                <Tag color="blue">{q.categoryName}</Tag>
              </Space>
            }
          >
            {q.text && (
              <Paragraph style={{ fontSize: 15, marginBottom: 12 }}>
                {q.text}
              </Paragraph>
            )}

            {images.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                {images.map((m, i) => (
                  <Image
                    key={`img-${i}`}
                    src={m.url}
                    alt={m.fileName}
                    style={{ maxWidth: '100%', maxHeight: 400, borderRadius: 8 }}
                  />
                ))}
              </div>
            )}

            {tables.length > 0 && (
              <Space direction="vertical" style={{ marginBottom: 12, width: '100%' }}>
                {tables.map((m, i) => (
                  <Card key={`table-${i}`} size="small">
                    <Space>
                      <FileExcelOutlined style={{ fontSize: 18, color: '#52c41a' }} />
                      <Text>{m.fileName}</Text>
                      <Button
                        type="link"
                        icon={<DownloadOutlined />}
                        href={m.url}
                        target="_blank"
                      >
                        Download
                      </Button>
                    </Space>
                  </Card>
                ))}
              </Space>
            )}

            <List
              size="small"
              bordered
              dataSource={[...q.answers].sort((a, b) => a.orderIndex - b.orderIndex)}
              renderItem={(ans) => (
                <List.Item
                  style={{
                    backgroundColor: ans.isCorrect ? '#f6ffed' : undefined,
                    borderLeft: ans.isCorrect ? '4px solid #52c41a' : undefined,
                  }}
                >
                  <Space>
                    {ans.isCorrect ? (
                      <CheckCircleFilled style={{ color: '#52c41a' }} />
                    ) : (
                      <CloseCircleOutlined style={{ color: 'rgba(0,0,0,0.25)' }} />
                    )}
                    <Text strong={ans.isCorrect}>{ans.text}</Text>
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        );
      })}

      <Space style={{ marginTop: 16 }}>
        {isExam && !data.isValidated && (
          <Button type="primary" loading={validating} onClick={handleValidate}>
            Mark as Validated
          </Button>
        )}
        <Button onClick={() => navigate(-1)}>Back</Button>
      </Space>
    </div>
  );
}
