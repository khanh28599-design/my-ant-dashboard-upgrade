import React from 'react';
import { Layout, Typography, Switch as AntSwitch } from 'antd';

const { Header } = Layout;
const { Title } = Typography;

function AppHeader({ darkMode, setDarkMode }) {
  return (
    <Header style={{
      background: darkMode ? '#1f1f1f' : '#fff',
      padding: '0 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 999
    }}>
      <Title level={3} style={{ margin: 0, color: darkMode ? '#fff' : '#000' }}>Dashboard</Title>
      <AntSwitch
        checked={darkMode}
        onChange={setDarkMode}
        checkedChildren="Dark"
        unCheckedChildren="Light"
      />
    </Header>
  );
}

export default AppHeader;
