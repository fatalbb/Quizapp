import { Layout, Dropdown, Avatar, Space, Typography } from 'antd';
import { UserOutlined, KeyOutlined, LogoutOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import type { MenuProps } from 'antd';

const { Header } = Layout;
const { Text } = Typography;

export default function HeaderBar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const items: MenuProps['items'] = [
    {
      key: 'change-password',
      icon: <KeyOutlined />,
      label: 'Change Password',
      onClick: () => navigate('/change-password'),
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: handleLogout,
    },
  ];

  return (
    <Header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#fff',
        padding: '0 24px',
        borderBottom: '1px solid #f0f0f0',
      }}
    >
      <Text strong style={{ fontSize: 18 }}>
        SQL Quiz App
      </Text>

      <Dropdown menu={{ items }} trigger={['click']}>
        <Space style={{ cursor: 'pointer' }}>
          <Avatar icon={<UserOutlined />} />
          <Text>
            {user?.firstName} {user?.lastName}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            ({user?.role})
          </Text>
        </Space>
      </Dropdown>
    </Header>
  );
}
