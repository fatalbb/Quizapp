import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Statistic,
  Spin,
  Tag,
  Button,
  Progress,
  Image,
  message,
  Typography,
  Space,
  Alert,
  Divider,
  List,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  CheckOutlined,
  CloseOutlined,
  DownloadOutlined,
  TableOutlined,
  BulbOutlined,
  RetweetOutlined,
} from '@ant-design/icons';
import { Modal, Input } from 'antd';
import dayjs from 'dayjs';
import { analyticsApi } from '../../api/analyticsApi';
import { quizAttemptsApi } from '../../api/quizAttemptsApi';
import type { AttemptDetailedDto, DetailedQuestionResultDto } from '../../types/analytics';
import type { QuestionFeedbackDto } from '../../types/quizAttempt';

const { Title, Text, Paragraph } = Typography;

const typeColor: Record<string, string> = {
  MultipleChoice: 'blue',
  SingleChoice: 'green',
  TrueFalse: 'orange',
  Input: 'purple',
};

const difficultyColor: Record<string, string> = {
  Easy: 'green',
  Medium: 'gold',
  Hard: 'red',
};

export default function AttemptDetailedPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<AttemptDetailedDto | null>(null);
  const [loading, setLoading] = useState(true);

  // Feedback per-question (cached client-side; backend caches as well)
  const [feedbackById, setFeedbackById] = useState<Record<string, QuestionFeedbackDto>>({});
  const [loadingFeedback, setLoadingFeedback] = useState<Record<string, boolean>>({});

  // Re-evaluation modal (teacher = unlimited)
  const [reevalModal, setReevalModal] = useState<{ questionId: string; questionText?: string } | null>(null);
  const [justification, setJustification] = useState('');
  const [reevalSubmitting, setReevalSubmitting] = useState(false);

  // Batch re-evaluation
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchJustification, setBatchJustification] = useState('');
  const [batchSubmitting, setBatchSubmitting] = useState(false);

  const handleBatchReevaluate = async () => {
    if (!attemptId) return;
    setBatchSubmitting(true);
    try {
      const res = await quizAttemptsApi.requestBatchReevaluation(attemptId, batchJustification);
      const { processed, resultsChanged } = res.data;
      message.success(
        `Re-evaluated ${processed} question${processed === 1 ? '' : 's'}. ${resultsChanged} changed.`,
      );
      const refreshed = await analyticsApi.getAttemptDetailed(attemptId);
      setData(refreshed.data);
      setFeedbackById({});
      setBatchModalOpen(false);
      setBatchJustification('');
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { detail?: string; title?: string; error?: string } } };
      message.error(errObj?.response?.data?.detail || errObj?.response?.data?.error || 'Batch re-evaluation failed.');
    } finally {
      setBatchSubmitting(false);
    }
  };

  const handleGetFeedback = async (questionId: string) => {
    if (!attemptId || feedbackById[questionId]) return;
    setLoadingFeedback((p) => ({ ...p, [questionId]: true }));
    try {
      const res = await quizAttemptsApi.getFeedback(attemptId, questionId);
      setFeedbackById((p) => ({ ...p, [questionId]: res.data }));
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { detail?: string; title?: string; error?: string } } };
      message.error(errObj?.response?.data?.detail || errObj?.response?.data?.error || 'Failed to load feedback.');
    } finally {
      setLoadingFeedback((p) => ({ ...p, [questionId]: false }));
    }
  };

  const handleReevaluate = async () => {
    if (!attemptId || !reevalModal) return;
    if (!justification.trim()) {
      message.warning('Please write a justification.');
      return;
    }
    setReevalSubmitting(true);
    try {
      const res = await quizAttemptsApi.requestReevaluation(attemptId, reevalModal.questionId, justification);
      message.success(
        res.data.resultChanged
          ? `Result changed: now marked ${res.data.isCorrect ? 'correct' : 'incorrect'}.`
          : 'Re-evaluation complete (result unchanged).',
      );
      // Reload full attempt details
      const refreshed = await analyticsApi.getAttemptDetailed(attemptId);
      setData(refreshed.data);
      setFeedbackById((p) => {
        const copy = { ...p };
        delete copy[reevalModal.questionId];
        return copy;
      });
      setReevalModal(null);
      setJustification('');
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { detail?: string; title?: string; error?: string } } };
      message.error(errObj?.response?.data?.detail || errObj?.response?.data?.error || 'Re-evaluation failed.');
    } finally {
      setReevalSubmitting(false);
    }
  };

  useEffect(() => {
    if (!attemptId) return;
    setLoading(true);
    analyticsApi
      .getAttemptDetailed(attemptId)
      .then((res) => setData(res.data))
      .catch(() => message.error('Failed to load attempt details'))
      .finally(() => setLoading(false));
  }, [attemptId]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!data) return null;

  const renderMedia = (q: DetailedQuestionResultDto) => {
    if (!q.media || q.media.length === 0) return null;
    return (
      <div style={{ marginBottom: 12 }}>
        {q.media.map((m, idx) =>
          m.mediaType === 'Image' ? (
            <Image
              key={idx}
              src={m.url}
              alt={m.fileName}
              style={{ maxWidth: 400, maxHeight: 250, marginRight: 8, borderRadius: 6 }}
            />
          ) : (
            <Button
              key={idx}
              icon={<DownloadOutlined />}
              href={m.url}
              target="_blank"
              size="small"
              style={{ marginRight: 8 }}
            >
              <TableOutlined /> {m.fileName}
            </Button>
          ),
        )}
      </div>
    );
  };

  const renderQuestion = (q: DetailedQuestionResultDto, index: number) => {
    const isInput = q.questionType === 'Input';
    const correctOption = q.options.find((o) => o.isCorrect);

    return (
      <Card
        key={q.questionId}
        size="small"
        style={{
          marginBottom: 16,
          borderLeft: `4px solid ${q.isCorrect ? '#52c41a' : q.score > 0 ? '#faad14' : '#ff4d4f'}`,
        }}
        title={
          <Space>
            {q.isCorrect ? (
              <CheckCircleFilled style={{ color: '#52c41a' }} />
            ) : (
              <CloseCircleFilled style={{ color: '#ff4d4f' }} />
            )}
            <span>Question {index + 1}</span>
            <Tag color={typeColor[q.questionType] || 'default'}>{q.questionType}</Tag>
            <Tag color={difficultyColor[q.difficultyLevel] || 'default'}>{q.difficultyLevel}</Tag>
            <Tag>{q.categoryName}</Tag>
          </Space>
        }
        extra={
          <Tag color={q.isCorrect ? 'success' : q.score > 0 ? 'warning' : 'error'}>
            {Math.round(q.score * 100)}%
          </Tag>
        }
      >
        {q.questionText && (
          <Paragraph style={{ fontSize: 15, marginBottom: 12, whiteSpace: 'pre-wrap' }}>
            {q.questionText}
          </Paragraph>
        )}

        {renderMedia(q)}

        {/* For Input questions, show student's text + expected */}
        {isInput ? (
          <div>
            <div style={{ marginBottom: 12 }}>
              <Text strong>Student's answer:</Text>
              <Card size="small" style={{ marginTop: 4, background: '#fafafa' }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                  {q.studentInputText || <Text type="secondary">(no answer)</Text>}
                </pre>
              </Card>
            </div>
            {correctOption && (
              <div style={{ marginBottom: 12 }}>
                <Text strong>Expected answer:</Text>
                <Card size="small" style={{ marginTop: 4, background: '#f6ffed', borderColor: '#b7eb8f' }}>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                    {correctOption.text}
                  </pre>
                </Card>
              </div>
            )}
            {q.aiEvaluationNotes && (
              <Alert
                type={q.isCorrect ? 'success' : 'warning'}
                message="AI Evaluation"
                description={q.aiEvaluationNotes}
                showIcon
                style={{ marginTop: 8 }}
              />
            )}
          </div>
        ) : (
          /* For choice-based questions, show all options with status indicators */
          <List
            size="small"
            dataSource={q.options}
            renderItem={(opt) => {
              let bg = 'transparent';
              let borderColor = '#f0f0f0';
              let icon: React.ReactNode = null;
              let suffix: React.ReactNode = null;

              if (opt.isCorrect && opt.wasSelected) {
                // Correct AND selected -> green checkmark
                bg = '#f6ffed';
                borderColor = '#b7eb8f';
                icon = <CheckCircleFilled style={{ color: '#52c41a', marginRight: 8 }} />;
                suffix = <Tag color="success">Correct selection</Tag>;
              } else if (opt.isCorrect && !opt.wasSelected) {
                // Correct but missed -> blue outline (correct answer student should have picked)
                bg = '#e6f4ff';
                borderColor = '#91caff';
                icon = <CheckOutlined style={{ color: '#1677ff', marginRight: 8 }} />;
                suffix = <Tag color="processing">Correct (missed)</Tag>;
              } else if (!opt.isCorrect && opt.wasSelected) {
                // Wrong AND selected -> red
                bg = '#fff2f0';
                borderColor = '#ffccc7';
                icon = <CloseCircleFilled style={{ color: '#ff4d4f', marginRight: 8 }} />;
                suffix = <Tag color="error">Wrong selection</Tag>;
              } else {
                // Not selected and not correct -> neutral
                icon = <CloseOutlined style={{ color: '#bfbfbf', marginRight: 8 }} />;
              }

              return (
                <List.Item
                  style={{
                    background: bg,
                    border: `1px solid ${borderColor}`,
                    borderRadius: 6,
                    marginBottom: 6,
                    padding: '8px 12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <span>
                      {icon}
                      {opt.text}
                    </span>
                    {suffix}
                  </div>
                </List.Item>
              );
            }}
          />
        )}

        {/* Multiple choice score note */}
        {!isInput && q.aiEvaluationNotes && (
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
            {q.aiEvaluationNotes}
          </Text>
        )}

        {/* Feedback + Re-evaluation buttons (teachers always have access) */}
        <Space style={{ marginTop: 12 }} wrap>
          {!feedbackById[q.questionId] && (
            <Button
              size="small"
              icon={<BulbOutlined />}
              loading={!!loadingFeedback[q.questionId]}
              onClick={() => handleGetFeedback(q.questionId)}
            >
              Get Feedback
            </Button>
          )}
          {isInput && (
            <Button
              size="small"
              icon={<RetweetOutlined />}
              onClick={() => setReevalModal({ questionId: q.questionId, questionText: q.questionText })}
            >
              Re-evaluate (Teacher)
            </Button>
          )}
        </Space>

        {/* Feedback panel */}
        {feedbackById[q.questionId] && (
          <div
            style={{
              marginTop: 10,
              padding: 10,
              background: '#f6ffed',
              border: '1px solid #b7eb8f',
              borderRadius: 6,
            }}
          >
            <Text strong style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>
              <BulbOutlined /> Feedback
            </Text>
            <Paragraph style={{ marginBottom: 6, whiteSpace: 'pre-wrap' }}>
              {feedbackById[q.questionId].explanation}
            </Paragraph>
            {feedbackById[q.questionId].correctAnswer && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                <strong>Correct answer:</strong> {feedbackById[q.questionId].correctAnswer}
              </Text>
            )}
          </div>
        )}
      </Card>
    );
  };

  const duration = data.completedAt
    ? dayjs(data.completedAt).diff(dayjs(data.startedAt), 'minute', true)
    : null;

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
          Back to Analytics
        </Button>
      </Space>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col xs={24} md={8}>
            <Title level={4} style={{ marginBottom: 4 }}>
              {data.studentName}
            </Title>
            <Text type="secondary">{data.studentEmail}</Text>
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">Quiz: </Text>
              <Text strong>{data.quizTitle}</Text>
            </div>
          </Col>
          <Col xs={24} md={4}>
            <Statistic
              title="Score"
              value={data.score ?? 0}
              precision={1}
              suffix="%"
              valueStyle={{ color: data.passed ? '#52c41a' : '#ff4d4f' }}
            />
          </Col>
          <Col xs={12} md={4}>
            <Statistic title="Correct" value={`${data.correctAnswers}/${data.totalQuestions}`} />
          </Col>
          <Col xs={12} md={4}>
            <Statistic title="Status" value={data.status} />
          </Col>
          <Col xs={12} md={4}>
            <Statistic
              title="Result"
              value={data.passed ? 'Passed' : 'Failed'}
              valueStyle={{ color: data.passed ? '#52c41a' : '#ff4d4f' }}
            />
          </Col>
        </Row>
        <Divider style={{ margin: '12px 0' }} />
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Text type="secondary">Started: </Text>
            <Text>{dayjs(data.startedAt).format('YYYY-MM-DD HH:mm:ss')}</Text>
          </Col>
          <Col xs={24} md={8}>
            <Text type="secondary">Completed: </Text>
            <Text>
              {data.completedAt ? dayjs(data.completedAt).format('YYYY-MM-DD HH:mm:ss') : '—'}
            </Text>
          </Col>
          <Col xs={24} md={8}>
            <Text type="secondary">Duration: </Text>
            <Text>
              {duration != null ? `${duration.toFixed(1)} min` : '—'} / {data.timeLimitMinutes} min limit
            </Text>
          </Col>
        </Row>
        <Divider style={{ margin: '12px 0' }} />
        <Progress
          percent={Math.round(data.score ?? 0)}
          status={data.passed ? 'success' : 'exception'}
          format={(p) => `${p}% (passing: ${data.passingScorePercentage}%)`}
        />
      </Card>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Title level={4} style={{ margin: 0 }}>
          Question-by-Question Breakdown
        </Title>
        {(() => {
          const wrongInputCount = data.questions.filter(
            (q) => q.questionType === 'Input' && !q.isCorrect,
          ).length;
          if (wrongInputCount === 0) return null;
          return (
            <Button
              icon={<RetweetOutlined />}
              onClick={() => setBatchModalOpen(true)}
            >
              Re-evaluate All Wrong Inputs ({wrongInputCount})
            </Button>
          );
        })()}
      </div>
      {data.questions.map((q, i) => renderQuestion(q, i))}

      <Modal
        title="Re-evaluate Answer (Teacher)"
        open={reevalModal !== null}
        onCancel={() => {
          setReevalModal(null);
          setJustification('');
        }}
        onOk={handleReevaluate}
        confirmLoading={reevalSubmitting}
        okText="Submit"
        destroyOnClose
      >
        <Paragraph type="secondary">
          Re-evaluate this answer with additional context. Teachers have unlimited re-evaluations.
        </Paragraph>
        {reevalModal?.questionText && (
          <Paragraph>
            <strong>Question:</strong> {reevalModal.questionText}
          </Paragraph>
        )}
        <Input.TextArea
          rows={5}
          value={justification}
          onChange={(e) => setJustification(e.target.value)}
          placeholder="As a teacher reviewing this answer, the AI should consider..."
          maxLength={1000}
          showCount
        />
      </Modal>

      <Modal
        title="Re-evaluate All Wrong Inputs (Teacher)"
        open={batchModalOpen}
        onCancel={() => {
          setBatchModalOpen(false);
          setBatchJustification('');
        }}
        onOk={handleBatchReevaluate}
        confirmLoading={batchSubmitting}
        okText="Submit"
        destroyOnClose
      >
        <Paragraph type="secondary">
          Re-grade every Input question that's currently wrong. Teachers have unlimited re-evaluations.
        </Paragraph>
        <Paragraph>
          <strong>Optional shared justification:</strong>
        </Paragraph>
        <Input.TextArea
          rows={4}
          value={batchJustification}
          onChange={(e) => setBatchJustification(e.target.value)}
          placeholder="(optional) e.g. 'Be more lenient on syntax variations'"
          maxLength={1000}
          showCount
        />
      </Modal>
    </div>
  );
}
