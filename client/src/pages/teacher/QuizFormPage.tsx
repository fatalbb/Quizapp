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
  Divider,
  Row,
  Col,
  Tag,
  Typography,
  message,
} from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { quizzesApi } from '../../api/quizzesApi';
import { categoriesApi } from '../../api/categoriesApi';
import type { CreateQuizRequest, UpdateQuizRequest } from '../../types/quiz';
import CategoryTreeSelect from '../../components/shared/CategoryTreeSelect';

const { Text } = Typography;

type QuestionCounts = { total: number; easy: number; medium: number; hard: number };

export default function QuizFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, QuestionCounts>>({});
  // Watch categories to trigger re-renders when they change
  const watchedCategories = Form.useWatch('categories', form);

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
            categories: q.categories.map((c) => ({
              categoryId: c.categoryId,
              questionCount: c.questionCount,
              easyPercentage: c.easyPercentage,
              mediumPercentage: c.mediumPercentage,
              hardPercentage: c.hardPercentage,
            })),
          });
          // Fetch question counts for loaded categories
          q.categories.forEach((c) => fetchCategoryCounts(c.categoryId));
        })
        .catch(() => message.error('Failed to load quiz'))
        .finally(() => setLoading(false));
    } else {
      form.setFieldsValue({
        passingScorePercentage: 50,
        categories: [
          {
            categoryId: undefined,
            questionCount: 5,
            easyPercentage: 34,
            mediumPercentage: 33,
            hardPercentage: 33,
          },
        ],
      });
    }
  }, [id, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // Validate percentages sum to 100
      for (let i = 0; i < values.categories.length; i++) {
        const cat = values.categories[i];
        const sum =
          (cat.easyPercentage || 0) +
          (cat.mediumPercentage || 0) +
          (cat.hardPercentage || 0);
        if (sum !== 100) {
          message.error(
            `Category row ${i + 1}: difficulty percentages must sum to 100 (currently ${sum})`,
          );
          return;
        }
      }

      setSaving(true);
      const payload: CreateQuizRequest = {
        title: values.title,
        description: values.description,
        timeLimitMinutes: values.timeLimitMinutes,
        passingScorePercentage: values.passingScorePercentage,
        categories: values.categories,
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
                          <InputNumber
                            min={1}
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                    {(() => {
                      const catId = watchedCategories?.[name]?.categoryId;
                      const counts = catId ? categoryCounts[catId] : null;
                      if (!counts) return null;
                      return (
                        <div style={{ marginBottom: 8 }}>
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
                    <Row gutter={16}>
                      <Col span={24}>
                        <Text
                          type="secondary"
                          style={{ fontSize: 12, marginBottom: 4, display: 'block' }}
                        >
                          Difficulty Distribution (must sum to 100%)
                        </Text>
                      </Col>
                      <Col xs={8}>
                        <Form.Item
                          {...restField}
                          name={[name, 'easyPercentage']}
                          label={
                            <Text style={{ color: '#52c41a', fontSize: 12 }}>
                              Easy %
                            </Text>
                          }
                          rules={[{ required: true, message: 'Required' }]}
                          style={{ marginBottom: 0 }}
                        >
                          <InputNumber
                            min={0}
                            max={100}
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={8}>
                        <Form.Item
                          {...restField}
                          name={[name, 'mediumPercentage']}
                          label={
                            <Text style={{ color: '#faad14', fontSize: 12 }}>
                              Medium %
                            </Text>
                          }
                          rules={[{ required: true, message: 'Required' }]}
                          style={{ marginBottom: 0 }}
                        >
                          <InputNumber
                            min={0}
                            max={100}
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={8}>
                        <Form.Item
                          {...restField}
                          name={[name, 'hardPercentage']}
                          label={
                            <Text style={{ color: '#ff4d4f', fontSize: 12 }}>
                              Hard %
                            </Text>
                          }
                          rules={[{ required: true, message: 'Required' }]}
                          style={{ marginBottom: 0 }}
                        >
                          <InputNumber
                            min={0}
                            max={100}
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Card>
                ))}
                <Form.Item>
                  <Button
                    type="dashed"
                    onClick={() =>
                      add({
                        categoryId: undefined,
                        questionCount: 5,
                        easyPercentage: 34,
                        mediumPercentage: 33,
                        hardPercentage: 33,
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
