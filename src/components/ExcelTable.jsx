import React, { useState } from "react";
import * as XLSX from "xlsx";
import { Table, Upload, Button, message } from "antd";
import { UploadOutlined } from "@ant-design/icons";

export default function ExcelTable() {
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);

  // Xử lý file Excel
  const handleFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const bstr = e.target.result;
      const workbook = XLSX.read(bstr, { type: "binary" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet);
      
      if(jsonData.length === 0) {
        message.error("File Excel trống!");
        return;
      }

      // Tạo columns tự động từ keys
      const cols = Object.keys(jsonData[0]).map((key) => ({
        title: key,
        dataIndex: key,
        key: key,
      }));

      setColumns(cols);
      setData(jsonData);
    };
    reader.readAsBinaryString(file);
    return false; // prevent upload
  };

  return (
    <div>
      <Upload beforeUpload={handleFile} showUploadList={false}>
        <Button icon={<UploadOutlined />}>Chọn file Excel</Button>
      </Upload>

      <Table
        columns={columns}
        dataSource={data.map((row, index) => ({ ...row, key: index }))}
        style={{ marginTop: 16 }}
      />
    </div>
  );
}
