import { Menu } from 'antd';
import {
  DashboardOutlined,
  FolderOutlined,
  FileTextOutlined,
  FormOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import type { MenuProps } from 'antd';

const items: MenuProps['items'] = [
  {
    key: '/teacher/dashboard',
    icon: <DashboardOutlined />,
    label: 'Dashboard',
  },
  {
    key: '/teacher/categories',
    icon: <FolderOutlined />,
    label: 'Categories',
  },
  {
    key: '/teacher/questions',
    icon: <FileTextOutlined />,
    label: 'Questions',
  },
  {
    key: '/teacher/questions/generate',
    icon: <RobotOutlined />,
    label: 'AI Generate',
  },
  {
    key: '/teacher/quizzes',
    icon: <FormOutlined />,
    label: 'Quizzes',
  },
];

export default function TeacherSider() {
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
