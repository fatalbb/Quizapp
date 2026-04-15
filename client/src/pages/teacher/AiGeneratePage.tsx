import { useState } from 'react';
import {
  Card,
  Form,
  Select,
  InputNumber,
  Button,
  Checkbox,
  Input,
  Space,
  List,
  Tag,
  Spin,
  message,
  Divider,
  Typography,
  Segmented,
  Upload,
} from 'antd';
import {
  CheckOutlined,
  ThunderboltOutlined,
  InboxOutlined,
  FileExcelOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { questionsApi } from '../../api/questionsApi';
import type {
  GenerateQuestionsRequest,
  GeneratedQuestionDto,
  SaveGeneratedQuestionsRequest,
} from '../../types/question';
import { QuestionType, DifficultyLevel } from '../../types/enums';
import CategoryTreeSelect from '../../components/shared/CategoryTreeSelect';

const { Text } = Typography;
const { Dragger } = Upload;

type GenerationMode = 'Knowledge' | 'Table Schema';

interface EditableQuestion extends GeneratedQuestionDto {
  selected: boolean;
}

export default function AiGeneratePage() {
  const [form] = Form.useForm();
  const [mode, setMode] = useState<GenerationMode>('Knowledge');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [questions, setQuestions] = useState<EditableQuestion[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [excelFileInfo, setExcelFileInfo] = useState<{
    excelFilePath: string;
    excelFileName: string;
    excelStoredFileName: string;
  } | null>(null);

  const handleGenerate = async () => {
    try {
      const values = await form.validateFields();

      if (mode === 'Table Schema' && !uploadedFile) {
        message.warning('Please upload an Excel file');
        return;
      }

      setGenerating(true);

      let generatedQuestions: GeneratedQuestionDto[];

      if (mode === 'Knowledge') {
        const payload: GenerateQuestionsRequest = {
          categoryId: values.categoryId,
          questionType: values.questionType,
          difficultyLevel: values.difficultyLevel,
          count: values.count,
        };
        const res = await questionsApi.generateQuestions(payload);
        generatedQuestions = res.data;
        setExcelFileInfo(null);
      } else {
        const res = await questionsApi.generateQuestionsFromTables(
          uploadedFile!,
          values.categoryId,
          values.questionType,
          values.difficultyLevel,
          values.count,
        );
        generatedQuestions = res.data.questions;
        setExcelFileInfo({
          excelFilePath: res.data.excelFilePath,
          excelFileName: res.data.excelFileName,
          excelStoredFileName: res.data.excelStoredFileName,
        });
      }

      setQuestions(
        generatedQuestions.map((q: GeneratedQuestionDto) => ({ ...q, selected: true })),
      );
      message.success(`Generated ${generatedQuestions.length} questions`);
    } catch {
      message.error('Failed to generate questions');
    } finally {
      setGenerating(false);
    }
  };

  const toggleSelect = (index: number) => {
    setQuestions((prev: EditableQuestion[]) =>
      prev.map((q: EditableQuestion, i: number) =>
        i === index ? { ...q, selected: !q.selected } : q,
      ),
    );
  };

  const updateQuestionText = (index: number, text: string) => {
    setQuestions((prev: EditableQuestion[]) =>
      prev.map((q: EditableQuestion, i: number) =>
        i === index ? { ...q, text } : q,
      ),
    );
  };

  const handleSave = async () => {
    const selected = questions.filter((q: EditableQuestion) => q.selected);
    if (selected.length === 0) {
      message.warning('Please select at least one question to save');
      return;
    }

    try {
      setSaving(true);
      const values = form.getFieldsValue();
      const payload: SaveGeneratedQuestionsRequest = {
        categoryId: values.categoryId,
        questionType: values.questionType,
        questions: selected.map(
          ({ selected: _sel, ...rest }: EditableQuestion) => rest,
        ),
        ...(excelFileInfo || {}),
      };
      await questionsApi.saveGeneratedQuestions(payload);
      message.success(`Saved ${selected.length} questions`);
      setQuestions([]);
      setExcelFileInfo(null);
    } catch {
      message.error('Failed to save questions');
    } finally {
      setSaving(false);
    }
  };

  const handleModeChange = (value: string | number) => {
    setMode(value as GenerationMode);
    setUploadedFile(null);
    setFileList([]);
  };

  const selectedCount = questions.filter(
    (q: EditableQuestion) => q.selected,
  ).length;

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        <Segmented
          options={['Knowledge', 'Table Schema']}
          value={mode}
          onChange={handleModeChange}
          size="large"
        />
      </div>

      <Card
        title={
          <Space>
            <ThunderboltOutlined />
            AI Question Generator
            <Tag color={mode === 'Knowledge' ? 'blue' : 'green'}>
              {mode}
            </Tag>
          </Space>
        }
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            count: 5,
            difficultyLevel: DifficultyLevel.Medium,
          }}
        >
          <Space size="large" wrap style={{ width: '100%' }}>
            <Form.Item
              name="categoryId"
              label="Category"
              rules={[{ required: true, message: 'Select a category' }]}
              style={{ minWidth: 220 }}
            >
              <CategoryTreeSelect />
            </Form.Item>

            <Form.Item
              name="questionType"
              label="Question Type"
              rules={[{ required: true, message: 'Select type' }]}
            >
              <Select
                style={{ width: 180 }}
                placeholder="Select type"
                options={Object.values(QuestionType).map((t) => ({
                  label: t,
                  value: t,
                }))}
              />
            </Form.Item>

            <Form.Item
              name="difficultyLevel"
              label="Difficulty"
              rules={[{ required: true }]}
            >
              <Select
                style={{ width: 140 }}
                options={Object.values(DifficultyLevel).map((d) => ({
                  label: d,
                  value: d,
                }))}
              />
            </Form.Item>

            <Form.Item
              name="count"
              label="Count"
              rules={[{ required: true }]}
            >
              <InputNumber min={1} max={20} style={{ width: 100 }} />
            </Form.Item>
          </Space>

          {mode === 'Table Schema' && (
            <div style={{ marginBottom: 24 }}>
              {!uploadedFile ? (
                <Dragger
                  accept=".xlsx,.xls"
                  fileList={fileList}
                  beforeUpload={(file) => {
                    setUploadedFile(file);
                    setFileList([
                      {
                        uid: '-1',
                        name: file.name,
                        status: 'done',
                      },
                    ]);
                    return false;
                  }}
                  onRemove={() => {
                    setUploadedFile(null);
                    setFileList([]);
                  }}
                  maxCount={1}
                >
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined />
                  </p>
                  <p className="ant-upload-text">
                    Click or drag an Excel file to this area
                  </p>
                  <p className="ant-upload-hint">
                    Supports .xlsx and .xls files containing table schemas
                  </p>
                </Dragger>
              ) : (
                <Card
                  size="small"
                  style={{ background: '#f6ffed', borderColor: '#b7eb8f' }}
                >
                  <Space>
                    <FileExcelOutlined style={{ color: '#52c41a', fontSize: 20 }} />
                    <Text strong>{uploadedFile.name}</Text>
                    <CheckOutlined style={{ color: '#52c41a' }} />
                    <Button
                      type="link"
                      size="small"
                      danger
                      onClick={() => {
                        setUploadedFile(null);
                        setFileList([]);
                      }}
                    >
                      Remove
                    </Button>
                  </Space>
                </Card>
              )}
            </div>
          )}

          <Button
            type="primary"
            onClick={handleGenerate}
            loading={generating}
            icon={<ThunderboltOutlined />}
            size="large"
          >
            Generate Questions
          </Button>
        </Form>
      </Card>

      {generating && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" tip="Generating questions with AI..." />
        </div>
      )}

      {questions.length > 0 && (
        <>
          <Divider />

          <List
            dataSource={questions}
            renderItem={(item: EditableQuestion, index: number) => (
              <Card
                key={index}
                style={{
                  marginBottom: 16,
                  borderColor: item.selected ? '#1890ff' : undefined,
                }}
              >
                <Space
                  direction="vertical"
                  style={{ width: '100%' }}
                  size="middle"
                >
                  <Space align="start" style={{ width: '100%' }}>
                    <Checkbox
                      checked={item.selected}
                      onChange={() => toggleSelect(index)}
                      style={{ marginTop: 4 }}
                    />
                    <div style={{ flex: 1 }}>
                      <Input.TextArea
                        value={item.text}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                          updateQuestionText(index, e.target.value)
                        }
                        autoSize={{ minRows: 1, maxRows: 4 }}
                        style={{ fontWeight: 500, marginBottom: 8 }}
                      />
                      <Space wrap>
                        {item.answers.map(
                          (
                            ans: { text: string; isCorrect: boolean },
                            ai: number,
                          ) => (
                            <Tag
                              key={ai}
                              color={ans.isCorrect ? 'success' : 'default'}
                              icon={
                                ans.isCorrect ? <CheckOutlined /> : undefined
                              }
                            >
                              {ans.text}
                            </Tag>
                          ),
                        )}
                      </Space>
                    </div>
                  </Space>
                </Space>
              </Card>
            )}
          />

          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <Space>
              <Text type="secondary">
                {selectedCount} of {questions.length} selected
              </Text>
              <Button
                type="primary"
                size="large"
                onClick={handleSave}
                loading={saving}
                disabled={selectedCount === 0}
              >
                Save Selected Questions
              </Button>
            </Space>
          </div>
        </>
      )}
    </div>
  );
}
