import { useEffect, useState, useCallback } from 'react';
import {
  Card,
  Tree,
  Button,
  Modal,
  Form,
  Input,
  Space,
  Popconfirm,
  Badge,
  Spin,
  message,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';
import { categoriesApi } from '../../api/categoriesApi';
import type {
  CategoryDto,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from '../../types/category';
import CategoryTreeSelect from '../../components/shared/CategoryTreeSelect';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryDto | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const fetchCategories = useCallback(() => {
    setLoading(true);
    categoriesApi
      .getCategories()
      .then((res) => setCategories(res.data))
      .catch(() => message.error('Failed to load categories'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const openCreate = () => {
    setEditingCategory(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (cat: CategoryDto) => {
    setEditingCategory(cat);
    form.setFieldsValue({
      name: cat.name,
      description: cat.description,
      parentCategoryId: cat.parentCategoryId,
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await categoriesApi.deleteCategory(id);
      message.success('Category deleted');
      fetchCategories();
    } catch {
      message.error('Failed to delete category');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      if (editingCategory) {
        const data: UpdateCategoryRequest = {
          id: editingCategory.id,
          ...values,
        };
        await categoriesApi.updateCategory(data);
        message.success('Category updated');
      } else {
        const data: CreateCategoryRequest = values;
        await categoriesApi.createCategory(data);
        message.success('Category created');
      }
      setModalOpen(false);
      form.resetFields();
      fetchCategories();
    } catch {
      message.error('Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const buildTreeData = (cats: CategoryDto[]): DataNode[] =>
    cats.map((cat) => ({
      key: cat.id,
      title: (
        <Space>
          <span>{cat.name}</span>
          <Badge
            count={cat.questionCount}
            style={{ backgroundColor: '#1890ff' }}
            showZero
          />
          <span style={{ marginLeft: 8, opacity: 0.6 }}>
            <EditOutlined
              style={{ marginRight: 8, cursor: 'pointer' }}
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                openEdit(cat);
              }}
            />
            <Popconfirm
              title="Delete this category?"
              description="This action cannot be undone."
              onConfirm={(e) => {
                e?.stopPropagation();
                handleDelete(cat.id);
              }}
              onCancel={(e) => e?.stopPropagation()}
            >
              <DeleteOutlined
                style={{ color: '#ff4d4f', cursor: 'pointer' }}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              />
            </Popconfirm>
          </span>
        </Space>
      ),
      children: cat.subCategories ? buildTreeData(cat.subCategories) : [],
    }));

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="Categories"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Add Category
          </Button>
        }
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin size="large" />
          </div>
        ) : (
          <Tree
            treeData={buildTreeData(categories)}
            defaultExpandAll
            showLine
            selectable={false}
          />
        )}
      </Card>

      <Modal
        title={editingCategory ? 'Edit Category' : 'Add Category'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
        }}
        confirmLoading={saving}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please enter a name' }]}
          >
            <Input placeholder="Category name" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} placeholder="Optional description" />
          </Form.Item>
          <Form.Item name="parentCategoryId" label="Parent Category">
            <CategoryTreeSelect
              placeholder="No parent (top-level)"
              excludeId={editingCategory?.id}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
