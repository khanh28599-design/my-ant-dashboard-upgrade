import React, { useState } from 'react';
import { Layout } from 'antd';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import DashboardCard from './components/DashboardCard';
import RevenueChart from './components/RevenueChart';

const { Content } = Layout;

function App() {
  const [darkMode, setDarkMode] = useState(false);

  const stats = [
    { title: 'Users', value: 1200 },
    { title: 'Revenue', value: '$15,000' },
    { title: 'Orders', value: 320 },
    { title: 'Products', value: 150 }
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar darkMode={darkMode} />
      <Layout>
        <Header darkMode={darkMode} setDarkMode={setDarkMode} />
        <Content style={{ margin: '20px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' }}>
            {stats.map((item, index) => (
              <DashboardCard key={index} title={item.title} value={item.value} />
            ))}
          </div>
          <div style={{ marginTop: '40px', background: darkMode ? '#1f1f1f' : '#fff', padding: '20px', borderRadius: '8px' }}>
            <RevenueChart />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}

export default App;
