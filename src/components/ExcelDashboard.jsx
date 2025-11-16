import React, { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { Upload, Button, Table, Row, Col, message, Select } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const { Option } = Select;
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AA336A", "#33AA99"];

export default function ExcelDashboard() {
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);

  const [creatorFilter, setCreatorFilter] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState([]);

  // Xử lý file Excel
  const handleFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const bstr = e.target.result;
      const workbook = XLSX.read(bstr, { type: "binary" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      let jsonData = XLSX.utils.sheet_to_json(sheet);

      if (jsonData.length === 0) {
        message.error("File Excel trống!");
        return;
      }

      // Lọc các cột quan trọng
      jsonData = jsonData.map((row) => ({
        "Người tạo": row["Người tạo"] || "",
        "Ngành hàng": row["Ngành hàng"] || "",
        "Phải thu": Number(row["Phải thu"] || row["Doanh thu"] || 0),
        "Số lượng": Number(row["Số lượng"] || 0),
      }));

      setData(jsonData);

      // Columns cho Table
      setColumns([
        { title: "Người tạo", dataIndex: "Người tạo", key: "Người tạo" },
        { title: "Ngành hàng", dataIndex: "Ngành hàng", key: "Ngành hàng" },
        { title: "Phải thu", dataIndex: "Phải thu", key: "Phải thu", sorter: (a, b) => a["Phải thu"] - b["Phải thu"] },
        { title: "Số lượng", dataIndex: "Số lượng", key: "Số lượng", sorter: (a, b) => a["Số lượng"] - b["Số lượng"] },
      ]);

      // Mặc định chọn tất cả
      setCreatorFilter(Array.from(new Set(jsonData.map((r) => r["Người tạo"]))));
      setCategoryFilter(Array.from(new Set(jsonData.map((r) => r["Ngành hàng"]))));
    };
    reader.readAsBinaryString(file);
    return false;
  };

  // Table dữ liệu
  const filteredTable = useMemo(() => {
    return data.filter(
      (row) => creatorFilter.includes(row["Người tạo"]) && categoryFilter.includes(row["Ngành hàng"])
    );
  }, [data, creatorFilter, categoryFilter]);

  // Pie chart: doanh thu theo Người tạo
  const pieData = useMemo(() => {
    const grouped = {};
    filteredTable.forEach((row) => {
      const creator = row["Người tạo"];
      if (!grouped[creator]) grouped[creator] = 0;
      grouped[creator] += row["Phải thu"];
    });
    return Object.keys(grouped).map((key) => ({ name: key, "Doanh thu": grouped[key] }));
  }, [filteredTable]);

  // Bar chart: doanh thu & số lượng theo Ngành hàng
  const barData = useMemo(() => {
    const filtered = filteredTable.filter((row) => categoryFilter.includes(row["Ngành hàng"]));
    const grouped = {};
    filtered.forEach((row) => {
      const category = row["Ngành hàng"];
      if (!grouped[category]) grouped[category] = { "Doanh thu": 0, "Số lượng": 0 };
      grouped[category]["Doanh thu"] += row["Phải thu"];
      grouped[category]["Số lượng"] += row["Số lượng"];
    });
    return Object.keys(grouped).map((key) => ({ name: key, ...grouped[key] }));
  }, [filteredTable, categoryFilter]);

  const allCreators = Array.from(new Set(data.map((r) => r["Người tạo"])));
  const allCategories = Array.from(new Set(data.map((r) => r["Ngành hàng"])));

  return (
    <div>
      <Upload beforeUpload={handleFile} showUploadList={false}>
        <Button icon={<UploadOutlined />}>Chọn file Excel</Button>
      </Upload>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Select
            mode="multiple"
            allowClear
            placeholder="Chọn Người tạo"
            style={{ width: "100%" }}
            value={creatorFilter}
            onChange={setCreatorFilter}
          >
            {allCreators.map((c) => (
              <Option key={c} value={c}>
                {c}
              </Option>
            ))}
          </Select>
        </Col>
        <Col span={12}>
          <Select
            mode="multiple"
            allowClear
            placeholder="Chọn Ngành hàng"
            style={{ width: "100%" }}
            value={categoryFilter}
            onChange={setCategoryFilter}
          >
            {allCategories.map((c) => (
              <Option key={c} value={c}>
                {c}
              </Option>
            ))}
          </Select>
        </Col>
      </Row>

      <Table
        columns={columns}
        dataSource={filteredTable.map((row, index) => ({ ...row, key: index }))}
        style={{ marginTop: 16 }}
      />

      <h3 style={{ marginTop: 24 }}>Biểu đồ tròn: Doanh thu theo Người tạo</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={pieData}
            dataKey="Doanh thu"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={100}
            label
          >
            {pieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>

      <h3 style={{ marginTop: 24 }}>Biểu đồ cột: Doanh thu & Số lượng theo Ngành hàng</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={barData}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="Doanh thu" fill="#1890ff" />
          <Bar dataKey="Số lượng" fill="#ff8042" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

