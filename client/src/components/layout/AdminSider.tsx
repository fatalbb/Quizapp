import { Menu } from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  FolderOutlined,
  FileTextOutlined,
  FormOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import type { MenuProps } from 'antd';

const items: MenuProps['items'] = [
  {
    key: '/admin/dashboard',
    icon: <DashboardOutlined />,
    label: 'Dashboard',
  },
  {
    key: '/admin/users',
    icon: <TeamOutlined />,
    label: 'Users',
  },
  {
    key: '/admin/categories',
    icon: <FolderOutlined />,
    label: 'Categories',
  },
  {
    key: '/admin/questions',
    icon: <FileTextOutlined />,
    label: 'Questions',
  },
  {
    key: '/admin/questions/generate',
    icon: <RobotOutlined />,
    label: 'AI Generate',
  },
  {
    key: '/admin/quizzes',
    icon: <FormOutlined />,
    label: 'Quizzes',
  },
];

export default function AdminSider() {
  const navigate = useNavigate();
  const location = useLocation();

  const selectedKey =
    items
      ?.filter((item): item is { key: string } => item !== null && 'key' in item)
      .map((item) => item.key)
      .filter((key) => location.pathname.startsWith(key))
      .sort((a, b) => b.length - a.length)[0] || '';

  return (
    <Menu
      theme="dark"
      mode="inline"
      selectedKeys={[selectedKey]}
      items={items}
      onClick={({ key }) => navigate(key)}
    />
  );
}
