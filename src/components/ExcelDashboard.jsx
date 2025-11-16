import React, { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { Upload, Button, Table, message, Select } from "antd";
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
        {
          title: "Phải thu",
          dataIndex: "Phải thu",
          key: "Phải thu",
          sorter: (a, b) => a["Phải thu"] - b["Phải thu"],
        },
        {
          title: "Số lượng",
          dataIndex: "Số lượng",
          key: "Số lượng",
          sorter: (a, b) => a["Số lượng"] - b["Số lượng"],
        },
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
  const filteredTable = useMemo(
    () =>
      data.filter(
        (row) =>
          tableCreatorFilter.includes(row["Người tạo"]) &&
          tableCategoryFilter.includes(row["Ngành hàng"])
      ),
    [data, tableCreatorFilter, tableCategoryFilter]
  );

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
    return Object.keys(grouped).map((key) => ({
      name: key,
      DoanhThu: grouped[key],
    }));
  }, [data, pieCreatorFilter]);

  // Chuẩn hóa lại key để dùng cho PieChart (dataKey không có dấu cách)
  const normalizedPieData = pieData.map((item) => ({
    ...item,
    "Doanh thu": item.DoanhThu,
  }));

  // Bar chart: doanh thu & số lượng theo Ngành hàng với filter riêng
  const barData = useMemo(() => {
    const grouped = {};
    data
      .filter((row) => barCategoryFilter.includes(row["Ngành hàng"]))
      .forEach((row) => {
        const category = row["Ngành hàng"];
        if (!grouped[category])
          grouped[category] = { name: category, "Doanh thu": 0, "Số lượng": 0 };
        grouped[category]["Doanh thu"] += row["Phải thu"];
        grouped[category]["Số lượng"] += row["Số lượng"];
      });
    return Object.values(grouped);
  }, [data, barCategoryFilter]);

  const allCreators = Array.from(new Set(data.map((r) => r["Người tạo"])));
  const allCategories = Array.from(new Set(data.map((r) => r["Ngành hàng"])));

  return (
    <div>
      <Upload beforeUpload={handleFile} showUploadList={false}>
        <Button icon={<UploadOutlined />}>Chọn file Excel</Button>
      </Upload>

      {/* THANH FILTER CHO TABLE */}
      <div
        style={{
          marginTop: 16,
          padding: 8,
          border: "1px solid #f0f0f0",
          borderRadius: 8,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 8,
          background: "#fafafa",
        }}
      >
        <span style={{ fontWeight: 500 }}>Filter Table:</span>

        <span>Người tạo:</span>
        <Select
          mode="multiple"
          allowClear
          size="small"
          placeholder="Chọn"
          style={{ width: 180 }}
          value={tableCreatorFilter}
          onChange={setTableCreatorFilter}
          maxTagCount="responsive"
        >
          {allCreators.map((c) => (
            <Option key={c} value={c}>
              {c}
            </Option>
          ))}
        </Select>

        <span>Ngành hàng:</span>
        <Select
          mode="multiple"
          allowClear
          size="small"
          placeholder="Chọn"
          style={{ width: 180 }}
          value={tableCategoryFilter}
          onChange={setTableCategoryFilter}
          maxTagCount="responsive"
        >
          {allCategories.map((c) => (
            <Option key={c} value={c}>
              {c}
            </Option>
          ))}
        </Select>
      </div>

      {/* TABLE */}
      <Table
        columns={columns}
        dataSource={filteredTable.map((row, index) => ({ ...row, key: index }))}
        style={{ marginTop: 16 }}
        size="small"
      />

      {/* THANH FILTER CHO PIE CHART */}
      <div
        style={{
          marginTop: 24,
          padding: 8,
          border: "1px solid #f0f0f0",
          borderRadius: 8,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 8,
          background: "#fafafa",
        }}
      >
        <span style={{ fontWeight: 500 }}>Filter Pie Chart:</span>

        <span>Người tạo:</span>
        <Select
          mode="multiple"
          allowClear
          size="small"
          placeholder="Chọn"
          style={{ width: 220 }}
          value={pieCreatorFilter}
          onChange={setPieCreatorFilter}
          maxTagCount="responsive"
        >
          {allCreators.map((c) => (
            <Option key={c} value={c}>
              {c}
            </Option>
          ))}
        </Select>
      </div>

      <h3 style={{ marginTop: 12 }}>Biểu đồ tròn: Doanh thu theo Người tạo</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={normalizedPieData}
            dataKey="Doanh thu"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={100}
            label
          >
            {normalizedPieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>

      {/* THANH FILTER CHO BAR CHART */}
      <div
        style={{
          marginTop: 24,
          padding: 8,
          border: "1px solid #f0f0f0",
          borderRadius: 8,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 8,
          background: "#fafafa",
        }}
      >
        <span style={{ fontWeight: 500 }}>Filter Bar Chart:</span>

        <span>Ngành hàng:</span>
        <Select
          mode="multiple"
          allowClear
          size="small"
          placeholder="Chọn"
          style={{ width: 220 }}
          value={barCategoryFilter}
          onChange={setBarCategoryFilter}
          maxTagCount="responsive"
        >
          {allCategories.map((c) => (
            <Option key={c} value={c}>
              {c}
            </Option>
          ))}
        </Select>
      </div>

      <h3 style={{ marginTop: 12 }}>
        Biểu đồ cột: Doanh thu &amp; Số lượng theo Ngành hàng
      </h3>
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

