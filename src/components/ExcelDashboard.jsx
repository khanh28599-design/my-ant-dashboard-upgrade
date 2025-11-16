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

  // Filter riêng cho Table
  const [tableCreatorFilter, setTableCreatorFilter] = useState([]);
  const [tableCategoryFilter, setTableCategoryFilter] = useState([]);

  // Filter riêng cho Pie Chart
  const [pieCreatorFilter, setPieCreatorFilter] = useState([]);

  // Filter riêng cho Bar Chart
  const [barCategoryFilter, setBarCategoryFilter] = useState([]);

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

      jsonData = jsonData.map((row) => ({
        "Người tạo": row["Người tạo"] || "",
        "Ngành hàng": row["Ngành hàng"] || "",
        "Phải thu": Number(row["Phải thu"] || row["Doanh thu"] || 0),
        "Số lượng": Number(row["Số lượng"] || 0),
      }));

      setData(jsonData);
      setColumns([
        { title: "Người tạo", dataIndex: "Người tạo", key: "Người tạo" },
        { title: "Ngành hàng", dataIndex: "Ngành hàng", key: "Ngành hàng" },
        { title: "Phải thu", dataIndex: "Phải thu", key: "Phải thu", sorter: (a, b) => a["Phải thu"] - b["Phải thu"] },
        { title: "Số lượng", dataIndex: "Số lượng", key: "Số lượng", sorter: (a, b) => a["Số lượng"] - b["Số lượng"] },
      ]);

      // Mặc định chọn tất cả filter
      const allCreators = Array.from(new Set(jsonData.map((r) => r["Người tạo"])));
      const allCategories = Array.from(new Set(jsonData.map((r) => r["Ngành hàng"])));
      setTableCreatorFilter(allCreators);
      setPieCreatorFilter(allCreators);
      setTableCategoryFilter(allCategories);
      setBarCategoryFilter(allCategories);
    };
    reader.readAsBinaryString(file);
    return false;
  };

  // Table dữ liệu với filter riêng
  const filteredTable = useMemo(() => {
    return data.filter(
      (row) => tableCreatorFilter.includes(row["Người tạo"]) && tableCategoryFilter.includes(row["Ngành hàng"])
    );
  }, [data, tableCreatorFilter, tableCategoryFilter]);

  // Pie chart: tổng doanh thu theo Người tạo với filter riêng
  const pieData = useMemo(() => {
    const grouped = {};
    data
      .filter((row) => pieCreatorFilter.includes(row["Người tạo"]))
      .forEach((row) => {
        const creator = row["Người tạo"];
        if (!grouped[creator]) grouped[creator] = 0;
        grouped[creator] += row["Phải thu"];
      });
    return Object.keys(grouped).map((key) => ({ name: key, "Doanh thu": grouped[key] }));
  }, [data, pieCreatorFilter]);

  // Bar chart: doanh thu & số lượng theo Ngành hàng với filter riêng
  const barData = useMemo(() => {
    const grouped = {};
    data
      .filter((row) => barCategoryFilter.includes(row["Ngành hàng"]))
      .forEach((row) => {
        const category = row["Ngành hàng"];
        if (!grouped[category]) grouped[category] = { "Doanh thu": 0, "Số lượng": 0 };
        grouped[category]["Doanh thu"] += row["Phải thu"];
        grouped[category]["Số lượng"] += row["Số lượng"];
      });
    return Object.keys(grouped).map((key) => ({ name: key, ...grouped[key] }));
  }, [data, barCategoryFilter]);

  const allCreators = Array.from(new Set(data.map((r) => r["Người tạo"])));
  const allCategories = Array.from(new Set(data.map((r) => r["Ngành hàng"])));

  return (
    <div>
      <Upload beforeUpload={handleFile} showUploadList={false}>
        <Button icon={<UploadOutlined />}>Chọn file Excel</Button>
      </Upload>

      {/* Filter Table */}
      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Select
            mode="multiple"
            allowClear
            placeholder="Chọn Người tạo cho Table"
            style={{ width: "100%" }}
            value={tableCreatorFilter}
            onChange={setTableCreatorFilter}
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
            placeholder="Chọn Ngành hàng cho Table"
            style={{ width: "100%" }}
            value={tableCategoryFilter}
            onChange={setTableCategoryFilter}
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

      {/* Filter Pie Chart */}
      <h3 style={{ marginTop: 24 }}>Biểu đồ tròn: Doanh thu theo Người tạo</h3>
      <Select
        mode="multiple"
        allowClear
        placeholder="Chọn Người tạo cho Pie Chart"
        style={{ width: "50%", marginBottom: 16 }}
        value={pieCreatorFilter}
        onChange={setPieCreatorFilter}
      >
        {allCreators.map((c) => (
          <Option key={c} value={c}>
            {c}
          </Option>
        ))}
      </Select>
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

      {/* Filter Bar Chart */}
      <h3 style={{ marginTop: 24 }}>Biểu đồ cột: Doanh thu & Số lượng theo Ngành hàng</h3>
      <Select
        mode="multiple"
        allowClear
        placeholder="Chọn Ngành hàng cho Bar Chart"
        style={{ width: "50%", marginBottom: 16 }}
        value={barCategoryFilter}
        onChange={setBarCategoryFilter}
      >
        {allCategories.map((c) => (
          <Option key={c} value={c}>
            {c}
          </Option>
        ))}
      </Select>
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

