import React, { useState, useEffect, useRef, useMemo } from "react";
import * as XLSX from "xlsx";
import { Row, Col, Card, Button, Select, DatePicker, Input, Table, Tabs, Tag, Space, Spin, message } from "antd";
import {
  ReloadOutlined,
  PlusOutlined,
  FilterOutlined,
  BarChartOutlined,
  FundOutlined,
  PieChartOutlined,
  TableOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  SearchOutlined
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
// 1. CẤU HÌNH LOGIC NGHIỆP VỤ
// ==========================================
const ALLOWED_IDS = ["1034", "1116", "1214", "1274", "13", "1394", "16", "164", "1754", "1755", "1756", "184", "22", "23", "244", "304", "484", "664"];

const isAllowedProduct = (industryStr, groupStr) => {
    const check = (str) => str && ALLOWED_IDS.some(id => str.toString().startsWith(id));
    return check(industryStr) || check(groupStr);
};

const getConversionCoefficient = (industryStr, groupStr) => {
    const id = groupStr ? groupStr.toString().split(" - ")[0] : (industryStr ? industryStr.toString().split(" - ")[0] : "");
    if (id === "664") return 5.45;
    if (id === "164") return 4.18; 
    if (["184", "1394", "16"].includes(id)) return 3.37;
    if (["1274", "23"].includes(id)) return 3.00;
    if (id === "1034") return 1.92;
    if (["484", "1214", "1116"].includes(id)) return 1.85;
    if (id === "304") return 1.0; 
    return 1.0;
};

// ==========================================
// 2. COMPONENT BỘ LỌC
// ==========================================

function FilterPanel({ creators, statuses, filters, setFilters, onReset }) {
  const handleChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleTimeSelect = (value) => {
      let start, end;
      const today = moment();
      switch (value) {
          case 'today': start = today.clone().startOf('day'); end = today.clone().endOf('day'); break;
          case 'this_week': start = today.clone().startOf('week'); end = today.clone().endOf('week'); break;
          case 'this_month': start = today.clone().startOf('month'); end = today.clone().endOf('month'); break;
          case 'last_month': start = today.clone().subtract(1, 'months').startOf('month'); end = today.clone().subtract(1, 'months').endOf('month'); break;
          default: start = null; end = null; break;
      }
      setFilters(prev => ({ ...prev, dateRange: start ? [start, end] : [] }));
  };

  return (
    <Card style={{ marginBottom: 20, background: "#fff" }}>
      <Row gutter={16} align="middle" justify="start">
        <Col span={4}>
          <div><b>Người tạo ({creators.length})</b></div>
          <Select 
            mode="multiple" allowClear placeholder="Chọn nhân viên..."
            value={filters.creators} onChange={(val) => handleChange('creators', val)}
            size="small" style={{ width: "100%" }} showSearch optionFilterProp="children" maxTagCount={1}
          >
            {creators.map(c => <Option key={c} value={c}>{c}</Option>)}
          </Select>
        </Col>
        <Col span={4}>
          <div><b>Trạng thái xuất</b></div>
          <Select 
            mode="multiple" allowClear placeholder="Chọn trạng thái..."
            value={filters.statuses} onChange={(val) => handleChange('statuses', val)}
            size="small" style={{ width: "100%" }}
          >
            {statuses.map(s => <Option key={s} value={s}>{s}</Option>)}
          </Select>
        </Col>
        <Col span={4}>
          <div><b>Khoảng thời gian</b></div>
          <Select defaultValue="all" size="small" style={{ width: "100%" }} onChange={handleTimeSelect}>
            <Option value="all">Tất cả</Option>
            <Option value="today">Hôm nay</Option>
            <Option value="this_week">Tuần này</Option>
            <Option value="this_month">Tháng này</Option>
            <Option value="last_month">Tháng trước</Option>
          </Select>
        </Col>
        <Col span={6}>
          <div><b>Từ ngày - Đến ngày</b></div>
          <RangePicker 
            size="small" style={{width: "100%"}} 
            value={filters.dateRange} onChange={(dates) => handleChange('dateRange', dates)}
            format="DD/MM/YYYY"
          /> 
        </Col>
        <Col span={4}>
          <div><b>Tìm kiếm</b></div>
          <Input 
            placeholder="Mã ĐH, Tên SP..." size="small" prefix={<SearchOutlined />}
            value={filters.keyword} onChange={(e) => handleChange('keyword', e.target.value)}
          />
        </Col>
        <Col span={2}>
          <Button icon={<ReloadOutlined />} size="small" style={{marginTop: 22}} onClick={onReset}>Xóa lọc</Button>
        </Col>
      </Row>
    </Card>
  );
}

// ==========================================
// 3. CÁC COMPONENT HIỂN THỊ
// ==========================================

function OverviewSection({ stats }) {
  const effColor = stats.conversionEfficiency >= 0 ? "#55c778" : "#f5222d";
  const EffIcon = stats.conversionEfficiency >= 0 ? ArrowUpOutlined : ArrowDownOutlined;

  const overviewData = [
    {
      title: "TỔNG DOANH THU",
      value: formatMoneyShort(stats.totalRevenue),
      sub: `Tổng số lượng: ${stats.totalQuantity}`,
      icon: <FundOutlined style={{ color: "#1890ff" }} />,
      color: "#eaf6ff"
    },
    {
      title: "TỈ TRỌNG QUY ĐỔI", // Đã đổi tên label theo yêu cầu
      value: `${stats.conversionEfficiency > 0 ? '+' : ''}${stats.conversionEfficiency}%`,
      sub: "(DTQĐ - DT Thực) / DT Thực",
      icon: <EffIcon style={{ color: effColor }} />,
      color: "#edf7ef",
      isHighlight: true
    },
    {
      title: "TỶ LỆ TRẢ GÓP",
      value: stats.installmentRate + "%",
      sub: `SL HĐ Trả góp: ${stats.installmentCount}`,
      icon: <PieChartOutlined style={{ color: "#FF8042" }} />,
      color: "#fff7ea"
    },
    {
      title: "DOANH THU QĐ CHỜ XUẤT",
      value: formatMoneyShort(stats.pendingConvertedRevenue),
      sub: `Tích lũy chờ duyệt`,
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
            <div style={{ fontSize: 28, fontWeight: 700, color: item.isHighlight ? effColor : 'inherit' }}>
                {item.value}
            </div>
            <div style={{ fontSize: 12, color: "#888", whiteSpace: "pre-line" }}>{item.sub}</div>
          </Card>
        </Col>
      ))}
    </Row>
  );
}

function CategoryChartBar({ industryData, totalRevenue }) {
    const parentData = industryData.filter(i => !i.isChild && i.doanhThu > 0).sort((a, b) => b.doanhThu - a.doanhThu);
    
    return (
        <Card style={{ marginBottom: 20 }}>
            <b>Tỷ trọng ngành hàng (Theo Doanh thu)</b>
            <div style={{ display: "flex", gap: 24, marginTop: 15, overflowX: 'auto', paddingBottom: 10 }}>
                {parentData.length > 0 ? parentData.map((item, index) => {
                    const percent = totalRevenue > 0 ? (item.doanhThu / totalRevenue) * 100 : 0;
                    const colors = ["#3dc6fd", "#55c778", "#FF8042", "#af96fc", "#ffc107", "#f5222d"];
                    const color = colors[index % colors.length];
                    const displayName = item.name.includes("-") ? item.name.split("-")[1] : item.name;
                    
                    return (
                        <div key={item.key} style={{minWidth: 100}}>
                            <b style={{fontSize: 13}}>{displayName}</b>
                            <div style={{fontSize: 15, fontWeight: 'bold'}}>{formatMoneyShort(item.doanhThu)}</div>
                            <div style={{ height: 6, width: "100%", maxWidth: 100, background: "#f0f0f0", margin: "6px 0", borderRadius: 6, overflow: 'hidden'}}>
                                <div style={{ height: '100%', width: `${percent}%`, background: color }}></div>
                            </div>
                            <span style={{ fontSize: 12, color: color }}>{percent.toFixed(1)}%</span>
                        </div>
                    )
                }) : <div style={{padding: 20, color: '#999'}}>Không có dữ liệu phù hợp</div>}
            </div>
        </Card>
    );
}

function TopStaffRanking({ staffData, totalRevenue }) {
  const personalTarget = totalRevenue * 0.1;

  return (
    <Card size="small" style={{ marginBottom: 20 }}>
      <b>Bảng Phân Tích Nhân Viên</b>
      <Table
        dataSource={staffData}
        pagination={{ pageSize: 5 }}
        size="small"
        rowKey="key"
        columns={[
          {title: "#", render: (text, record, index) => index + 1, width: 40},
          {title: "Nhân Viên", dataIndex: "name", key: "name"},
          {title: "Doanh Thu", dataIndex: "doanhThu", key: "doanhThu", render: val => formatMoneyShort(val), align: 'right'},
          {title: "DTQĐ", dataIndex: "dtqd", key: "dtqd", render: val => <b style={{color: "#1890ff"}}>{formatMoneyShort(val)}</b>, align: 'right'},
          {title: "Tỉ trọng QĐ", dataIndex: "efficiency", key: "efficiency", align: 'center',
             render: val => <span style={{color: val >= 0 ? "green" : "red", fontWeight: 'bold'}}>{val > 0 ? '+' : ''}{val}%</span>
          },
          {title: "% Mục Tiêu", key: "target", 
             render: (_, record) => {
                 const p = personalTarget > 0 ? (record.doanhThu / personalTarget) * 100 : 0;
                 return <Tag color={p >= 100 ? "green" : "orange"}>{p.toFixed(0)}%</Tag>
             }, align: 'center'
          },
          {title: "Bảo Hiểm", dataIndex: "bhRevenue", key: "bhRevenue", render: val => formatMoneyShort(val), align: 'right'},
        ]}
      />
    </Card>
  );
}

function DetailIndustryTable({ industryData, totalRevenue }) {
    const totalRow = industryData.reduce((acc, item) => {
        if (!item.isChild) {
            return {
                ...acc,
                soLuong: acc.soLuong + item.soLuong,
                doanhThu: acc.doanhThu + item.doanhThu,
                dtqd: acc.dtqd + item.dtqd
            };
        }
        return acc;
    }, { name: "TỔNG CỘNG", soLuong: 0, doanhThu: 0, dtqd: 0, key: "total", children: null });

    const dataSource = [...industryData, totalRow];

    const columns = [
        { title: "NGÀNH HÀNG / NHÓM HÀNG", dataIndex: "name", key: "name", width: 300, 
          render: (text, record) => record.name === "TỔNG CỘNG" ? <b>{text}</b> : text 
        },
        { title: "SỐ LƯỢNG", dataIndex: "soLuong", key: "soLuong", align: 'center', 
          render: (val, record) => record.name === "TỔNG CỘNG" ? <b>{val}</b> : val 
        },
        { title: "DOANH THU", dataIndex: "doanhThu", key: "doanhThu", align: 'right',
          render: (val, record) => record.name === "TỔNG CỘNG" ? <b>{formatMoneyShort(val)}</b> : formatMoneyShort(val)
        },
        { title: "DT QUY ĐỔI (DTQD)", dataIndex: "dtqd", key: "dtqd", align: 'right',
          render: (val, record) => <b style={{color: "#1890ff"}}>{formatMoneyShort(val)}</b>
        },
        { title: "HỆ SỐ", dataIndex: "coefficient", key: "coefficient", align: 'center', 
          render: val => val ? <Tag color="blue">{val}</Tag> : "" 
        },
        { title: "TỈ TRỌNG QĐ", key: "efficiency", align: 'right',
          render: (_, record) => {
             if(record.name === "TỔNG CỘNG") return "";
             // Công thức hàng: (DTQD - DT)/DT
             const eff = record.doanhThu > 0 ? ((record.dtqd - record.doanhThu)/record.doanhThu)*100 : 0;
             const color = eff >= 0 ? "#55c778" : "#f5222d";
             return <span style={{color: color, fontWeight: 'bold'}}>{eff > 0 ? '+' : ''}{eff.toFixed(1)}%</span>
          }
        },
        { title: "% CHẠM", key: "percent", 
          render: (_, record) => {
             if(record.name === "TỔNG CỘNG") return "";
             const target = totalRevenue * 0.1;
             const p = target > 0 ? (record.doanhThu / target) * 100 : 0;
             return <span>{p.toFixed(0)}%</span>
          },
          align: 'right'
        }
    ];

  return (
    <Card>
        <b>CHI TIẾT NGÀNH HÀNG (Drill-down)</b>
        <Table columns={columns} dataSource={dataSource} scroll={{x: 1000}} pagination={false} size="small" rowKey="key"/>
    </Card>
  );
}

// ==========================================
// 4. COMPONENT CHÍNH
// ==========================================

export default function ExcelDashboard() {
    const [allData, setAllData] = useState([]); 
    const [filters, setFilters] = useState({ creators: [], statuses: [], dateRange: [], keyword: '' });

    const [stats, setStats] = useState({ 
        totalRevenue: 0, totalQuantity: 0, totalConvertedRevenue: 0,
        conversionEfficiency: 0, installmentRate: 0, installmentCount: 0,
        totalContracts: 0, pendingConvertedRevenue: 0
    });
    const [industryData, setIndustryData] = useState([]);
    const [staffData, setStaffData] = useState([]);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef(null);

    const uniqueCreators = useMemo(() => {
        const list = allData.map(item => item.nguoiTao).filter(Boolean);
        return [...new Set(list)].sort();
    }, [allData]);

    const uniqueStatuses = useMemo(() => {
        const list = allData.map(item => item.trangThaiXuat).filter(Boolean);
        return [...new Set(list)].sort();
    }, [allData]);

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

            const mappedData = dataExcel.map((row, index) => ({
                key: index,
                nguoiTao: row['Người tạo'] || "Unknown",
                nganhHang: row['Ngành hàng'] || "",
                nhomHang: row['Nhóm hàng'] || "",
                soLuong: Number(row['Số lượng']) || 0,
                doanhThu: Number(row['Phải thu']) || 0,
                loaiYCX: row['Loại YCX'] || "",
                trangThaiXuat: row['Trạng thái xuất'] || "",
                tenSP: row['Tên sản phẩm'] || "",
                maDonHang: row['Mã đơn hàng'] || "",
                ngayTao: row['Ngày tạo'] ? moment(row['Ngày tạo']) : null 
            }));
            setAllData(mappedData);
            setLoading(false);
            message.success(`Đã tải lên ${mappedData.length} dòng dữ liệu!`);
        };
        reader.readAsBinaryString(file);
    };

    useEffect(() => {
        if (allData.length === 0) return;

        const filteredData = allData.filter(item => {
            const matchCreator = filters.creators.length === 0 || filters.creators.includes(item.nguoiTao);
            const matchStatus = filters.statuses.length === 0 || filters.statuses.includes(item.trangThaiXuat);
            const keyword = filters.keyword.toLowerCase();
            const matchKeyword = !keyword || item.tenSP.toString().toLowerCase().includes(keyword) || item.maDonHang.toString().toLowerCase().includes(keyword);
            let matchDate = true;
            if (filters.dateRange && filters.dateRange.length === 2 && item.ngayTao) {
                const start = filters.dateRange[0].startOf('day');
                const end = filters.dateRange[1].endOf('day');
                matchDate = item.ngayTao.isBetween(start, end, null, '[]');
            }
            return matchCreator && matchStatus && matchKeyword && matchDate;
        });
        processStatistics(filteredData);
    }, [allData, filters]);

    const processStatistics = (data) => {
        let totalRev = 0;
        let totalQty = 0;
        let totalConvertedRev = 0;
        let installmentCount = 0;
        let pendingConvertedRev = 0;
        let bhRevenue = 0;
        
        const hierarchyMap = {};
        const staffMap = {};

        data.forEach(item => {
            if (!isAllowedProduct(item.nganhHang, item.nhomHang)) return; 

            const rev = item.doanhThu;
            const qty = item.soLuong;
            const coefficient = getConversionCoefficient(item.nganhHang, item.nhomHang);
            const convertedRev = rev * coefficient;

            totalRev += rev;
            totalQty += qty;
            totalConvertedRev += convertedRev;
            if (coefficient === 4.18) bhRevenue += rev;

            if (item.loaiYCX && item.loaiYCX.toLowerCase().includes("trả góp")) installmentCount++;
            if (item.trangThaiXuat && item.trangThaiXuat !== "Đã xuất") pendingConvertedRev += convertedRev;

            // Hierarchy
            const parentKey = item.nganhHang || "Khác";
            const childKey = item.nhomHang || "Khác";

            if (!hierarchyMap[parentKey]) {
                hierarchyMap[parentKey] = {
                    key: parentKey, name: parentKey,
                    soLuong: 0, doanhThu: 0, dtqd: 0, childrenMap: {}, isChild: false
                };
            }
            hierarchyMap[parentKey].soLuong += qty;
            hierarchyMap[parentKey].doanhThu += rev;
            hierarchyMap[parentKey].dtqd += convertedRev;

            if (!hierarchyMap[parentKey].childrenMap[childKey]) {
                hierarchyMap[parentKey].childrenMap[childKey] = {
                    key: `${parentKey}-${childKey}`, name: childKey,
                    soLuong: 0, doanhThu: 0, dtqd: 0, coefficient: (coefficient * 100).toFixed(0) + "%", isChild: true
                };
            }
            hierarchyMap[parentKey].childrenMap[childKey].soLuong += qty;
            hierarchyMap[parentKey].childrenMap[childKey].doanhThu += rev;
            hierarchyMap[parentKey].childrenMap[childKey].dtqd += convertedRev;

            // Staff
            const staffKey = item.nguoiTao || "Unknown";
            if (!staffMap[staffKey]) {
                staffMap[staffKey] = { name: staffKey, soLuong: 0, doanhThu: 0, dtqd: 0, bhRevenue: 0, key: staffKey };
            }
            staffMap[staffKey].doanhThu += rev;
            staffMap[staffKey].dtqd += convertedRev;
            if (coefficient === 4.18) staffMap[staffKey].bhRevenue += rev;
        });

        const finalIndustryData = Object.values(hierarchyMap).map(parent => ({
            ...parent,
            children: Object.values(parent.childrenMap).sort((a, b) => b.doanhThu - a.doanhThu)
        })).sort((a, b) => b.doanhThu - a.doanhThu);

        // ==========================================================================
        // CẬP NHẬT CÔNG THỨC TỈ TRỌNG (HIỆU QUẢ) = (DTQD - DT)/DT
        // ==========================================================================
        const efficiency = totalRev > 0 ? ((totalConvertedRev - totalRev) / totalRev) * 100 : 0;
        
        const installmentRate = data.length > 0 ? (installmentCount / data.length) * 100 : 0;

        // Cập nhật hiệu quả cho từng nhân viên
        const finalStaffData = Object.values(staffMap).map(st => ({
            ...st,
            efficiency: st.doanhThu > 0 ? ((st.dtqd - st.doanhThu)/st.doanhThu)*100 : 0
        })).sort((a, b) => b.dtqd - a.dtqd);

        setStats({
            totalRevenue: totalRev,
            totalQuantity: totalQty,
            totalConvertedRevenue: totalConvertedRev,
            conversionEfficiency: efficiency.toFixed(2),
            installmentRate: installmentRate.toFixed(1),
            installmentCount: installmentCount,
            totalContracts: data.length,
            pendingConvertedRevenue: pendingConvertedRev
        });

        setIndustryData(finalIndustryData);
        setStaffData(finalStaffData);
    };

    const resetFilters = () => {
        setFilters({ creators: [], statuses: [], dateRange: [], keyword: '' });
        message.info("Đã xóa bộ lọc");
    };

  return (
    <div style={{ padding: 32, background: "#fbfbfd", minHeight: "100vh" }}>
      <input type="file" accept=".xlsx, .xls, .csv" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />
      <Row justify="space-between" align="middle" style={{ marginBottom: 18 }}>
        <Col>
          <h2 style={{ margin: 0 }}>Dashboard Hiệu Quả Kinh Doanh</h2>
          <div style={{ color: "#8c8c8c", fontSize: 13 }}>Dữ liệu: {allData.length > 0 ? `Đã tải ${allData.length} dòng` : "Vui lòng nhập file Excel"}</div>
        </Col>
        <Col>
            <Button type="primary" icon={<PlusOutlined />} style={{ marginRight: 8 }} onClick={handleImportClick}>Nhập YCX (Excel)</Button>
            <Button icon={<FilterOutlined />}>Cài đặt</Button>
        </Col>
      </Row>
      <Spin spinning={loading} tip="Đang xử lý dữ liệu...">
          <FilterPanel creators={uniqueCreators} statuses={uniqueStatuses} filters={filters} setFilters={setFilters} onReset={resetFilters} />
          <OverviewSection stats={stats} />
          <Tabs defaultActiveKey="1" size="small" style={{ margin: "12px 0" }}>
            <TabPane tab="Phân Tích Nhân Viên" key="1"><TopStaffRanking staffData={staffData} totalRevenue={stats.totalRevenue} /></TabPane>
            <TabPane tab="Biểu đồ Ngành Hàng" key="2"><CategoryChartBar industryData={industryData} totalRevenue={stats.totalRevenue} /></TabPane>
          </Tabs>
          <DetailIndustryTable industryData={industryData} totalRevenue={stats.totalRevenue} />
      </Spin>
    </div>
  );
}