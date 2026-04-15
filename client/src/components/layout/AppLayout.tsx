import { useState } from 'react';
import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { UserRole } from '../../types/enums';
import HeaderBar from './HeaderBar';
import AdminSider from './AdminSider';
import TeacherSider from './TeacherSider';
import StudentSider from './StudentSider';

const { Sider, Content } = Layout;

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuthStore();

  const renderSider = () => {
    switch (user?.role) {
      case UserRole.Admin:
        return <AdminSider />;
      case UserRole.Teacher:
        return <TeacherSider />;
      case UserRole.Student:
        return <StudentSider />;
      default:
        return null;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="dark"
      >
        <div
          style={{
            height: 32,
            margin: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              color: '#fff',
              fontSize: collapsed ? 14 : 18,
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
            }}
          >
            {collapsed ? 'SQ' : 'SQL Quiz'}
          </span>
        </div>
        {renderSider()}
      </Sider>
      <Layout>
        <HeaderBar />
        <Content
          style={{
            margin: 24,
            padding: 24,
            minHeight: 280,
            background: '#fff',
            borderRadius: 8,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
