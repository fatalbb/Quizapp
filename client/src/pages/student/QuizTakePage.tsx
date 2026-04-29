import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Layout,
  Typography,
  Button,
  Radio,
  Checkbox,
  Input,
  Image,
  Spin,
  Popconfirm,
  Table as AntTable,
  Tabs,
  Card,
  message,
} from 'antd';
import {
  LeftOutlined,
  RightOutlined,
  SendOutlined,
  DownloadOutlined,
  TableOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import { quizAttemptsApi, type SqlSandboxResult } from '../../api/quizAttemptsApi';
import axiosInstance from '../../api/axiosInstance';
import { useCountdown } from '../../hooks/useCountdown';
import type {
  QuizAttemptStartDto,
  AttemptQuestionDto,
  SubmitAnswerDto,
} from '../../types/quizAttempt';
import { QuestionType, MediaType } from '../../types/enums';

const { Sider, Content } = Layout;

interface ParsedTable {
  tableName: string;
  columns: string[];
  rows: string[][];
  totalRows: number;
  truncated: boolean;
}

export default function QuizTakePage() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();

  const [attemptData, setAttemptData] = useState<QuizAttemptStartDto | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, SubmitAnswerDto>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const hasSubmittedRef = useRef(false);
  const hasStartedRef = useRef(false); // prevents duplicate attempts from StrictMode / double-mount

  const [excelCache, setExcelCache] = useState<Record<string, ParsedTable[]>>({});
  const [loadingExcel, setLoadingExcel] = useState<Record<string, boolean>>({});

  // Query sandbox state per question
  const [queryResults, setQueryResults] = useState<Record<string, SqlSandboxResult>>({});
  const [runningQuery, setRunningQuery] = useState<Record<string, boolean>>({});

  const [initialSeconds, setInitialSeconds] = useState(0);
  const { minutes, seconds, isExpired, remainingSeconds } = useCountdown(initialSeconds);

  useEffect(() => {
    if (!quizId || hasStartedRef.current) return;
    hasStartedRef.current = true;
    const start = async () => {
      try {
        const { data } = await quizAttemptsApi.startAttempt(quizId);
        setAttemptData(data);
        const startedAt = new Date(data.startedAt).getTime();
        const now = Date.now();
        const elapsed = Math.floor((now - startedAt) / 1000);
        const total = data.timeLimitMinutes * 60;
        setInitialSeconds(Math.max(total - elapsed, 0));
      } catch {
        message.error('Failed to start quiz attempt.');
        navigate('/student/quizzes');
      } finally {
        setLoading(false);
      }
    };
    start();
  }, [quizId, navigate]);

  const fetchExcelData = useCallback(async (url: string) => {
    if (excelCache[url] || loadingExcel[url]) return;
    setLoadingExcel((prev) => ({ ...prev, [url]: true }));
    try {
      // Convert /api/files/tables/... to /api/files/parse-excel/tables/...
      const parseUrl = url.replace('/api/files/', '/files/parse-excel/');
      const res = await axiosInstance.get<ParsedTable[]>(parseUrl);
      setExcelCache((prev) => ({ ...prev, [url]: res.data }));
    } catch {
      // silently fail — download link is still available
    } finally {
      setLoadingExcel((prev) => ({ ...prev, [url]: false }));
    }
  }, [excelCache, loadingExcel]);

  const handleSubmit = useCallback(async () => {
    if (!attemptData || hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;
    setSubmitting(true);
    try {
      await quizAttemptsApi.submitAttempt({
        attemptId: attemptData.attemptId,
        answers: Object.values(answers),
      });
      message.success('Quiz submitted successfully!');
      navigate(`/student/attempts/${attemptData.attemptId}/result`);
    } catch (err: any) {
      hasSubmittedRef.current = false;
      const detail = err?.response?.data?.detail || err?.response?.data?.title || err?.response?.data?.error || err?.message || 'Unknown error';
      console.error('Submit error:', err?.response?.data || err);
      message.error(`Failed to submit quiz: ${detail}`);
    } finally {
      setSubmitting(false);
    }
  }, [attemptData, answers, navigate]);

  useEffect(() => {
    // Only auto-submit on timer expiry for Exam mode (Learning quizzes have no timer)
    if (
      isExpired &&
      attemptData &&
      attemptData.mode === 'Exam' &&
      !hasSubmittedRef.current
    ) {
      message.warning('Time is up! Auto-submitting your quiz...');
      handleSubmit();
    }
  }, [isExpired, attemptData, handleSubmit]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  const updateAnswer = (questionId: string, partial: Partial<SubmitAnswerDto>) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], ...partial, questionId },
    }));
  };

  const handleRunQuery = async (question: AttemptQuestionDto) => {
    if (!attemptData) return;
    const queryText = answers[question.questionId]?.inputText || '';
    if (!queryText.trim()) {
      message.warning('Please type a query first.');
      return;
    }
    setRunningQuery((p) => ({ ...p, [question.questionId]: true }));
    try {
      const res = await quizAttemptsApi.runQuery(
        attemptData.attemptId,
        question.questionId,
        queryText,
      );
      setQueryResults((p) => ({ ...p, [question.questionId]: res.data }));
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { detail?: string; title?: string; error?: string } } };
      const detail =
        errObj?.response?.data?.detail ||
        errObj?.response?.data?.title ||
        errObj?.response?.data?.error ||
        'Failed to run query';
      message.error(detail);
    } finally {
      setRunningQuery((p) => ({ ...p, [question.questionId]: false }));
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 120 }}>
        <Spin size="large" tip="Starting quiz..." />
      </div>
    );
  }

  if (!attemptData) return null;

  const questions = attemptData.questions;
  const currentQuestion: AttemptQuestionDto = questions[currentIndex];
  const currentAnswer = answers[currentQuestion.questionId];

  const renderTimer = () => {
    const isLow = remainingSeconds < 60;
    return (
      <div
        style={{
          textAlign: 'center', padding: '16px 0', fontSize: 28, fontWeight: 700,
          fontVariantNumeric: 'tabular-nums', color: isLow ? '#ff4d4f' : '#1677ff',
        }}
      >
        {String(minutes).padStart(2, '0')}:{seconds}
      </div>
    );
  };

  const renderQuestionNav = () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '0 8px' }}>
      {questions.map((q, i) => {
        const isAnswered = !!answers[q.questionId];
        const isCurrent = i === currentIndex;
        return (
          <Button
            key={q.questionId} size="small"
            type={isCurrent ? 'primary' : isAnswered ? 'default' : 'dashed'}
            style={{
              width: 36, height: 36, padding: 0, fontWeight: isCurrent ? 700 : 400,
              backgroundColor: isCurrent ? undefined : isAnswered ? '#e6f4ff' : undefined,
              borderColor: isAnswered && !isCurrent ? '#1677ff' : undefined,
              color: isAnswered && !isCurrent ? '#1677ff' : undefined,
            }}
            onClick={() => setCurrentIndex(i)}
          >
            {i + 1}
          </Button>
        );
      })}
    </div>
  );

  const renderExcelTable = (url: string) => {
    const tables = excelCache[url];
    const isLoading = loadingExcel[url];

    if (!tables && !isLoading) {
      fetchExcelData(url);
      return <Spin size="small" />;
    }

    if (isLoading) return <Spin size="small" tip="Loading tables..." />;
    if (!tables || tables.length === 0) return null;

    return (
      <Tabs
        size="small"
        items={tables.map((table) => ({
          key: table.tableName,
          label: (
            <span>
              <TableOutlined style={{ marginRight: 4 }} />
              {table.tableName}
            </span>
          ),
          children: (
            <>
              <AntTable
                size="small"
                bordered
                pagination={false}
                scroll={{ x: 'max-content', y: 300 }}
                dataSource={table.rows.map((row, idx) => {
                  const obj: Record<string, string> = { _key: String(idx) };
                  table.columns.forEach((col, ci) => { obj[col] = row[ci] || ''; });
                  return obj;
                })}
                columns={table.columns.map((col) => ({
                  title: col,
                  dataIndex: col,
                  key: col,
                  ellipsis: true,
                }))}
                rowKey="_key"
              />
              {table.truncated && (
                <Typography.Text
                  type="secondary"
                  style={{ display: 'block', fontSize: 12, marginTop: 8 }}
                >
                  Showing {table.rows.length} of {table.totalRows} rows. Download the file to see all data.
                </Typography.Text>
              )}
            </>
          ),
        }))}
      />
    );
  };

  const renderMedia = (question: AttemptQuestionDto) => {
    if (!question.media || question.media.length === 0) return null;

    const images = question.media.filter((m) =>
      m.mediaType === MediaType.Image || m.mediaType === 'Image' ||
      m.url?.match(/\.(png|jpg|jpeg|gif|webp)$/i)
    );
    const tables = question.media.filter((m) =>
      m.mediaType === MediaType.ExcelTable || m.mediaType === 'ExcelTable' ||
      m.url?.match(/\.(xlsx|xls)$/i)
    );

    return (
      <div style={{ marginBottom: 16 }}>
        {images.map((m, idx) => (
          <div key={`img-${idx}`} style={{ marginBottom: 12 }}>
            <Image
              src={m.url}
              alt={`Question image ${idx + 1}`}
              style={{ maxWidth: '100%', maxHeight: 400, borderRadius: 8 }}
              fallback="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5Ij5JbWFnZSBub3QgYXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg=="
            />
          </div>
        ))}

        {tables.map((m, idx) => (
          <Card
            key={`table-${idx}`}
            size="small"
            title={
              <span>
                <TableOutlined style={{ marginRight: 8 }} />
                Database Tables
              </span>
            }
            extra={
              <Button
                type="link" icon={<DownloadOutlined />}
                href={m.url} target="_blank" size="small"
              >
                Download
              </Button>
            }
            style={{ marginBottom: 12, borderColor: '#91caff' }}
          >
            {renderExcelTable(m.url)}
          </Card>
        ))}
      </div>
    );
  };

  const renderAnswerInput = (question: AttemptQuestionDto) => {
    const { questionType, options, questionId } = question;

    switch (questionType) {
      case QuestionType.SingleChoice:
      case QuestionType.TrueFalse:
        return (
          <Radio.Group
            value={currentAnswer?.selectedAnswerId}
            onChange={(e) => updateAnswer(questionId, { selectedAnswerId: e.target.value })}
            style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            {options.sort((a, b) => a.orderIndex - b.orderIndex).map((opt) => (
              <Radio key={opt.id} value={opt.id} style={{ fontSize: 15 }}>{opt.text}</Radio>
            ))}
          </Radio.Group>
        );

      case QuestionType.MultipleChoice:
        return (
          <Checkbox.Group
            value={currentAnswer?.selectedAnswerIds || []}
            onChange={(checkedValues) => updateAnswer(questionId, { selectedAnswerIds: checkedValues as string[] })}
            style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            {options.sort((a, b) => a.orderIndex - b.orderIndex).map((opt) => (
              <Checkbox key={opt.id} value={opt.id} style={{ fontSize: 15 }}>{opt.text}</Checkbox>
            ))}
          </Checkbox.Group>
        );

      case QuestionType.Input: {
        const isLearning = attemptData?.mode === 'Learning';
        const hasExcel = question.media?.some((m) => m.mediaType === MediaType.ExcelTable);
        const canRunQuery = isLearning && hasExcel;
        const runResult = queryResults[questionId];
        const isRunning = !!runningQuery[questionId];

        return (
          <div>
            <Input.TextArea
              rows={4}
              placeholder="Type your SQL query or answer..."
              value={currentAnswer?.inputText || ''}
              onChange={(e) => updateAnswer(questionId, { inputText: e.target.value })}
              style={{ fontFamily: 'monospace', fontSize: 14 }}
            />

            {canRunQuery && (
              <div style={{ marginTop: 8 }}>
                <Button
                  type="default"
                  icon={<PlayCircleOutlined />}
                  loading={isRunning}
                  onClick={() => handleRunQuery(question)}
                  disabled={!currentAnswer?.inputText?.trim()}
                >
                  Run Query
                </Button>
                <Typography.Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                  Test your query against the tables above. Doesn't affect your final answer.
                </Typography.Text>
              </div>
            )}

            {runResult && (
              <Card
                size="small"
                style={{
                  marginTop: 12,
                  borderColor: runResult.success ? '#b7eb8f' : '#ffccc7',
                }}
                title={
                  <span style={{ fontSize: 13 }}>
                    {runResult.success ? '✓ Query Result' : '✗ Query Error'}
                    <Typography.Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>
                      ({runResult.elapsedMs}ms)
                    </Typography.Text>
                  </span>
                }
              >
                {runResult.success ? (
                  runResult.columns.length > 0 ? (
                    <>
                      <AntTable
                        size="small"
                        bordered
                        pagination={false}
                        scroll={{ x: 'max-content', y: 250 }}
                        dataSource={runResult.rows.map((row, idx) => {
                          const obj: Record<string, string | null> = { _key: String(idx) };
                          runResult.columns.forEach((col, ci) => { obj[col] = row[ci]; });
                          return obj;
                        })}
                        columns={runResult.columns.map((col) => ({
                          title: col,
                          dataIndex: col,
                          key: col,
                          ellipsis: true,
                          render: (v: string | null) =>
                            v === null ? <Typography.Text type="secondary">NULL</Typography.Text> : v,
                        }))}
                        rowKey="_key"
                      />
                      <Typography.Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                        {runResult.rows.length} row{runResult.rows.length === 1 ? '' : 's'}
                      </Typography.Text>
                    </>
                  ) : (
                    <Typography.Text type="secondary">
                      {runResult.rowsAffected} row{runResult.rowsAffected === 1 ? '' : 's'} affected
                    </Typography.Text>
                  )
                ) : (
                  <pre style={{ margin: 0, color: '#cf1322', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                    {runResult.errorMessage}
                  </pre>
                )}
              </Card>
            )}
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#fff' }}>
      <Sider
        width={220} theme="light"
        style={{
          borderRight: '1px solid #f0f0f0', padding: 16, position: 'fixed',
          height: '100vh', overflow: 'auto', left: 0, top: 0, zIndex: 10,
        }}
      >
        {attemptData.mode === 'Exam' && (
          <>
            <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
              Time Remaining
            </Typography.Text>
            {renderTimer()}
          </>
        )}
        <Typography.Text strong style={{ display: 'block', margin: attemptData.mode === 'Exam' ? '16px 0 12px' : '0 0 12px' }}>
          Questions
        </Typography.Text>
        {renderQuestionNav()}
        <div style={{ marginTop: 16, padding: '0 8px', fontSize: 12, color: '#999' }}>
          {Object.keys(answers).length}/{questions.length} answered
        </div>
      </Sider>

      <Content style={{ marginLeft: 220, padding: 32, maxWidth: 900 }}>
        <div style={{ marginBottom: 24 }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {currentQuestion.questionType} &middot; {currentQuestion.contentType}
          </Typography.Text>
          <Typography.Title level={4} style={{ marginBottom: 4, marginTop: 4 }}>
            Question {currentIndex + 1} of {questions.length}
          </Typography.Title>
          {currentQuestion.text && (
            <Typography.Paragraph style={{ fontSize: 16, whiteSpace: 'pre-wrap' }}>
              {currentQuestion.text}
            </Typography.Paragraph>
          )}
        </div>

        {renderMedia(currentQuestion)}
        {renderAnswerInput(currentQuestion)}

        <div
          style={{
            display: 'flex', justifyContent: 'space-between', marginTop: 32,
            paddingTop: 24, borderTop: '1px solid #f0f0f0',
          }}
        >
          <Button icon={<LeftOutlined />} disabled={currentIndex === 0} onClick={() => setCurrentIndex((i) => i - 1)}>
            Previous
          </Button>
          <div style={{ display: 'flex', gap: 12 }}>
            {currentIndex < questions.length - 1 && (
              <Button type="default" onClick={() => setCurrentIndex((i) => i + 1)}>
                Next <RightOutlined />
              </Button>
            )}
            <Popconfirm
              title="Submit Quiz"
              description="Are you sure? You cannot change answers after submission."
              onConfirm={handleSubmit} okText="Yes, Submit" cancelText="Cancel"
            >
              <Button type="primary" icon={<SendOutlined />} loading={submitting}>
                Submit Quiz
              </Button>
            </Popconfirm>
          </div>
        </div>
      </Content>
    </Layout>
  );
}
