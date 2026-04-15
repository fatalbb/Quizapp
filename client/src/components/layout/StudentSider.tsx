import { Menu } from 'antd';
import { ReadOutlined, HistoryOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import type { MenuProps } from 'antd';

const items: MenuProps['items'] = [
  {
    key: '/student/quizzes',
    icon: <ReadOutlined />,
    label: 'Available Quizzes',
  },
  {
    key: '/student/attempts',
    icon: <HistoryOutlined />,
    label: 'My Attempts',
  },
];

export default function StudentSider() {
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
