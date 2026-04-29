import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Table,
  Button,
  Select,
  Input,
  Space,
  Tag,
  Popconfirm,
  message,
  Row,
  Col,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { questionsApi } from '../../api/questionsApi';
import type { QuestionListDto } from '../../types/question';
import { QuestionType, DifficultyLevel } from '../../types/enums';
import { Typography } from 'antd';
import CategoryTreeSelect from '../../components/shared/CategoryTreeSelect';
import dayjs from 'dayjs';

const typeColorMap: Record<string, string> = {
  MultipleChoice: 'blue',
  SingleChoice: 'green',
  TrueFalse: 'orange',
  Input: 'purple',
};

const difficultyColorMap: Record<string, string> = {
  Easy: 'green',
  Medium: 'gold',
  Hard: 'red',
};

export default function QuestionsListPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<QuestionListDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [questionType, setQuestionType] = useState<string | undefined>();
  const [difficulty, setDifficulty] = useState<string | undefined>();
  const [search, setSearch] = useState('');

  const fetchQuestions = useCallback(() => {
    setLoading(true);
    questionsApi
      .getQuestions({
        pageNumber: page,
        pageSize,
        categoryId,
        type: questionType,
        difficulty,
      })
      .then((res) => {
        setData(res.data.items);
        setTotal(res.data.totalCount);
      })
      .catch(() => message.error('Failed to load questions'))
      .finally(() => setLoading(false));
  }, [page, pageSize, categoryId, questionType, difficulty]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const handleDelete = async (id: string) => {
    try {
      await questionsApi.deleteQuestion(id);
      message.success('Question deleted');
      fetchQuestions();
    } catch {
      message.error('Failed to delete question');
    }
  };

  const filteredData = search
    ? data.filter((q) =>
        q.text?.toLowerCase().includes(search.toLowerCase()),
      )
    : data;

  const columns: ColumnsType<QuestionListDto> = [
    {
      title: 'Text',
      dataIndex: 'text',
      key: 'text',
      ellipsis: true,
      render: (text?: string) => text || '-',
    },
    {
      title: 'Type',
      dataIndex: 'questionType',
      key: 'questionType',
      width: 140,
      render: (type: string) => (
        <Tag color={typeColorMap[type] || 'default'}>{type}</Tag>
      ),
    },
    {
      title: 'Difficulty',
      dataIndex: 'difficultyLevel',
      key: 'difficultyLevel',
      width: 100,
      render: (level: string) => (
        <Tag color={difficultyColorMap[level] || 'default'}>{level}</Tag>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'categoryName',
      key: 'categoryName',
      width: 150,
    },
    {
      title: 'AI Generated',
      dataIndex: 'isAiGenerated',
      key: 'isAiGenerated',
      width: 110,
      align: 'center',
      render: (val: boolean) =>
        val ? (
          <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18 }} />
        ) : null,
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (val: string) => dayjs(val).format('YYYY-MM-DD'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => navigate(`../questions/${record.id}/edit`)}
          />
          <Popconfirm
            title="Delete this question?"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="Questions"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('../questions/new')}
          >
            Create Question
          </Button>
        }
      >
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={8} md={6}>
            <CategoryTreeSelect
              value={categoryId}
              onChange={(val: string) => {
                setCategoryId(val);
                setPage(1);
              }}
              placeholder="Filter by category"
            />
          </Col>
          <Col xs={24} sm={8} md={5}>
            <Select
              placeholder="Filter by type"
              allowClear
              style={{ width: '100%' }}
              value={questionType}
              onChange={(val: string) => {
                setQuestionType(val);
                setPage(1);
              }}
              options={Object.values(QuestionType).map((t) => ({
                label: t,
                value: t,
              }))}
            />
          </Col>
          <Col xs={24} sm={8} md={5}>
            <Select
              placeholder="Filter by difficulty"
              allowClear
              style={{ width: '100%' }}
              value={difficulty}
              onChange={(val: string) => {
                setDifficulty(val);
                setPage(1);
              }}
              options={Object.values(DifficultyLevel).map((d) => ({
                label: d,
                value: d,
              }))}
            />
          </Col>
          <Col xs={24} sm={8} md={5}>
            <Input.Search
              placeholder="Search by text"
              allowClear
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Col>
        </Row>

        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>
          Showing {filteredData.length} of {total} question{total === 1 ? '' : 's'}
          {(categoryId || questionType || difficulty || search) && ' (filtered)'}
        </Typography.Text>

        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
        />
      </Card>
    </div>
  );
}
