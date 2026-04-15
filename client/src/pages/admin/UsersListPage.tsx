import { useEffect, useState } from 'react';
import {
  Typography,
  Table,
  Tag,
  Switch,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Segmented,
  Space,
  Popconfirm,
  message,
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { usersApi } from '../../api/usersApi';
import type { UserDto } from '../../types/auth';
import type { CreateUserRequest } from '../../types/user';
import { UserRole } from '../../types/enums';

const PAGE_SIZE = 10;

const ROLE_FILTERS = ['All', UserRole.Admin, UserRole.Teacher, UserRole.Student];

export default function UsersListPage() {
  const [users, setUsers] = useState<UserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageNumber, setPageNumber] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [editingUser, setEditingUser] = useState<UserDto | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [form] = Form.useForm<CreateUserRequest>();
  const [editForm] = Form.useForm();

  const fetchUsers = async (page: number, role: string) => {
    setLoading(true);
    try {
      const params: { pageNumber: number; pageSize: number; role?: string } = {
        pageNumber: page,
        pageSize: PAGE_SIZE,
      };
      if (role !== 'All') {
        params.role = role;
      }
      const { data } = await usersApi.getUsers(params);
      setUsers(data.items);
      setTotalCount(data.totalCount);
    } catch {
      message.error('Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(pageNumber, roleFilter);
  }, [pageNumber, roleFilter]);

  const handleToggleActive = async (userId: string) => {
    setTogglingIds((prev) => new Set(prev).add(userId));
    try {
      const res = await usersApi.toggleUserActive(userId);
      const isNowActive = (res.data as { isActive: boolean }).isActive;
      message.success(`User ${isNowActive ? 'activated' : 'deactivated'}.`);
      await fetchUsers(pageNumber, roleFilter);
    } catch {
      message.error('Failed to update user status.');
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const handleCreateUser = async (values: CreateUserRequest) => {
    setCreating(true);
    try {
      await usersApi.createUser(values);
      message.success('User created successfully.');
      setModalOpen(false);
      form.resetFields();
      fetchUsers(pageNumber, roleFilter);
    } catch {
      message.error('Failed to create user.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await usersApi.deleteUser(userId);
      message.success('User deleted.');
      fetchUsers(pageNumber, roleFilter);
    } catch {
      message.error('Failed to delete user.');
    }
  };

  const handleEditUser = async (values: { firstName: string; lastName: string; email: string }) => {
    if (!editingUser) return;
    try {
      await usersApi.updateUser({ userId: editingUser.id, ...values });
      message.success('User updated successfully.');
      setEditModalOpen(false);
      setEditingUser(null);
      editForm.resetFields();
      fetchUsers(pageNumber, roleFilter);
    } catch {
      message.error('Failed to update user.');
    }
  };

  const openEditModal = (user: UserDto) => {
    setEditingUser(user);
    editForm.setFieldsValue({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    });
    setEditModalOpen(true);
  };

  const roleColor = (role: UserRole) => {
    switch (role) {
      case UserRole.Admin:
        return 'red';
      case UserRole.Teacher:
        return 'blue';
      case UserRole.Student:
        return 'green';
      default:
        return 'default';
    }
  };

  const columns: ColumnsType<UserDto> = [
    {
      title: 'Name',
      key: 'name',
      render: (_, record) => `${record.firstName} ${record.lastName}`,
      ellipsis: true,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      ellipsis: true,
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      width: 110,
      render: (role: UserRole) => <Tag color={roleColor(role)}>{role}</Tag>,
    },
    {
      title: 'Active',
      key: 'active',
      width: 80,
      render: (_, record) => (
        <Switch
          checked={record.isActive}
          loading={togglingIds.has(record.id)}
          onChange={() => handleToggleActive(record.id)}
          size="small"
        />
      ),
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
            onClick={() => openEditModal(record)}
          />
          <Popconfirm
            title="Delete this user?"
            description="This action cannot be undone."
            onConfirm={() => handleDeleteUser(record.id)}
          >
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleTableChange = (pagination: TablePaginationConfig) => {
    setPageNumber(pagination.current || 1);
  };

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <Typography.Title level={3} style={{ margin: 0 }}>
          Users
        </Typography.Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setModalOpen(true)}
        >
          Create User
        </Button>
      </div>

      <Segmented
        options={ROLE_FILTERS}
        value={roleFilter}
        onChange={(val) => {
          setRoleFilter(val as string);
          setPageNumber(1);
        }}
        style={{ marginBottom: 16 }}
      />

      <Table<UserDto>
        columns={columns}
        dataSource={users}
        rowKey="id"
        loading={loading}
        pagination={{
          current: pageNumber,
          total: totalCount,
          pageSize: PAGE_SIZE,
          showSizeChanger: false,
        }}
        onChange={handleTableChange}
        scroll={{ x: 600 }}
      />

      <Modal
        title="Create User"
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
        }}
        footer={null}
        destroyOnClose
      >
        <Form<CreateUserRequest>
          form={form}
          layout="vertical"
          onFinish={handleCreateUser}
        >
          <Form.Item
            name="firstName"
            label="First Name"
            rules={[{ required: true, message: 'Please enter first name' }]}
          >
            <Input placeholder="First Name" />
          </Form.Item>
          <Form.Item
            name="lastName"
            label="Last Name"
            rules={[{ required: true, message: 'Please enter last name' }]}
          >
            <Input placeholder="Last Name" />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Please enter email' },
              { type: 'email', message: 'Please enter a valid email' },
            ]}
          >
            <Input placeholder="Email" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Password"
            rules={[
              { required: true, message: 'Please enter password' },
              { min: 6, message: 'Password must be at least 6 characters' },
            ]}
          >
            <Input.Password placeholder="Password" />
          </Form.Item>
          <Form.Item
            name="role"
            label="Role"
            rules={[{ required: true, message: 'Please select a role' }]}
          >
            <Select placeholder="Select role">
              <Select.Option value={UserRole.Admin}>Admin</Select.Option>
              <Select.Option value={UserRole.Teacher}>Teacher</Select.Option>
              <Select.Option value={UserRole.Student}>Student</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button
              onClick={() => {
                setModalOpen(false);
                form.resetFields();
              }}
              style={{ marginRight: 8 }}
            >
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={creating}>
              Create
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Edit User"
        open={editModalOpen}
        onCancel={() => {
          setEditModalOpen(false);
          setEditingUser(null);
          editForm.resetFields();
        }}
        footer={null}
        destroyOnClose
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleEditUser}
        >
          <Form.Item
            name="firstName"
            label="First Name"
            rules={[{ required: true, message: 'Please enter first name' }]}
          >
            <Input placeholder="First Name" />
          </Form.Item>
          <Form.Item
            name="lastName"
            label="Last Name"
            rules={[{ required: true, message: 'Please enter last name' }]}
          >
            <Input placeholder="Last Name" />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Please enter email' },
              { type: 'email', message: 'Please enter a valid email' },
            ]}
          >
            <Input placeholder="Email" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button
              onClick={() => {
                setEditModalOpen(false);
                setEditingUser(null);
                editForm.resetFields();
              }}
              style={{ marginRight: 8 }}
            >
              Cancel
            </Button>
            <Button type="primary" htmlType="submit">
              Save
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
