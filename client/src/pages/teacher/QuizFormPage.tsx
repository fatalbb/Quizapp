import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Form,
  Input,
  InputNumber,
  Button,
  Space,
  Spin,
  Slider,
  Divider,
  Row,
  Col,
  Tag,
  Typography,
  Radio,
  DatePicker,
  Alert,
  Switch,
  message,
} from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { quizzesApi } from '../../api/quizzesApi';
import { categoriesApi } from '../../api/categoriesApi';
import type { CreateQuizRequest, UpdateQuizRequest } from '../../types/quiz';
import { QuizMode, ExamStartMode } from '../../types/enums';
import CategoryTreeSelect from '../../components/shared/CategoryTreeSelect';

const { Text } = Typography;

type QuestionCounts = {
  total: number;
  easy: number;
  medium: number;
  hard: number;
  byType: Record<string, number>;
  byDifficultyType: Record<string, Record<string, number>>;
};

interface TypeDistribution {
  multipleChoice: number;
  singleChoice: number;
  trueFalse: number;
  input: number;
}

// Component for the linked type sliders (auto-balances to 100%)
function TypeSliders({
  value,
  onChange,
}: {
  value?: TypeDistribution;
  onChange?: (val: TypeDistribution) => void;
}) {
  const mc = value?.multipleChoice ?? 25;
  const sc = value?.singleChoice ?? 25;
  const tf = value?.trueFalse ?? 25;
  const inp = value?.input ?? 25;

  const handleChange = (field: keyof TypeDistribution, newVal: number) => {
    const clamped = Math.min(100, Math.max(0, newVal));
    const remaining = 100 - clamped;
    const others = { multipleChoice: mc, singleChoice: sc, trueFalse: tf, input: inp };
    delete (others as any)[field];

    const otherKeys = Object.keys(others) as (keyof TypeDistribution)[];
    const otherTotal = otherKeys.reduce((s, k) => s + (others as any)[k], 0) || 1;

    const result: any = { multipleChoice: 0, singleChoice: 0, trueFalse: 0, input: 0 };
    result[field] = clamped;

    let allocated = 0;
    otherKeys.forEach((k, i) => {
      if (i === otherKeys.length - 1) {
        // Last bucket absorbs remainder so total = 100
        result[k] = Math.max(0, remaining - allocated);
      } else {
        const v = Math.round(remaining * ((others as any)[k] / otherTotal));
        result[k] = v;
        allocated += v;
      }
    });

    onChange?.(result);
  };

  const renderSlider = (
    label: string,
    color: string,
    tagColor: string,
    val: number,
    field: keyof TypeDistribution,
  ) => (
    <Row gutter={16} align="middle" style={{ marginBottom: 4 }}>
      <Col span={6}>
        <Text style={{ color, fontWeight: 600, fontSize: 12 }}>{label}</Text>
      </Col>
      <Col span={12}>
        <Slider
          min={0}
          max={100}
          value={val}
          onChange={(v) => handleChange(field, v)}
          trackStyle={{ backgroundColor: color }}
          handleStyle={{ borderColor: color }}
        />
      </Col>
      <Col span={6}>
        <Tag color={tagColor} style={{ fontSize: 13, padding: '1px 10px' }}>
          {val}%
        </Tag>
      </Col>
    </Row>
  );

  return (
    <div>
      {renderSlider('MultipleChoice', '#1677ff', 'blue', mc, 'multipleChoice')}
      {renderSlider('SingleChoice', '#52c41a', 'green', sc, 'singleChoice')}
      {renderSlider('TrueFalse', '#faad14', 'orange', tf, 'trueFalse')}
      {renderSlider('Input', '#722ed1', 'purple', inp, 'input')}
    </div>
  );
}

// Component for the linked difficulty sliders
function DifficultySliders({
  value,
  onChange,
}: {
  value?: { easy: number; medium: number; hard: number };
  onChange?: (val: { easy: number; medium: number; hard: number }) => void;
}) {
  const easy = value?.easy ?? 34;
  const medium = value?.medium ?? 33;
  const hard = value?.hard ?? 33;

  const handleChange = (field: 'easy' | 'medium' | 'hard', newVal: number) => {
    const clamped = Math.min(100, Math.max(0, newVal));
    const remaining = 100 - clamped;

    let result = { easy, medium, hard };

    if (field === 'easy') {
      // Distribute remaining between medium and hard proportionally
      const otherTotal = medium + hard || 1;
      result = {
        easy: clamped,
        medium: Math.round(remaining * (medium / otherTotal)),
        hard: 0,
      };
      result.hard = 100 - result.easy - result.medium;
    } else if (field === 'medium') {
      const otherTotal = easy + hard || 1;
      result = {
        easy: Math.round(remaining * (easy / otherTotal)),
        medium: clamped,
        hard: 0,
      };
      result.hard = 100 - result.easy - result.medium;
    } else {
      const otherTotal = easy + medium || 1;
      result = {
        easy: Math.round(remaining * (easy / otherTotal)),
        medium: 0,
        hard: clamped,
      };
      result.medium = 100 - result.easy - result.hard;
    }

    // Clamp all to 0-100
    result.easy = Math.max(0, result.easy);
    result.medium = Math.max(0, result.medium);
    result.hard = Math.max(0, result.hard);

    onChange?.(result);
  };

  return (
    <div>
      <Row gutter={16} align="middle" style={{ marginBottom: 4 }}>
        <Col span={4}>
          <Text style={{ color: '#52c41a', fontWeight: 600, fontSize: 13 }}>
            Easy
          </Text>
        </Col>
        <Col span={14}>
          <Slider
            min={0}
            max={100}
            value={easy}
            onChange={(val) => handleChange('easy', val)}
            trackStyle={{ backgroundColor: '#52c41a' }}
            handleStyle={{ borderColor: '#52c41a' }}
          />
        </Col>
        <Col span={6}>
          <Tag color="green" style={{ fontSize: 14, padding: '2px 12px' }}>
            {easy}%
          </Tag>
        </Col>
      </Row>
      <Row gutter={16} align="middle" style={{ marginBottom: 4 }}>
        <Col span={4}>
          <Text style={{ color: '#faad14', fontWeight: 600, fontSize: 13 }}>
            Medium
          </Text>
        </Col>
        <Col span={14}>
          <Slider
            min={0}
            max={100}
            value={medium}
            onChange={(val) => handleChange('medium', val)}
            trackStyle={{ backgroundColor: '#faad14' }}
            handleStyle={{ borderColor: '#faad14' }}
          />
        </Col>
        <Col span={6}>
          <Tag color="gold" style={{ fontSize: 14, padding: '2px 12px' }}>
            {medium}%
          </Tag>
        </Col>
      </Row>
      <Row gutter={16} align="middle">
        <Col span={4}>
          <Text style={{ color: '#ff4d4f', fontWeight: 600, fontSize: 13 }}>
            Hard
          </Text>
        </Col>
        <Col span={14}>
          <Slider
            min={0}
            max={100}
            value={hard}
            onChange={(val) => handleChange('hard', val)}
            trackStyle={{ backgroundColor: '#ff4d4f' }}
            handleStyle={{ borderColor: '#ff4d4f' }}
          />
        </Col>
        <Col span={6}>
          <Tag color="red" style={{ fontSize: 14, padding: '2px 12px' }}>
            {hard}%
          </Tag>
        </Col>
      </Row>
    </div>
  );
}

export default function QuizFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, QuestionCounts>>({});
  const watchedCategories = Form.useWatch('categories', form);
  const watchedMode = Form.useWatch('mode', form);
  const watchedStartMode = Form.useWatch('startMode', form);
  const watchedAllowReevaluation = Form.useWatch('allowReevaluation', form);
  const watchedAutoReevaluationQuota = Form.useWatch('autoReevaluationQuota', form);

  const fetchCategoryCounts = useCallback(async (categoryId: string) => {
    try {
      const res = await categoriesApi.getQuestionCounts(categoryId);
      setCategoryCounts((prev) => ({ ...prev, [categoryId]: res.data }));
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    if (id) {
      setLoading(true);
      quizzesApi
        .getQuizById(id)
        .then((res) => {
          const q = res.data;
          form.setFieldsValue({
            title: q.title,
            description: q.description,
            timeLimitMinutes: q.timeLimitMinutes,
            passingScorePercentage: q.passingScorePercentage,
            mode: q.mode || QuizMode.Learning,
            maxAttempts: q.maxAttempts ?? 0,
            startMode: q.startMode ?? undefined,
            scheduledStartAt: q.scheduledStartAt ? dayjs(q.scheduledStartAt) : undefined,
            scheduledEndAt: q.scheduledEndAt ? dayjs(q.scheduledEndAt) : undefined,
            joinWindowMinutes: q.joinWindowMinutes ?? 5,
            allowFeedback: q.allowFeedback ?? true,
            allowReevaluation: q.allowReevaluation ?? false,
            autoReevaluationQuota: q.autoReevaluationQuota ?? true,
            maxReevaluationsPerStudent: q.maxReevaluationsPerStudent ?? 1,
            categories: q.categories.map((c) => ({
              categoryId: c.categoryId,
              questionCount: c.questionCount,
              difficulty: {
                easy: c.easyPercentage,
                medium: c.mediumPercentage,
                hard: c.hardPercentage,
              },
              type: {
                multipleChoice: c.multipleChoicePercentage ?? 25,
                singleChoice: c.singleChoicePercentage ?? 25,
                trueFalse: c.trueFalsePercentage ?? 25,
                input: c.inputPercentage ?? 25,
              },
            })),
          });
          q.categories.forEach((c) => fetchCategoryCounts(c.categoryId));
        })
        .catch(() => message.error('Failed to load quiz'))
        .finally(() => setLoading(false));
    } else {
      form.setFieldsValue({
        passingScorePercentage: 50,
        mode: QuizMode.Learning,
        maxAttempts: 0,
        joinWindowMinutes: 5,
        allowFeedback: true,
        allowReevaluation: false,
        autoReevaluationQuota: true,
        maxReevaluationsPerStudent: 1,
        categories: [
          {
            categoryId: undefined,
            questionCount: 5,
            difficulty: { easy: 34, medium: 33, hard: 33 },
            type: { multipleChoice: 25, singleChoice: 25, trueFalse: 25, input: 25 },
          },
        ],
      });
    }
  }, [id, form, fetchCategoryCounts]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      setSaving(true);
      const payload: CreateQuizRequest = {
        title: values.title,
        description: values.description,
        timeLimitMinutes: values.timeLimitMinutes,
        passingScorePercentage: values.passingScorePercentage,
        categories: values.categories.map(
          (cat: {
            categoryId: string;
            questionCount: number;
            difficulty: { easy: number; medium: number; hard: number };
            type?: TypeDistribution;
          }) => ({
            categoryId: cat.categoryId,
            questionCount: cat.questionCount,
            easyPercentage: cat.difficulty?.easy ?? 34,
            mediumPercentage: cat.difficulty?.medium ?? 33,
            hardPercentage: cat.difficulty?.hard ?? 33,
            multipleChoicePercentage: cat.type?.multipleChoice ?? 25,
            singleChoicePercentage: cat.type?.singleChoice ?? 25,
            trueFalsePercentage: cat.type?.trueFalse ?? 25,
            inputPercentage: cat.type?.input ?? 25,
          }),
        ),
        mode: values.mode || QuizMode.Learning,
        maxAttempts: values.maxAttempts ?? 0,
        startMode: values.mode === QuizMode.Exam ? values.startMode : null,
        scheduledStartAt:
          values.startMode === ExamStartMode.Scheduled && values.scheduledStartAt
            ? values.scheduledStartAt.toISOString()
            : null,
        scheduledEndAt:
          values.startMode === ExamStartMode.Scheduled && values.scheduledEndAt
            ? values.scheduledEndAt.toISOString()
            : null,
        joinWindowMinutes: values.joinWindowMinutes ?? 5,
        allowFeedback: values.allowFeedback ?? true,
        allowReevaluation: values.allowReevaluation ?? false,
        autoReevaluationQuota: values.autoReevaluationQuota ?? true,
        maxReevaluationsPerStudent: values.maxReevaluationsPerStudent ?? 1,
      };

      if (isEdit && id) {
        const updatePayload: UpdateQuizRequest = { id, ...payload };
        await quizzesApi.updateQuiz(id, updatePayload);
        message.success('Quiz updated');
      } else {
        await quizzesApi.createQuiz(payload);
        message.success('Quiz created');
      }
      navigate(-1);
    } catch {
      message.error('Failed to save quiz');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <Card title={isEdit ? 'Edit Quiz' : 'Create Quiz'}>
        <Form form={form} layout="vertical">
          <Form.Item
            name="title"
            label="Title"
            rules={[{ required: true, message: 'Please enter a title' }]}
          >
            <Input placeholder="Quiz title" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} placeholder="Optional description" />
          </Form.Item>

          <Space size="large" wrap>
            <Form.Item
              name="timeLimitMinutes"
              label="Time Limit (minutes)"
              rules={[{ required: true, message: 'Required' }]}
            >
              <InputNumber min={1} style={{ width: 160 }} />
            </Form.Item>

            <Form.Item
              name="passingScorePercentage"
              label="Passing Score (%)"
              rules={[{ required: true, message: 'Required' }]}
            >
              <InputNumber min={1} max={100} style={{ width: 160 }} />
            </Form.Item>
          </Space>

          <Divider>Quiz Mode</Divider>

          <Space size="large" wrap align="start">
            <Form.Item
              name="mode"
              label="Mode"
              rules={[{ required: true, message: 'Required' }]}
            >
              <Radio.Group>
                <Radio.Button value={QuizMode.Learning}>Learning</Radio.Button>
                <Radio.Button value={QuizMode.Exam}>Exam</Radio.Button>
              </Radio.Group>
            </Form.Item>

            <Form.Item
              name="maxAttempts"
              label="Max Attempts (0 = unlimited)"
              rules={[{ required: true, message: 'Required' }]}
            >
              <InputNumber min={0} style={{ width: 200 }} />
            </Form.Item>
          </Space>

          {watchedMode === QuizMode.Exam && (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message="Exam Settings"
              description={
                <div style={{ marginTop: 12 }}>
                  <Form.Item
                    name="startMode"
                    label="Start Mode"
                    rules={[
                      {
                        required: true,
                        message: 'Start mode is required for exams',
                      },
                    ]}
                  >
                    <Radio.Group>
                      <Radio.Button value={ExamStartMode.Manual}>Manual</Radio.Button>
                      <Radio.Button value={ExamStartMode.Scheduled}>
                        Scheduled
                      </Radio.Button>
                    </Radio.Group>
                  </Form.Item>

                  {watchedStartMode === ExamStartMode.Manual && (
                    <Form.Item
                      name="joinWindowMinutes"
                      label="Student Join Window (minutes)"
                      rules={[{ required: true, message: 'Required' }]}
                    >
                      <InputNumber min={1} style={{ width: 200 }} />
                    </Form.Item>
                  )}

                  {watchedStartMode === ExamStartMode.Scheduled && (
                    <Space size="large" wrap>
                      <Form.Item
                        name="scheduledStartAt"
                        label="Scheduled Start"
                        rules={[{ required: true, message: 'Required' }]}
                      >
                        <DatePicker showTime style={{ width: 220 }} />
                      </Form.Item>
                      <Form.Item
                        name="scheduledEndAt"
                        label="Scheduled End"
                        rules={[{ required: true, message: 'Required' }]}
                      >
                        <DatePicker showTime style={{ width: 220 }} />
                      </Form.Item>
                    </Space>
                  )}
                </div>
              }
            />
          )}

          <Divider>Feedback & Re-evaluation</Divider>
          <Space size="large" wrap align="start">
            <Form.Item
              name="allowFeedback"
              label="Allow students to view feedback"
              valuePropName="checked"
              tooltip="Students can click 'Get Feedback' on each question after submitting to see why their answer was wrong and what the correct answer is."
            >
              <Switch />
            </Form.Item>

            <Form.Item
              name="allowReevaluation"
              label="Allow re-evaluation"
              valuePropName="checked"
              tooltip="Students can challenge a grading on Input questions by providing a justification. The LLM re-grades with their argument."
            >
              <Switch />
            </Form.Item>

            {watchedAllowReevaluation && (
              <Form.Item
                name="autoReevaluationQuota"
                label="Auto quota (= wrong answers)"
                valuePropName="checked"
                tooltip="When ON, each student can re-evaluate up to as many questions as they got wrong (min 0, max = total questions). Turn OFF to set a fixed limit."
              >
                <Switch />
              </Form.Item>
            )}

            {watchedAllowReevaluation && !watchedAutoReevaluationQuota && (
              <Form.Item
                name="maxReevaluationsPerStudent"
                label="Max re-evaluations per student"
                tooltip="0 = unlimited. Teachers always have unlimited re-evaluations regardless of this setting."
                rules={[{ required: true, message: 'Required' }]}
              >
                <InputNumber min={0} style={{ width: 200 }} />
              </Form.Item>
            )}
          </Space>

          <Divider>Categories & Difficulty Distribution</Divider>

          <Form.List name="categories">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Card
                    key={key}
                    size="small"
                    style={{ marginBottom: 12 }}
                    extra={
                      fields.length > 1 ? (
                        <MinusCircleOutlined
                          onClick={() => remove(name)}
                          style={{ color: '#ff4d4f' }}
                        />
                      ) : null
                    }
                  >
                    <Row gutter={16} align="middle">
                      <Col xs={24} sm={12}>
                        <Form.Item
                          {...restField}
                          name={[name, 'categoryId']}
                          label="Category"
                          rules={[
                            { required: true, message: 'Select a category' },
                          ]}
                          style={{ marginBottom: 8 }}
                        >
                          <CategoryTreeSelect
                            placeholder="Select category"
                            onChange={(val: string) => {
                              if (val) fetchCategoryCounts(val);
                            }}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Form.Item
                          {...restField}
                          name={[name, 'questionCount']}
                          label="Total Questions"
                          rules={[{ required: true, message: 'Required' }]}
                          style={{ marginBottom: 8 }}
                        >
                          <InputNumber min={1} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                    </Row>

                    {/* Available question counts */}
                    {(() => {
                      const catId = watchedCategories?.[name]?.categoryId;
                      const counts = catId ? categoryCounts[catId] : null;
                      if (!counts) return null;
                      return (
                        <div style={{ marginBottom: 12 }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Available:{' '}
                          </Text>
                          <Tag color="green">Easy: {counts.easy}</Tag>
                          <Tag color="gold">Medium: {counts.medium}</Tag>
                          <Tag color="red">Hard: {counts.hard}</Tag>
                          <Tag>Total: {counts.total}</Tag>
                        </div>
                      );
                    })()}

                    {/* Difficulty sliders */}
                    <Text
                      type="secondary"
                      style={{ fontSize: 12, marginBottom: 8, display: 'block' }}
                    >
                      Difficulty Distribution (auto-balances to 100%)
                    </Text>
                    <Form.Item
                      {...restField}
                      name={[name, 'difficulty']}
                      style={{ marginBottom: 12 }}
                    >
                      <DifficultySliders />
                    </Form.Item>

                    {/* Type sliders */}
                    <Text
                      type="secondary"
                      style={{ fontSize: 12, marginBottom: 8, display: 'block' }}
                    >
                      Question Type Distribution (auto-balances to 100%)
                    </Text>
                    <Form.Item
                      {...restField}
                      name={[name, 'type']}
                      style={{ marginBottom: 0 }}
                    >
                      <TypeSliders />
                    </Form.Item>

                    {/* Needed-vs-available approximation */}
                    {(() => {
                      const cat = watchedCategories?.[name];
                      const catId = cat?.categoryId;
                      const counts = catId ? categoryCounts[catId] : null;
                      if (!counts || !counts.byDifficultyType) return null;

                      const total = cat?.questionCount ?? 0;
                      const d = cat?.difficulty ?? { easy: 34, medium: 33, hard: 33 };
                      const t = cat?.type ?? { multipleChoice: 25, singleChoice: 25, trueFalse: 25, input: 25 };
                      if (total <= 0) return null;

                      const diffMap = { Easy: d.easy, Medium: d.medium, Hard: d.hard };
                      const typeMap = {
                        MultipleChoice: t.multipleChoice,
                        SingleChoice: t.singleChoice,
                        TrueFalse: t.trueFalse,
                        Input: t.input,
                      };

                      const rows: Array<{ key: string; label: string; needed: number; available: number }> = [];
                      let anyShort = false;
                      Object.entries(diffMap).forEach(([diff, dPct]) => {
                        if (dPct <= 0) return;
                        const diffNeeded = Math.round((total * dPct) / 100);
                        Object.entries(typeMap).forEach(([type, tPct]) => {
                          if (tPct <= 0) return;
                          const needed = Math.round((diffNeeded * tPct) / 100);
                          if (needed <= 0) return;
                          const available = counts.byDifficultyType[diff]?.[type] ?? 0;
                          if (available < needed) anyShort = true;
                          rows.push({
                            key: `${diff}-${type}`,
                            label: `${diff} ${type}`,
                            needed,
                            available,
                          });
                        });
                      });

                      if (rows.length === 0) return null;

                      return (
                        <div
                          style={{
                            marginTop: 12,
                            padding: 8,
                            background: anyShort ? '#fff7e6' : '#f6ffed',
                            border: `1px solid ${anyShort ? '#ffd591' : '#b7eb8f'}`,
                            borderRadius: 6,
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                            Approximate question pool {anyShort && '⚠ Some buckets have fewer than needed'}
                          </Text>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {rows.map((r) => {
                              const short = r.available < r.needed;
                              return (
                                <Tag
                                  key={r.key}
                                  color={short ? 'warning' : 'default'}
                                  style={{ fontSize: 12, margin: 0 }}
                                >
                                  {r.label}: {r.needed} needed / {r.available} available
                                </Tag>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </Card>
                ))}
                <Form.Item>
                  <Button
                    type="dashed"
                    onClick={() =>
                      add({
                        categoryId: undefined,
                        questionCount: 5,
                        difficulty: { easy: 34, medium: 33, hard: 33 },
                        type: { multipleChoice: 25, singleChoice: 25, trueFalse: 25, input: 25 },
                      })
                    }
                    block
                    icon={<PlusOutlined />}
                  >
                    Add Category
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>

          <Divider />

          <Form.Item>
            <Space>
              <Button type="primary" onClick={handleSubmit} loading={saving}>
                {isEdit ? 'Update Quiz' : 'Create Quiz'}
              </Button>
              <Button onClick={() => navigate(-1)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
