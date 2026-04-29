import { useEffect, useRef, useState } from 'react';
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
  Alert,
  Modal,
  Input,
  Space,
  message,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ArrowLeftOutlined,
  LoadingOutlined,
  BulbOutlined,
  RetweetOutlined,
} from '@ant-design/icons';
import { quizAttemptsApi } from '../../api/quizAttemptsApi';
import type { QuizAttemptResultDto, QuestionFeedbackDto } from '../../types/quizAttempt';
import { QuizAttemptStatus } from '../../types/enums';

const POLL_INTERVAL_MS = 2500;

export default function QuizResultPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<QuizAttemptResultDto | null>(null);
  const [loading, setLoading] = useState(true);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Feedback per-question (cached client-side)
  const [feedbackById, setFeedbackById] = useState<Record<string, QuestionFeedbackDto>>({});
  const [loadingFeedback, setLoadingFeedback] = useState<Record<string, boolean>>({});

  // Re-evaluation modal state
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
      const { processed, skipped, resultsChanged } = res.data;
      message.success(
        `Re-evaluated ${processed} question${processed === 1 ? '' : 's'}. ${resultsChanged} changed.` +
          (skipped > 0 ? ` ${skipped} skipped due to quota.` : ''),
      );
      const refreshed = await quizAttemptsApi.getAttemptResult(attemptId);
      setResult(refreshed.data);
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
          ? `Result changed: ${res.data.isCorrect ? 'Now correct' : 'Now incorrect'}!`
          : 'Re-evaluation complete (result unchanged).',
      );
      // Refresh full result
      const refreshed = await quizAttemptsApi.getAttemptResult(attemptId);
      setResult(refreshed.data);
      // Replace feedback cache for this question (since AiEvaluationNotes may have updated)
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

    let cancelled = false;

    const fetchResult = async (showLoader: boolean) => {
      try {
        const { data } = await quizAttemptsApi.getAttemptResult(attemptId);
        if (cancelled) return;
        setResult(data);

        // If still grading, schedule another poll
        if (data.isGrading) {
          pollTimerRef.current = setTimeout(() => fetchResult(false), POLL_INTERVAL_MS);
        }
      } catch {
        if (!cancelled) message.error('Failed to load quiz result.');
      } finally {
        if (showLoader && !cancelled) setLoading(false);
      }
    };

    fetchResult(true);

    return () => {
      cancelled = true;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
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

  const pendingCount = result.questionResults.filter((q) => q.isCorrect === null).length;

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <Typography.Title level={3}>Quiz Result</Typography.Title>

      {result.isGrading && (
        <Alert
          type="info"
          showIcon
          icon={<LoadingOutlined />}
          message="AI is grading your written answers"
          description={
            pendingCount > 0
              ? `${pendingCount} question${pendingCount === 1 ? '' : 's'} pending. Your final score will update automatically.`
              : 'Updating your score...'
          }
          style={{ marginBottom: 16 }}
        />
      )}

      <Card style={{ marginBottom: 24 }}>
        <Row gutter={24} align="middle">
          <Col xs={24} sm={8} style={{ textAlign: 'center' }}>
            <Progress
              type="circle"
              percent={Math.round(result.score)}
              size={140}
              strokeColor={result.passed ? '#52c41a' : '#ff4d4f'}
              format={(percent) =>
                result.isGrading ? `${percent}% *` : `${percent}%`
              }
            />
          </Col>
          <Col xs={24} sm={16}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                {!result.isGrading && (
                  <Tag
                    color={result.passed ? 'success' : 'error'}
                    style={{ fontSize: 16, padding: '4px 16px' }}
                  >
                    {result.passed ? 'PASSED' : 'FAILED'}
                  </Tag>
                )}
                <Tag color={statusColor} style={{ marginLeft: result.isGrading ? 0 : 8 }}>
                  {statusLabel}
                </Tag>
              </div>
              <Typography.Text style={{ fontSize: 15 }}>
                Correct: {result.correctAnswers} / {result.totalQuestions}
              </Typography.Text>
              <Typography.Text style={{ fontSize: 15 }}>
                Score: {Math.round(result.score)}%
                {result.isGrading && (
                  <Typography.Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                    (preliminary — pending Input grading)
                  </Typography.Text>
                )}
              </Typography.Text>
            </div>
          </Col>
        </Row>
      </Card>

      <Typography.Title level={4} style={{ marginBottom: 16 }}>
        Question Breakdown
      </Typography.Title>

      {result.allowReevaluation && (
        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {result.maxReevaluationsPerStudent > 0 ? (
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              Re-evaluations remaining:{' '}
              <strong>
                {Math.max(0, result.maxReevaluationsPerStudent - result.reevaluationsUsed)}/
                {result.maxReevaluationsPerStudent}
              </strong>
            </Typography.Text>
          ) : (
            <span />
          )}

          {(() => {
            const wrongInputCount = result.questionResults.filter(
              (q) => q.isCorrect === false,
            ).length;
            const remaining = result.maxReevaluationsPerStudent === 0
              ? wrongInputCount
              : Math.max(0, result.maxReevaluationsPerStudent - result.reevaluationsUsed);
            const willProcess = Math.min(wrongInputCount, remaining);
            if (wrongInputCount === 0) return null;
            return (
              <Button
                size="small"
                icon={<RetweetOutlined />}
                disabled={willProcess === 0}
                onClick={() => setBatchModalOpen(true)}
              >
                Re-evaluate All Wrong ({willProcess})
              </Button>
            );
          })()}
        </div>
      )}

      <List
        dataSource={result.questionResults}
        renderItem={(qr, index) => {
          const isPending = qr.isCorrect === null;
          const fb = feedbackById[qr.questionId];
          const fbLoading = !!loadingFeedback[qr.questionId];
          const remaining = Math.max(0, result.maxReevaluationsPerStudent - result.reevaluationsUsed);
          const canRequestReeval =
            result.allowReevaluation &&
            !isPending &&
            // Only Input questions can be re-evaluated (server enforces this too)
            (qr.aiEvaluationNotes != null || qr.isCorrect === false || qr.isCorrect === true) &&
            (result.maxReevaluationsPerStudent === 0 || remaining > 0);

          return (
            <List.Item style={{ display: 'block' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <List.Item.Meta
                  avatar={
                    isPending ? (
                      <LoadingOutlined style={{ fontSize: 22, color: '#1677ff' }} />
                    ) : qr.isCorrect ? (
                      <CheckCircleOutlined style={{ fontSize: 22, color: '#52c41a' }} />
                    ) : (
                      <CloseCircleOutlined style={{ fontSize: 22, color: '#ff4d4f' }} />
                    )
                  }
                  title={
                    <span>
                      Question {index + 1}: {qr.questionText || 'N/A'}
                    </span>
                  }
                  description={
                    qr.aiEvaluationNotes ? (
                      <Typography.Text type="secondary" italic style={{ display: 'block', marginTop: 4 }}>
                        {qr.aiEvaluationNotes}
                      </Typography.Text>
                    ) : null
                  }
                />
                {isPending ? (
                  <Tag color="processing" icon={<LoadingOutlined />}>
                    Grading...
                  </Tag>
                ) : (
                  <Tag color={qr.isCorrect ? 'green' : 'red'}>
                    {qr.isCorrect ? 'Correct' : 'Incorrect'}
                  </Tag>
                )}
              </div>

              {/* Feedback + re-evaluation buttons */}
              {!isPending && (result.allowFeedback || result.allowReevaluation) && (
                <Space style={{ marginTop: 8, marginLeft: 38 }} wrap>
                  {result.allowFeedback && !fb && (
                    <Button
                      size="small"
                      type="link"
                      icon={<BulbOutlined />}
                      loading={fbLoading}
                      onClick={() => handleGetFeedback(qr.questionId)}
                    >
                      Get Feedback
                    </Button>
                  )}
                  {canRequestReeval && (
                    <Button
                      size="small"
                      type="link"
                      icon={<RetweetOutlined />}
                      onClick={() => setReevalModal({ questionId: qr.questionId, questionText: qr.questionText })}
                      disabled={result.maxReevaluationsPerStudent > 0 && remaining <= 0}
                      title={
                        result.maxReevaluationsPerStudent > 0 && remaining <= 0
                          ? 'You have used all your re-evaluations'
                          : ''
                      }
                    >
                      Request Re-evaluation
                    </Button>
                  )}
                </Space>
              )}

              {/* Feedback panel */}
              {fb && (
                <div
                  style={{
                    marginTop: 8,
                    marginLeft: 38,
                    padding: 10,
                    background: '#f6ffed',
                    border: '1px solid #b7eb8f',
                    borderRadius: 6,
                  }}
                >
                  <Typography.Text strong style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>
                    <BulbOutlined /> Feedback
                  </Typography.Text>
                  <Typography.Paragraph style={{ marginBottom: 6, whiteSpace: 'pre-wrap' }}>
                    {fb.explanation}
                  </Typography.Paragraph>
                  {fb.correctAnswer && (
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      <strong>Correct answer:</strong> {fb.correctAnswer}
                    </Typography.Text>
                  )}
                </div>
              )}
            </List.Item>
          );
        }}
      />

      {/* Re-evaluation Modal */}
      <Modal
        title="Request Re-evaluation"
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
        <Typography.Paragraph type="secondary">
          Explain why you think your answer should be re-evaluated. The AI will reconsider with your justification.
        </Typography.Paragraph>
        {reevalModal?.questionText && (
          <Typography.Paragraph>
            <strong>Question:</strong> {reevalModal.questionText}
          </Typography.Paragraph>
        )}
        <Input.TextArea
          rows={5}
          value={justification}
          onChange={(e) => setJustification(e.target.value)}
          placeholder="My answer is correct because..."
          maxLength={1000}
          showCount
        />
        <Alert
          type="warning"
          showIcon
          message="Re-evaluation may change your score in either direction (up or down)."
          style={{ marginTop: 12 }}
        />
      </Modal>

      <Modal
        title="Re-evaluate All Wrong Inputs"
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
        <Typography.Paragraph type="secondary">
          The AI will re-grade every Input question that's currently wrong. Each question consumes one re-evaluation from your quota.
        </Typography.Paragraph>
        <Typography.Paragraph>
          <strong>Optional shared justification</strong> (applied to all questions, leave blank for a generic recheck):
        </Typography.Paragraph>
        <Input.TextArea
          rows={4}
          value={batchJustification}
          onChange={(e) => setBatchJustification(e.target.value)}
          placeholder="(optional) Reasoning to apply to all wrong answers..."
          maxLength={1000}
          showCount
        />
        <Alert
          type="warning"
          showIcon
          message="Each question is re-evaluated independently and may flip in either direction."
          style={{ marginTop: 12 }}
        />
      </Modal>

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
