import React from 'react';
import { Column } from '@ant-design/plots';

function RevenueChart() {
  const data = [
    { month: 'Jan', revenue: 8000 },
    { month: 'Feb', revenue: 12000 },
    { month: 'Mar', revenue: 15000 },
    { month: 'Apr', revenue: 9000 },
    { month: 'May', revenue: 14000 },
  ];

  const config = {
    data,
    xField: 'month',
    yField: 'revenue',
    label: { position: 'middle', style: { fill: '#FFFFFF', opacity: 0.6 } },
    color: '#1890ff',
    height: 300,
    autoFit: true
  };

  return <Column {...config} />;
}

export default RevenueChart;
