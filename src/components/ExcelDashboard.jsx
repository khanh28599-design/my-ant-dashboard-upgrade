import React, { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { Upload, Button, Table, Card, Row, Col, message } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function ExcelDashboard() {
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);

  // Xử lý file Excel
  const handleFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const bstr = e.target.result;
      const workbook = XLSX.read(bstr, { type: "binary" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet);

      if (jsonData.length === 0) {
        message.error("File Excel trống!");
        return;
      }

      // Tạo columns Table tự động
      const cols = Object.keys(jsonData[0]).map((key) => ({
        title: key,
        dataIndex: key,
        key: key,
        sorter: (a, b) =>
          typeof a[key] === "number" ? a[key] - b[key] : a[key]?.localeCompare(b[key]),
      }));

      setColumns(cols);
      setData(jsonData);

      // Tính tổng doanh thu
      const revenueSum = jsonData.reduce(
        (sum, row) => sum + Number(row["Doanh thu"] || 0),
        0
      );
      setTotalRevenue(revenueSum);
    };
    reader.readAsBinaryString(file);
    return false; // prevent Upload default
  };

  // Dữ liệu chart theo Gành hàng
  const chartData = useMemo(() => {
    if (!data) return [];
    const grouped = {};
    data.forEach((row) => {
      const category = row["Gành hàng"];
      const revenue = Number(row["Doanh thu"] || 0);
      if (!grouped[category]) grouped[category] = 0;
      grouped[category] += revenue;
    });
    return Object.keys(grouped).map((key) => ({
      name: key,
      "Doanh thu": grouped[key],
    }));
  }, [data]);

  return (
    <div>
      <Upload beforeUpload={handleFile} showUploadList={false}>
        <Button icon={<UploadOutlined />}>Chọn file Excel</Button>
      </Upload>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={8}>
          <Card title="Tổng Doanh Thu" bordered={false}>
            {totalRevenue.toLocaleString()} VNĐ
          </Card>
        </Col>
      </Row>

      <Table
        columns={columns}
        dataSource={data.map((row, index) => ({ ...row, key: index }))}
        style={{ marginTop: 16 }}
      />

      <h3 style={{ marginTop: 24 }}>Biểu đồ Doanh Thu theo Gành hàng</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="Doanh thu" fill="#1890ff" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
