import React, { useState } from 'react';
import { Layout, Menu, Button } from 'antd';
import { UserOutlined, PieChartOutlined, ShoppingCartOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';

const { Sider } = Layout;

function Sidebar({ darkMode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={(val) => setCollapsed(val)}
      theme={darkMode ? 'dark' : 'light'}
      breakpoint="md"
      collapsedWidth={window.innerWidth < 768 ? 0 : 80}
    >
      <Button
        type="text"
        onClick={() => setCollapsed(!collapsed)}
        style={{ margin: '10px', color: darkMode ? '#fff' : '#000' }}
      >
        {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
      </Button>
      <Menu
        theme={darkMode ? 'dark' : 'light'}
        defaultSelectedKeys={['1']}
        mode="inline"
        items={[
          { key: '1', icon: <PieChartOutlined />, label: 'Dashboard' },
          { key: '2', icon: <UserOutlined />, label: 'Users' },
          { key: '3', icon: <ShoppingCartOutlined />, label: 'Orders' }
        ]}
      />
    </Sider>
  );
}

export default Sidebar;
