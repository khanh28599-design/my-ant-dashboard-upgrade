import React from 'react';
import { Card, Typography } from 'antd';

const { Title } = Typography;

function DashboardCard({ title, value }) {
  return (
    <Card style={{ width: 200, minWidth: 150, textAlign: 'center' }}>
      <Title level={4}>{title}</Title>
      <Title level={2}>{value}</Title>
    </Card>
  );
}

export default DashboardCard;
