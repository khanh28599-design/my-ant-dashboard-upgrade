import React, { useState, useEffect, useRef, useMemo } from "react";
import * as XLSX from "xlsx";
import { Row, Col, Card, Divider, Button, Select, DatePicker, Input, Switch, Table, Tabs, Tag, Space, Spin, message } from "antd";
import {
  SettingOutlined,
  ReloadOutlined,
  PlusOutlined,
  FilterOutlined,
  BarChartOutlined,
  FundOutlined,
  PieChartOutlined,
  TableOutlined 
} from "@ant-design/icons";
import moment from "moment";

const { Option } = Select;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

// Hàm format tiền tệ
const formatMoneyShort = (amount) => {
  if (!amount) return "0";
  if (amount >= 1000000000) return (amount / 1000000000).toFixed(1) + " Tỷ";
  if (amount >= 1000000) return (amount / 1000000).toFixed(1) + " Tr";
  if (amount >= 1000) return (amount / 1000).toFixed(0) + " k";
  return amount.toLocaleString('vi-VN');
};

// ==========================================
// 1. COMPONENT BỘ LỌC (Đã nâng cấp Logic)
// ==========================================

function FilterPanel({ creators, statuses, filters, setFilters, onReset }) {
  // Xử lý thay đổi input
  const handleChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Card style={{ marginBottom: 20, background: "#fff" }}>
      <Row gutter={16} align="middle" justify="start">
        <Col span={4}>
          <div><b>Người tạo ({creators.length})</b></div>
          <Select 
            value={filters.creator}
            onChange={(val) => handleChange('creator', val)}
            size="small" 
            style={{ width: "100%" }}
            showSearch
            optionFilterProp="children"
          >
            <Option value="All">Tất cả</Option>
            {creators.map(c => <Option key={c} value={c}>{c}</Option>)}
          </Select>
        </Col>
        <Col span={4}>
          <div><b>Trạng thái xuất</b></div>
          <Select 
            value={filters.status}
            onChange={(val) => handleChange('status', val)}
            size="small" 
            style={{ width: "100%" }}
          >
            <Option value="All">Tất cả</Option>
            {statuses.map(s => <Option key={s} value={s}>{s}</Option>)}
          </Select>
        </Col>
        
        {/* Demo khoảng thời gian - Cần chuẩn hóa cột Ngày trong Excel để dùng chính xác */}
        <Col span={5}>
          <div><b>Từ ngày - Đến ngày</b></div>
          <RangePicker size="small" style={{width: "100%"}} disabled /> 
        </Col>

        <Col span={6}>
          <div><b>Tìm kiếm (Tên SP, Mã ĐH)</b></div>
          <Input 
            placeholder="Nhập từ khoá..." 
            size="small"
            value={filters.keyword}
            onChange={(e) => handleChange('keyword', e.target.value)}
          />
        </Col>
        <Col span={2}>
          <Button icon={<ReloadOutlined />} size="small" style={{marginTop: 22}} onClick={onReset}>
            Xóa lọc
          </Button>
        </Col>
      </Row>
      <Divider style={{margin: "16px 0"}} />
      <Space>
        <span>Đang hiển thị theo bộ lọc: </span>
        {filters.creator !== 'All' && <Tag color="blue">Người tạo: {filters.creator}</Tag>}
        {filters.status !== 'All' && <Tag color="green">Trạng thái: {filters.status}</Tag>}
        {filters.keyword && <Tag color="orange">Tìm: {filters.keyword}</Tag>}
        {filters.creator === 'All' && filters.status === 'All' && !filters.keyword && <Tag>Toàn bộ dữ liệu</Tag>}
      </Space>
    </Card>
  );
}

// ==========================================
// 2. CÁC COMPONENT HIỂN THỊ (Giữ nguyên)
// ==========================================

function OverviewSection({ stats }) {
  const overviewData = [
    {
      title: "DOANH THU QUY ĐỔI",
      value: formatMoneyShort(stats.totalRevenue),
      sub: `Thực: ${formatMoneyShort(stats.totalRevenue * 0.9)}\nTích lũy: ${formatMoneyShort(stats.totalRevenue * 0.05)}`,
      icon: <FundOutlined style={{ color: "#1890ff" }} />,
      color: "#eaf6ff"
    },
    {
      title: "HIỆU QUẢ QUY ĐỔI",
      value: "28%", // Demo
      sub: "Mục tiêu: 40%",
      icon: <BarChartOutlined style={{ color: "#55c778" }} />,
      color: "#edf7ef"
    },
    {
      title: "TỶ LỆ TRẢ GÓP",
      value: stats.installmentRate + "%",
      sub: `SL: ${stats.installmentCount} Đơn\nMục tiêu: 45%`,
      icon: <PieChartOutlined style={{ color: "#FF8042" }} />,
      color: "#fff7ea"
    },
    {
      title: "DOANH THU QD CHỜ XUẤT",
      value: formatMoneyShort(stats.pendingRevenue),
      sub: "Đơn chưa hoàn tất",
      icon: <TableOutlined style={{ color: "#af96fc" }} />,
      color: "#f4f0fb"
    }
  ];

  return (
    <Row gutter={16} style={{marginBottom: 20}}>
      {overviewData.map((item, idx) => (
        <Col span={6} key={idx}>
          <Card bordered={false} style={{ background: item.color, height: 108 }} bodyStyle={{ padding: 16, textAlign: "center"}}>
            {item.icon}
            <div style={{ fontWeight: 600, marginBottom: 6 }}>{item.title}</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{item.value}</div>
            <div style={{ fontSize: 12, color: "#888", whiteSpace: "pre-line" }}>{item.sub}</div>
          </Card>
        </Col>
      ))}
    </Row>
  );
}

function CategoryChartBar({ industryData, totalRevenue }) {
    const sortedData = [...industryData].sort((a, b) => b.doanhThu - a.doanhThu);
    return (
        <Card style={{ marginBottom: 20 }}>
            <b>Tỷ trọng ngành hàng</b>
            <div style={{ display: "flex", gap: 24, marginTop: 15, overflowX: 'auto', paddingBottom: 10 }}>
                {sortedData.map((item, index) => {
                    const percent = totalRevenue > 0 ? (item.doanhThu / totalRevenue) * 100 : 0;
                    const colors = ["#3dc6fd", "#55c778", "#FF8042", "#af96fc", "#ffc107", "#f5222d"];
                    const color = colors[index % colors.length];
                    return (
                        <div key={item.name} style={{minWidth: 90}}>
                            <b style={{fontSize: 13}}>{item.name}</b>
                            <div style={{fontSize: 15, fontWeight: 'bold'}}>{formatMoneyShort(item.doanhThu)}</div>
                            <div style={{ height: 6, width: "100%", maxWidth: 100, background: "#f0f0f0", margin: "6px 0", borderRadius: 6, overflow: 'hidden'}}>
                                <div style={{ height: '100%', width: `${percent}%`, background: color }}></div>
                            </div>
                            <span style={{ fontSize: 12, color: color }}>{percent.toFixed(1)}%</span>
                        </div>
                    )
                })}
            </div>
        </Card>
    );
}

function TopStaffRanking({ staffData }) {
  return (
    <Card size="small" style={{ marginBottom: 20 }}>
      <b>Top Nhân Viên (Theo doanh thu lọc được)</b>
      <Table
        dataSource={staffData}
        pagination={{ pageSize: 5 }}
        size="small"
        rowKey="key"
        columns={[
          {title: "#", render: (text, record, index) => index + 1, width: 40},
          {title: "Tên", dataIndex: "name", key: "name"},
          {title: "DTQD", dataIndex: "doanhThu", key: "doanhThu", render: val => formatMoneyShort(val)},
          {title: "SL Đơn", dataIndex: "soDon", key: "soDon"},
          {title: "Rank", dataIndex: "rank", key: "rank", render: (val, record, index) => {
             let color = "#b08d57";
             let label = "Bronze";
             if(index === 0) { color = "gold"; label="Gold"; }
             if(index === 1) { color = "silver"; label="Silver"; }
             return <Tag color={color}>{label}</Tag>
          }}
        ]}
      />
    </Card>
  );
}

function DetailIndustryTable({ industryData, totalRevenue }) {
    const columns = [
        { title: "CHI TIẾT", dataIndex: "name", key: "name", width: 150 },
        { title: "SỐ LƯỢNG", dataIndex: "soLuong", key: "soLuong", align: 'center' },
        { title: "DOANH THU", dataIndex: "doanhThu", key: "doanhThu", render: val => formatMoneyShort(val), align: 'right' },
        { title: "% CT/ĐH", key: "percent", 
          render: (_, record) => {
            const p = totalRevenue > 0 ? record.doanhThu / totalRevenue : 0;
            const color = p > 0.3 ? "#42B015": p > 0.1 ? "#FF8042" : "#e96363";
            return <span style={{color: color, fontWeight: 'bold'}}>{(p*100).toFixed(1)}%</span>
          },
          align: 'right'
        }
    ];
  return (
    <Card>
        <b>CHI TIẾT NGÀNH HÀNG</b>
        <Table columns={columns} dataSource={industryData} scroll={{x: 800}} pagination={false} size="small" rowKey="name" />
    </Card>
  );
}

// ==========================================
// 3. COMPONENT CHÍNH (LOGIC XỬ LÝ)
// ==========================================

export default function ExcelDashboard() {
    // State lưu dữ liệu GỐC từ Excel
    const [allData, setAllData] = useState([]); 
    
    // State lưu trạng thái bộ lọc
    const [filters, setFilters] = useState({
        creator: 'All',
        status: 'All',
        keyword: ''
    });

    // State lưu kết quả thống kê ĐÃ LỌC
    const [stats, setStats] = useState({ totalRevenue: 0, installmentRate: 0, installmentCount: 0, pendingRevenue: 0 });
    const [industryData, setIndustryData] = useState([]);
    const [staffData, setStaffData] = useState([]);
    
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef(null);

    // === 1. TRÍCH XUẤT DANH SÁCH DUY NHẤT CHO BỘ LỌC ===
    const uniqueCreators = useMemo(() => {
        const list = allData.map(item => item.nguoiTao).filter(Boolean);
        return [...new Set(list)].sort();
    }, [allData]);

    const uniqueStatuses = useMemo(() => {
        const list = allData.map(item => item.trangThaiXuat).filter(Boolean);
        return [...new Set(list)].sort();
    }, [allData]);

    // === 2. XỬ LÝ FILE EXCEL ===
    const handleImportClick = () => fileInputRef.current.click();

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setLoading(true);
        const reader = new FileReader();
        
        reader.onload = (evt) => {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const dataExcel = XLSX.utils.sheet_to_json(ws);

            // Ánh xạ dữ liệu thô ngay khi đọc
            const mappedData = dataExcel.map((row, index) => ({
                key: index,
                loaiYCX: row['Loại YCX'] || "", 
                trangThaiXuat: row['Trạng thái xuất'] || "",
                tenSP: row['Tên sản phẩm'] || "",
                nganhHang: row['Ngành hàng'] || "Khác",
                soLuong: Number(row['Số lượng']) || 0,
                giaBan: Number(row['Giá bán']) || 0,
                nguoiTao: row['Người tạo'] || "Unknown",
                maDonHang: row['Mã đơn hàng'] || ""
            }));
            
            setAllData(mappedData); // Lưu dữ liệu gốc
            setLoading(false);
            message.success(`Đã tải lên ${mappedData.length} dòng dữ liệu!`);
        };
        reader.readAsBinaryString(file);
    };

    // === 3. LOGIC LỌC VÀ TÍNH TOÁN (Chạy lại mỗi khi allData hoặc filters thay đổi) ===
    useEffect(() => {
        if (allData.length === 0) return;

        // B1: Lọc dữ liệu
        const filteredData = allData.filter(item => {
            // Lọc theo Người tạo
            const matchCreator = filters.creator === 'All' || item.nguoiTao === filters.creator;
            // Lọc theo Trạng thái
            const matchStatus = filters.status === 'All' || item.trangThaiXuat === filters.status;
            // Lọc theo Từ khóa (Tìm trong Tên SP hoặc Mã ĐH)
            const keyword = filters.keyword.toLowerCase();
            const matchKeyword = !keyword || 
                                 item.tenSP.toLowerCase().includes(keyword) || 
                                 String(item.maDonHang).toLowerCase().includes(keyword);

            return matchCreator && matchStatus && matchKeyword;
        });

        // B2: Tính toán thống kê dựa trên dữ liệu ĐÃ LỌC
        processStatistics(filteredData);

    }, [allData, filters]);

    const processStatistics = (data) => {
        let totalRev = 0;
        let installmentCount = 0;
        let pendingRev = 0;
        
        const industryMap = {};
        const staffMap = {};

        data.forEach(item => {
            const rev = item.giaBan * item.soLuong;
            totalRev += rev;

            if (item.loaiYCX && item.loaiYCX.toLowerCase().includes("trả góp")) installmentCount++;
            if (item.trangThaiXuat && item.trangThaiXuat !== "Đã xuất") pendingRev += rev;

            // Group Industry
            if (!industryMap[item.nganhHang]) {
                industryMap[item.nganhHang] = { name: item.nganhHang, soLuong: 0, doanhThu: 0, count: 0 };
            }
            industryMap[item.nganhHang].soLuong += item.soLuong;
            industryMap[item.nganhHang].doanhThu += rev;
            industryMap[item.nganhHang].count += 1;

            // Group Staff
            if (!staffMap[item.nguoiTao]) {
                staffMap[item.nguoiTao] = { name: item.nguoiTao, soLuong: 0, doanhThu: 0, soDon: 0, key: item.nguoiTao };
            }
            staffMap[item.nguoiTao].doanhThu += rev;
            staffMap[item.nguoiTao].soDon += 1;
        });

        setStats({
            totalRevenue: totalRev,
            installmentCount: installmentCount,
            installmentRate: data.length > 0 ? ((installmentCount / data.length) * 100).toFixed(1) : 0,
            pendingRevenue: pendingRev
        });

        setIndustryData(Object.values(industryMap));
        setStaffData(Object.values(staffMap).sort((a, b) => b.doanhThu - a.doanhThu));
    };

    const resetFilters = () => {
        setFilters({ creator: 'All', status: 'All', keyword: '' });
        message.info("Đã xóa bộ lọc");
    };

  return (
    <div style={{ padding: 32, background: "#fbfbfd", minHeight: "100vh" }}>
      <input type="file" accept=".xlsx, .xls, .csv" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />

      <Row justify="space-between" align="middle" style={{ marginBottom: 18 }}>
        <Col>
          <h2 style={{ margin: 0 }}>Dashboard Doanh Thu</h2>
          <div style={{ color: "#8c8c8c", fontSize: 13 }}>
            Dữ liệu: {allData.length > 0 ? `Đã tải ${allData.length} dòng` : "Chưa có dữ liệu"}
          </div>
        </Col>
        <Col>
            <Button type="primary" icon={<PlusOutlined />} style={{ marginRight: 8 }} onClick={handleImportClick}>
                Nhập YCX (Excel)
            </Button>
          <Button icon={<FilterOutlined />}>Cài đặt</Button>
        </Col>
      </Row>

      <Spin spinning={loading} tip="Đang xử lý...">
          {/* Truyền các danh sách và hàm điều khiển vào Bộ Lọc */}
          <FilterPanel 
            creators={uniqueCreators} 
            statuses={uniqueStatuses} 
            filters={filters}
            setFilters={setFilters}
            onReset={resetFilters}
          />
          
          <OverviewSection stats={stats} />
          <CategoryChartBar industryData={industryData} totalRevenue={stats.totalRevenue} />
          
          <Tabs defaultActiveKey="1" size="small" style={{ margin: "12px 0" }}>
            <TabPane tab="Top Bán Chạy" key="1">
              <TopStaffRanking staffData={staffData} />
            </TabPane>
            <TabPane tab="Bảng Hiệu Suất" key="2">Đang cập nhật</TabPane>
          </Tabs>
          
          <DetailIndustryTable industryData={industryData} totalRevenue={stats.totalRevenue} />
      </Spin>
    </div>
  );
}