import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography,
  Card,
  Form,
  Input,
  Select,
  Button,
  message,
} from 'antd';
import { usersApi } from '../../api/usersApi';
import type { CreateUserRequest } from '../../types/user';
import { UserRole } from '../../types/enums';

export default function UserFormPage() {
  const navigate = useNavigate();
  const [form] = Form.useForm<CreateUserRequest>();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (values: CreateUserRequest) => {
    setSubmitting(true);
    try {
      await usersApi.createUser(values);
      message.success('User created successfully.');
      navigate('/admin/users');
    } catch {
      message.error('Failed to create user.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
      <Typography.Title level={3}>Create User</Typography.Title>

      <Card>
        <Form<CreateUserRequest>
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
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

          <Form.Item style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button onClick={() => navigate('/admin/users')}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                Create User
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
