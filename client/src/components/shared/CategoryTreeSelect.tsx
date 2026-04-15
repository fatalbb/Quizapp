import { useEffect, useState } from 'react';
import { TreeSelect, message } from 'antd';
import type { TreeSelectProps } from 'antd';
import { categoriesApi } from '../../api/categoriesApi';
import type { CategoryDto } from '../../types/category';

interface CategoryTreeSelectProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  allowClear?: boolean;
  excludeId?: string;
}

function buildTreeData(
  categories: CategoryDto[],
  excludeId?: string,
): TreeSelectProps['treeData'] {
  return categories
    .filter((cat) => cat.id !== excludeId)
    .map((cat) => ({
      title: cat.name,
      value: cat.id,
      key: cat.id,
      children: cat.subCategories
        ? buildTreeData(cat.subCategories, excludeId)
        : [],
    }));
}

export default function CategoryTreeSelect({
  value,
  onChange,
  placeholder = 'Select category',
  allowClear = true,
  excludeId,
}: CategoryTreeSelectProps) {
  const [treeData, setTreeData] = useState<TreeSelectProps['treeData']>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    categoriesApi
      .getCategories()
      .then((res) => {
        setTreeData(buildTreeData(res.data, excludeId));
      })
      .catch(() => {
        message.error('Failed to load categories');
      })
      .finally(() => setLoading(false));
  }, [excludeId]);

  return (
    <TreeSelect
      value={value}
      onChange={onChange}
      treeData={treeData}
      placeholder={placeholder}
      allowClear={allowClear}
      loading={loading}
      showSearch
      treeNodeFilterProp="title"
      style={{ width: '100%' }}
      dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
      treeDefaultExpandAll
    />
  );
}
