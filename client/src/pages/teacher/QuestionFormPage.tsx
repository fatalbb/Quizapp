import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Switch,
  Space,
  Upload,
  Image,
  Spin,
  Popconfirm,
  message,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  MinusCircleOutlined,
  UploadOutlined,
  DeleteOutlined,
  PictureOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd';
import { questionsApi } from '../../api/questionsApi';
import type {
  QuestionDetailDto,
  CreateQuestionRequest,
  CreateAnswerDto,
  MediaDto,
} from '../../types/question';
import {
  QuestionType,
  QuestionContentType,
  DifficultyLevel,
  MediaType,
} from '../../types/enums';
import CategoryTreeSelect from '../../components/shared/CategoryTreeSelect';

const CONTENT_TYPE_OPTIONS = [
  { label: 'Text', value: QuestionContentType.TextOnly },
  { label: 'Image', value: QuestionContentType.TextAndPicture },
];

export default function QuestionFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [, setQuestion] = useState<QuestionDetailDto | null>(null);
  const [media, setMedia] = useState<MediaDto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingFileList, setPendingFileList] = useState<UploadFile[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const questionType = Form.useWatch('questionType', form);
  const [selectedContentType, setSelectedContentType] = useState<string>(QuestionContentType.TextOnly);

  const showImageUpload = selectedContentType === QuestionContentType.TextAndPicture;

  useEffect(() => {
    if (id) {
      setLoading(true);
      questionsApi
        .getQuestionById(id)
        .then((res) => {
          const q = res.data;
          setQuestion(q);
          setMedia(q.media || []);
          setSelectedContentType(q.contentType);
          form.setFieldsValue({
            text: q.text,
            questionType: q.questionType,
            contentType: q.contentType,
            difficultyLevel: q.difficultyLevel,
            categoryId: q.categoryId,
            answers: q.answers
              .sort((a, b) => a.orderIndex - b.orderIndex)
              .map((a) => ({ text: a.text, isCorrect: a.isCorrect })),
          });
        })
        .catch(() => message.error('Failed to load question'))
        .finally(() => setLoading(false));
    } else {
      form.setFieldsValue({
        questionType: QuestionType.SingleChoice,
        contentType: QuestionContentType.TextOnly,
        difficultyLevel: DifficultyLevel.Medium,
        answers: [
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
        ],
      });
    }
  }, [id, form]);

  useEffect(() => {
    if (questionType === QuestionType.TrueFalse) {
      form.setFieldsValue({
        answers: [
          { text: 'True', isCorrect: true },
          { text: 'False', isCorrect: false },
        ],
      });
    }
  }, [questionType, form]);

  // Clear pending file when switching away from Image
  useEffect(() => {
    if (!showImageUpload) {
      setPendingFile(null);
      setPendingFileList([]);
      setPreviewUrl(null);
    }
  }, [showImageUpload]);

  const handleSingleChoiceToggle = (index: number) => {
    const answers: CreateAnswerDto[] = form.getFieldValue('answers');
    const updated = answers.map((a, i) => ({
      ...a,
      isCorrect: i === index,
    }));
    form.setFieldsValue({ answers: updated });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const payload: CreateQuestionRequest = {
        text: values.text || null,
        questionType: values.questionType,
        contentType: values.contentType,
        difficultyLevel: values.difficultyLevel,
        categoryId: values.categoryId,
        answers: (values.answers || []).map((a: CreateAnswerDto) => ({
          text: a.text,
          isCorrect: a.isCorrect === true,
        })),
      };

      if (isEdit && id) {
        await questionsApi.updateQuestion(id, payload);
        message.success('Question updated');

        // Upload new pending image if any
        if (pendingFile) {
          await questionsApi.uploadQuestionMedia(id, pendingFile, MediaType.Image);
          setPendingFile(null);
          setPendingFileList([]);
          setPreviewUrl(null);
          message.success('Image uploaded');
        }

        // Reload question data
        const res = await questionsApi.getQuestionById(id);
        setMedia(res.data.media || []);
      } else {
        // Create question first
        const res = await questionsApi.createQuestion(payload);
        const newId = res.data.id;

        // Then upload image if selected
        if (pendingFile && newId) {
          await questionsApi.uploadQuestionMedia(newId, pendingFile, MediaType.Image);
        }

        message.success('Question created');
        navigate(`../questions/${newId}/edit`, { replace: true });
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.response?.data?.title || err?.message || 'Unknown error';
      message.error(`Failed to save question: ${detail}`);
      console.error('Save question error:', err?.response?.data || err);
    } finally {
      setSaving(false);
    }
  };

  const handleFileSelect = (file: File) => {
    setPendingFile(file);
    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setPendingFileList([
      {
        uid: '-1',
        name: file.name,
        status: 'done',
        url,
      },
    ]);
    return false; // prevent auto upload
  };

  const handleRemovePendingFile = () => {
    setPendingFile(null);
    setPendingFileList([]);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleExistingMediaUpload = async (file: File) => {
    if (!id) return false;
    const isImage = file.type.startsWith('image/');
    const mediaType = isImage ? MediaType.Image : MediaType.ExcelTable;

    setUploading(true);
    try {
      await questionsApi.uploadQuestionMedia(id, file, mediaType);
      message.success('Media uploaded');
      const res = await questionsApi.getQuestionById(id);
      setMedia(res.data.media || []);
    } catch {
      message.error('Failed to upload media');
    } finally {
      setUploading(false);
    }
    return false;
  };

  const handleDeleteMedia = async (mediaId: string) => {
    if (!id) return;
    try {
      await questionsApi.deleteQuestionMedia(id, mediaId);
      message.success('Media deleted');
      setMedia((prev) => prev.filter((m) => m.id !== mediaId));
    } catch {
      message.error('Failed to delete media');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  const isTrueFalse = questionType === QuestionType.TrueFalse;

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <Card title={isEdit ? 'Edit Question' : 'Create Question'}>
        <Form
          form={form}
          layout="vertical"
          onValuesChange={(changed) => {
            if (changed.contentType !== undefined) {
              setSelectedContentType(changed.contentType);
            }
          }}
        >
          <Form.Item name="text" label="Question Text">
            <Input.TextArea rows={3} placeholder="Enter question text" />
          </Form.Item>

          <Space size="large" wrap style={{ width: '100%' }}>
            <Form.Item
              name="questionType"
              label="Question Type"
              rules={[{ required: true }]}
            >
              <Select style={{ width: 180 }}>
                {Object.values(QuestionType).map((t) => (
                  <Select.Option key={t} value={t}>
                    {t}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="contentType"
              label="Content Type"
              rules={[{ required: true }]}
            >
              <Select style={{ width: 180 }}>
                <Select.Option value={QuestionContentType.TextOnly}>Text</Select.Option>
                <Select.Option value={QuestionContentType.TextAndPicture}>Image</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="difficultyLevel"
              label="Difficulty Level"
              rules={[{ required: true }]}
            >
              <Select style={{ width: 140 }}>
                {Object.values(DifficultyLevel).map((d) => (
                  <Select.Option key={d} value={d}>
                    {d}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Space>

          <Form.Item
            name="categoryId"
            label="Category"
            rules={[{ required: true, message: 'Please select a category' }]}
          >
            <CategoryTreeSelect />
          </Form.Item>

          {/* Image Upload - shown when content type is Image */}
          {showImageUpload && (
            <>
              <Divider>Question Image</Divider>

              {/* Show existing media in edit mode */}
              {isEdit && media.length > 0 && (
                <Space wrap style={{ marginBottom: 16 }}>
                  {media.map((m) => (
                    <Card
                      key={m.id}
                      size="small"
                      style={{ width: 200 }}
                      actions={[
                        <Popconfirm
                          key="delete"
                          title="Delete this image?"
                          onConfirm={() => handleDeleteMedia(m.id)}
                        >
                          <DeleteOutlined style={{ color: '#ff4d4f' }} />
                        </Popconfirm>,
                      ]}
                    >
                      {m.mediaType === MediaType.Image ? (
                        <Image
                          src={m.url}
                          alt={m.fileName}
                          width="100%"
                          height={100}
                          style={{ objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 12 }}>
                          {m.fileName}
                        </div>
                      )}
                    </Card>
                  ))}
                </Space>
              )}

              {/* Preview of newly selected file (before save) */}
              {previewUrl && !isEdit && (
                <div style={{ marginBottom: 16 }}>
                  <Card
                    size="small"
                    style={{ width: 200, display: 'inline-block' }}
                    actions={[
                      <DeleteOutlined
                        key="remove"
                        style={{ color: '#ff4d4f' }}
                        onClick={handleRemovePendingFile}
                      />,
                    ]}
                  >
                    <Image
                      src={previewUrl}
                      alt="Preview"
                      width="100%"
                      height={100}
                      style={{ objectFit: 'cover' }}
                    />
                  </Card>
                </div>
              )}

              {/* Upload button */}
              {!isEdit ? (
                // Create mode: select file locally, upload after question is created
                !pendingFile && (
                  <Upload
                    beforeUpload={(file) => handleFileSelect(file)}
                    fileList={pendingFileList}
                    showUploadList={false}
                    accept="image/*"
                    maxCount={1}
                  >
                    <Button icon={<PictureOutlined />}>
                      Select Image
                    </Button>
                  </Upload>
                )
              ) : (
                // Edit mode: upload directly
                <Upload
                  beforeUpload={(file) => handleExistingMediaUpload(file)}
                  showUploadList={false}
                  accept="image/*,.xlsx,.xls"
                >
                  <Button icon={<UploadOutlined />} loading={uploading}>
                    Upload Image
                  </Button>
                </Upload>
              )}
            </>
          )}

          <Divider>Answers</Divider>

          <Form.List name="answers">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space
                    key={key}
                    align="baseline"
                    style={{ display: 'flex', marginBottom: 8 }}
                  >
                    <Form.Item
                      {...restField}
                      name={[name, 'text']}
                      rules={[
                        { required: true, message: 'Answer text required' },
                      ]}
                      style={{ flex: 1, minWidth: 300 }}
                    >
                      <Input
                        placeholder="Answer text"
                        disabled={isTrueFalse}
                      />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'isCorrect']}
                      valuePropName="checked"
                    >
                      <Switch
                        checkedChildren="Correct"
                        unCheckedChildren="Wrong"
                        disabled={isTrueFalse}
                        onChange={() => {
                          if (questionType === QuestionType.SingleChoice) {
                            handleSingleChoiceToggle(name);
                          }
                        }}
                      />
                    </Form.Item>
                    {!isTrueFalse && fields.length > 2 && (
                      <MinusCircleOutlined
                        onClick={() => remove(name)}
                        style={{ color: '#ff4d4f' }}
                      />
                    )}
                  </Space>
                ))}
                {!isTrueFalse && (
                  <Form.Item>
                    <Button
                      type="dashed"
                      onClick={() => add({ text: '', isCorrect: false })}
                      block
                      icon={<PlusOutlined />}
                    >
                      Add Answer
                    </Button>
                  </Form.Item>
                )}
              </>
            )}
          </Form.List>

          <Divider />

          <Form.Item>
            <Space>
              <Button type="primary" onClick={handleSubmit} loading={saving}>
                {isEdit ? 'Update Question' : 'Create Question'}
              </Button>
              <Button onClick={() => navigate(-1)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
