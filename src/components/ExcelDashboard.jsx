import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import * as XLSX from "xlsx";
import Tesseract from 'tesseract.js'; 
import { Row, Col, Card, Button, Select, DatePicker, Input, Table, Tabs, Tag, Space, Spin, message, Progress, Popover, Checkbox, Divider, Tooltip, Upload } from "antd";
import {
  ReloadOutlined,
  PlusOutlined,
  BarChartOutlined,
  FundOutlined,
  PieChartOutlined,
  TableOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  SearchOutlined,
  TrophyOutlined,
  RiseOutlined,
  FilterFilled,
  UserOutlined,
  AppstoreOutlined,
  SettingOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CameraOutlined,
  InfoCircleOutlined,
  UploadOutlined,
  ScanOutlined
} from "@ant-design/icons";
import moment from "moment";
import html2canvas from 'html2canvas';

const { Option } = Select;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

// ==========================================
// STYLES & HELPERS (CẬP NHẬT STYLES CHUYÊN NGHIỆP)
// ==========================================
const cardStyle = {
  borderRadius: 12,
  boxShadow: "0 6px 18px rgba(0,0,0,0.1)", // Shadow sâu hơn
  border: "1px solid #e8e8e8", // Thêm viền nhẹ
  overflow: "hidden"
};

const gradientText = {
  background: "linear-gradient(45deg, #1890ff, #722ed1)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  fontWeight: 800
};

// Định nghĩa màu sắc chủ đạo
const PRIMARY_COLOR = '#1890ff';
const SUCCESS_COLOR = '#52c41a';
const ERROR_COLOR = '#f5222d';
const WARNING_COLOR = '#faad14';

const formatMoneyShort = (amount) => {
  if (!amount) return "0";
  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";

  if (absAmount >= 1000000000) return sign + (absAmount / 1000000000).toFixed(1) + " Tỷ";
  if (absAmount >= 1000000) return sign + (absAmount / 1000000).toFixed(1) + " Tr";
  if (absAmount >= 1000) return sign + (absAmount / 1000).toFixed(0) + " k";
  return amount.toLocaleString('vi-VN');
};

// ==========================================
// CORE LOGIC: HỆ SỐ & HÀM CHỤP HÌNH (GIỮ NGUYÊN)
// ==========================================

const ALLOWED_IDS = ["1034", "1116", "1214", "1274", "13", "1394", "16", "164", "1754", "1755", "1756", "184", "22", "23", "244", "304", "484", "664"];

const ALLOWED_EXPORT_TYPES = [
    "Xuất bán ưu đãi cho nhân viên",
    "Xuất bán pre-order tại siêu thị",
    "Xuất đổi bảo hành sản phẩm IMEI",
    "Xuất sử dụng gói đổi trả hàng dùng thử",
    "Xuất đổi bảo hành sản phẩm trả góp có IMEI",
    "Xuất bán hàng tại siêu thị",
    "Xuất bán hàng trả góp tại siêu thị",
    "Xuất SIM trắng kèm theo SIM",
    "Xuất dịch vụ thu hộ bảo hiểm",
    "Xuất dịch vụ bảo hành trọn đời",
    "Xuất đổi bảo hành tại siêu thị",
    "Xuất cung ứng dịch vụ bảo dưỡng trọn đời",
    "Xuất dịch vụ bảo dưỡng trọn đời"
];

const isAllowedProduct = (industryStr, groupStr) => {
    const check = (str) => str && ALLOWED_IDS.some(id => str.toString().startsWith(id));
    return check(industryStr) || check(groupStr);
};

const getConversionCoefficient = (industryStr, groupStr) => {
    const iID = industryStr ? industryStr.toString().split(" - ")[0].trim() : "";
    const gID = groupStr ? groupStr.toString().split(" - ")[0].trim() : "";
    
    const str = (groupStr || industryStr || "").toLowerCase();

    if (iID === "664" || str.includes("sim")) return 5.45;
    if (iID === "164" || str.includes("bảo hiểm")) {
        if (gID === "4479" || str.includes("bảo hiểm")) return 4.18;
        return 1.0;
    }
    if (["16", "184", "1394"].includes(iID)) return 3.37;
    if (["1274", "23"].includes(iID)) return 3.00;
    if (iID === "1034") return 1.92;
    if (iID === "1116") {
        if (gID === "4171") return 1.85;
        return 1.92;
    }
    if (["484", "1214"].includes(iID)) return 1.85;
    if (iID === "304") {
        if (gID === "880" || str.includes("loa") || str.includes("karaoke")) return 1.29;
        if (str.includes("dàn máy") || str.includes("âm thanh")) return 1.02;
        return 1.0;
    }
    if (str.includes("xe đạp")) return 1.12;
    return 1.0;
};

const captureTable = async (elementId, filename) => {
    const input = document.getElementById(elementId);
    if (!input) {
        message.error("Không tìm thấy bảng để chụp hình.");
        return;
    }

    try {
        const canvas = await html2canvas(input, {
            scale: 2,
            useCORS: true, 
        });

        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        message.success(`Đã chụp và tải xuống: ${filename}`);
    } catch (error) {
        console.error("Lỗi khi chụp hình:", error);
        message.error("Lỗi khi chụp hình, vui lòng thử lại.");
    }
};

// ==========================================
// COMPONENT BỘ LỌC TỔNG (ĐÃ CẬP NHẬT CHUYÊN NGHIỆP HƠN)
// ==========================================

function FilterPanel({ creators, statuses, exportTypes, returnStatuses, filters, setFilters, onReset }) {
  const handleChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const QUICK_DATE_OPTIONS = [
    { label: "Tất cả", value: "all" },
    { label: "Hôm nay", value: "today" },
    { label: "Tuần này", value: "this_week" },
    { label: "Tháng này", value: "this_month" },
    { label: "Tháng trước", value: "last_month" }
  ];

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
    <Card 
        style={{ ...cardStyle, marginBottom: 20 }}
        title={<span style={{color: PRIMARY_COLOR, fontWeight: 700}}><FilterFilled /> BỘ LỌC DỮ LIỆU TỔNG HỢP</span>}
        extra={
            <Button 
                type="primary" 
                danger 
                icon={<ReloadOutlined />} 
                onClick={onReset} 
                size="large" 
                style={{borderRadius: 6, fontWeight: 600}}
            >
                Đặt lại bộ lọc
            </Button>
        }
    >
      <Row gutter={[20, 16]} align="bottom" justify="start">

        {/* 1. Người tạo */}
        <Col xs={24} sm={12} md={6} lg={3}>
          <div style={{color: "#444", marginBottom: 4, fontWeight: 600}}>Người tạo</div>
          <Select 
            mode="multiple" allowClear placeholder="Chọn nhân viên..."
            value={filters.creators} onChange={(val) => handleChange('creators', val)}
            size="large" style={{ width: "100%" }} showSearch optionFilterProp="children" maxTagCount={1}
          >
            {creators.map(c => <Option key={c} value={c}>{c}</Option>)}
          </Select>
        </Col>

        {/* 2. Trạng thái xuất */}
        <Col xs={24} sm={12} md={6} lg={3}>
          <div style={{color: "#444", marginBottom: 4, fontWeight: 600}}>Trạng thái xuất</div>
          <Select 
            mode="multiple" allowClear placeholder="Chọn trạng thái..."
            value={filters.statuses} onChange={(val) => handleChange('statuses', val)}
            size="large" style={{ width: "100%" }}
          >
            {statuses.map(s => <Option key={s} value={s}>{s}</Option>)}
          </Select>
        </Col>

        {/* 3. Hình thức xuất */}
        <Col xs={24} sm={12} md={6} lg={4}>
          <div style={{color: "#444", marginBottom: 4, fontWeight: 600}}>Hình thức xuất</div>
          <Select 
            mode="multiple" allowClear placeholder="Chọn hình thức..."
            value={filters.exportTypes} onChange={(val) => handleChange('exportTypes', val)}
            size="large" style={{ width: "100%" }} maxTagCount={1}
          >
            {exportTypes.map(s => <Option key={s} value={s}>{s}</Option>)}
          </Select>
        </Col>

        {/* 4. Tình trạng nhập trả */}
        <Col xs={24} sm={12} md={6} lg={4}>
          <div style={{color: "#444", marginBottom: 4, fontWeight: 600}}>Tình trạng nhập trả</div>
          <Select 
            mode="multiple" allowClear placeholder="Chọn tình trạng..."
            value={filters.returnStatuses} onChange={(val) => handleChange('returnStatuses', val)}
            size="large" style={{ width: "100%" }}
          >
            {returnStatuses.map(s => <Option key={s} value={s}>{s}</Option>)}
          </Select>
        </Col>

        {/* 5. Lọc nhanh thời gian */}
        <Col xs={24} sm={12} md={6} lg={4}>
          <div style={{color: "#444", marginBottom: 4, fontWeight: 600}}>Lọc nhanh thời gian</div>
          <Select 
            defaultValue="all" 
            size="large" 
            style={{ width: "100%" }} 
            onChange={handleTimeSelect}
            options={QUICK_DATE_OPTIONS}
          />
        </Col>

        {/* 6. Từ ngày - Đến ngày */}
        <Col xs={24} sm={12} md={6} lg={6}>
          <div style={{color: "#444", marginBottom: 4, fontWeight: 600}}>Từ ngày - Đến ngày</div>
          <RangePicker 
            size="large" style={{width: "100%"}} 
            value={filters.dateRange} onChange={(dates) => handleChange('dateRange', dates)}
            format="DD/MM/YYYY"
          /> 
        </Col>
      </Row>
    </Card>
  );
}

// ==========================================
// CÁC COMPONENT KHÁC (GIỮ NGUYÊN)
// ==========================================

function OverviewSection({ stats }) {
  const EffIcon = stats.conversionEfficiency >= 0 ? ArrowUpOutlined : ArrowDownOutlined;

  const TARGET_REAL = 3800000000; 
  const TARGET_CONVERTED = 4770000000;

  const percentReal = (stats.totalRevenue / TARGET_REAL) * 100;
  const percentConverted = (stats.totalConvertedRevenue / TARGET_CONVERTED) * 100;

  const cards = [
    { 
        title: "TỔNG DOANH THU THỰC", 
        value: formatMoneyShort(stats.totalRevenue), 
        sub: `Đạt ${percentReal.toFixed(1)}% (MT: 3.8 Tỷ)`, 
        icon: <FundOutlined style={{fontSize: 24, color: "#fff"}}/>, 
        background: "linear-gradient(135deg, #3C8CE7 10%, #00EAFF 100%)" 
    },
    { 
        title: "TỔNG DOANH THU QUY ĐỔI", 
        value: formatMoneyShort(stats.totalConvertedRevenue), 
        sub: `Đạt ${percentConverted.toFixed(1)}% (MT: 4.77 Tỷ)`, 
        icon: <RiseOutlined style={{fontSize: 24, color: "#fff"}}/>, 
        background: "linear-gradient(135deg, #667eea 10%, #764ba2 100%)" 
    },
    { 
        title: "HIỆU QUẢ QĐ (TỈ TRỌNG)", 
        value: `${stats.conversionEfficiency > 0 ? '+' : ''}${stats.conversionEfficiency}%`, 
        sub: "(DTQĐ - DT) / DT", 
        icon: <EffIcon style={{fontSize: 24, color: "#fff"}}/>, 
        background: stats.conversionEfficiency >= 0 ? "linear-gradient(135deg, #11998e 10%, #38ef7d 100%)" : "linear-gradient(135deg, #FF416C 10%, #FF4B2B 100%)" 
    },
    { 
        title: "TỶ LỆ GÓP (THEO DT)", 
        value: stats.installmentRate + "%", 
        sub: `DT Góp: ${formatMoneyShort(stats.installmentRevenue)}`, 
        icon: <PieChartOutlined style={{fontSize: 24, color: "#fff"}}/>, 
        background: "linear-gradient(135deg, #f2709c 10%, #ff9472 100%)" 
    }
  ];

  return (
    <Row gutter={20} style={{marginBottom: 20}}>
      {cards.map((item, idx) => (
        <Col span={6} key={idx}>
          <Card bordered={false} style={{ borderRadius: 16, background: item.background, boxShadow: "0 10px 20px -10px rgba(0,0,0,0.2)", height: 120 }}>
            <Row align="middle" justify="space-between">
                <Col>
                    <div style={{ color: "rgba(255,255,255,0.8)", fontWeight: 600, fontSize: 12, textTransform: "uppercase", marginBottom: 4 }}>{item.title}</div>
                    <div style={{ fontSize: 26, fontWeight: 700, color: "#fff" }}>{item.value}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>{item.sub}</div>
                </Col>
                <Col><div style={{ background: "rgba(255,255,255,0.2)", borderRadius: "50%", padding: 10 }}>{item.icon}</div></Col>
            </Row>
          </Card>
        </Col>
      ))}
    </Row>
  );
}

// Biểu đồ cột thể hiện tỷ trọng Ngành hàng
function CategoryChartBar({ industryData, totalRevenue }) {
    // Chỉ lấy Ngành hàng (Parent) và sắp xếp theo DT
    const parentData = industryData.filter(i => !i.isChild).sort((a, b) => b.doanhThu - a.doanhThu).slice(0, 8);
    const colors = ["#1890ff", "#52c41a", "#faad14", "#722ed1", "#eb2f96", "#fadb14", "#13c2c2", "#fa541c"]; // Màu đơn sắc cho dễ nhìn

    return (
        <Card style={cardStyle} title={<span style={{color: PRIMARY_COLOR}}><BarChartOutlined/> Tỷ trọng Ngành hàng (Top 8)</span>}>
            <div style={{ height: 400, overflowY: 'auto', paddingRight: 10 }}>
                {parentData.length > 0 ? parentData.map((item, index) => {
                    const percent = totalRevenue > 0 ? (item.doanhThu / totalRevenue) * 100 : 0;
                    const color = colors[index % colors.length];
                    return (
                        <div key={item.key} style={{marginBottom: 16}}>
                            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13}}>
                                <span><Tag color={color} style={{fontWeight: 'bold', fontSize: 11}}>{(item.name.split(' - ')[0] || "---").trim()}</Tag> <b>{item.name.includes("-") ? item.name.split("-")[1] : item.name}</b></span>
                                <b>{formatMoneyShort(item.doanhThu)}</b>
                            </div>
                            <Progress 
                                percent={percent} 
                                showInfo={true} 
                                size="small" 
                                strokeColor={color} 
                                format={p => <span style={{fontSize: 11}}>{p.toFixed(1)}%</span>}
                            />
                        </div>
                    )
                }) : <div style={{padding: 20, color: '#999'}}>Không có dữ liệu Ngành hàng</div>}
            </div>
        </Card>
    );
}

function StaffHorizontalChart({ staffData }) {
  const sortedStaff = [...staffData].sort((a, b) => b.doanhThu - a.doanhThu).slice(0, 10);
  const maxRevenue = sortedStaff.length > 0 ? sortedStaff[0].doanhThu : 0;
  return (
    <Card style={{ ...cardStyle, height: '100%' }} title={<span style={{color: PRIMARY_COLOR}}><TrophyOutlined /> Top 10 Doanh Thu NV</span>}>
      <div style={{ height: 400, overflowY: 'auto', paddingRight: 10 }}>
        {sortedStaff.map((staff, index) => {
          const percent = maxRevenue > 0 ? (staff.doanhThu / maxRevenue) * 100 : 0;
          const rankColor = index === 0 ? "#FFD700" : index === 1 ? "#C0C0C0" : index === 2 ? "#CD7F32" : "#eee";
          return (
            <div key={staff.key} style={{ marginBottom: 16 }}>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 2, fontSize: 13}}>
                 <span><Tag color="default" style={{borderColor: rankColor, color: index < 3 ? "#000" : "#666", background: index < 3 ? rankColor : "#fff"}}>#{index+1}</Tag> <b>{staff.name}</b></span>
                 <b>{formatMoneyShort(staff.doanhThu)}</b>
              </div>
              <Progress percent={percent} showInfo={false} strokeColor={{ '0%': PRIMARY_COLOR, '100%': SUCCESS_COLOR }} size="small" />
            </div>
          );
        })}
        {sortedStaff.length === 0 && <div style={{color: '#999'}}>Chưa có dữ liệu</div>}
      </div>
    </Card>
  );
}

// ==========================================
// CÁC BẢNG CHI TIẾT (ĐÃ CẬP NHẬT MÀU SẮC CHO BẢNG)
// ==========================================

function TopStaffRanking({ staffData, totalRevenue }) {
  const personalTarget = totalRevenue * 0.1;
  return (
    <Card size="small" style={cardStyle} title={<b style={{color: PRIMARY_COLOR}}>Bảng Chi Tiết Nhân Viên</b>}>
      <Table
        dataSource={staffData}
        pagination={{ pageSize: 10 }}
        size="small"
        rowKey="key"
        scroll={{ x: 'max-content' }}
        style={{ fontSize: '12px' }}
        columns={[
          {title: "#", render: (text, record, index) => index + 1, width: 50, align: 'center', fixed: 'left'},
          {title: "Nhân Viên", dataIndex: "name", key: "name", render: txt => <b style={{color: PRIMARY_COLOR, fontSize: 12}}>{txt}</b>, fixed: 'left'},
          {title: "Doanh Thu Thực", dataIndex: "doanhThu", key: "doanhThu", render: val => formatMoneyShort(val), align: 'right', sorter: (a, b) => a.doanhThu - b.doanhThu},
          {title: "Doanh Thu QĐ", dataIndex: "dtqd", key: "dtqd", render: val => <b style={{color: '#722ed1'}}>{formatMoneyShort(val)}</b>, align: 'right', sorter: (a, b) => a.dtqd - b.dtqd},
          {title: "Hiệu quả", dataIndex: "efficiency", key: "efficiency", align: 'center', render: val => <Tag color={val >= 0 ? SUCCESS_COLOR : ERROR_COLOR}>{val > 0 ? '+' : ''}{val.toFixed(2)}%</Tag>, sorter: (a, b) => a.efficiency - b.efficiency},
          {title: "% Mục Tiêu", key: "target", render: (_, record) => <Progress percent={personalTarget > 0 ? (record.doanhThu / personalTarget) * 100 : 0} size="small" steps={5} strokeColor={SUCCESS_COLOR} showInfo={false} />, align: 'center'},
          {title: "Bảo Hiểm", dataIndex: "bhRevenue", key: "bhRevenue", render: val => formatMoneyShort(val), align: 'right'},
        ]}
        // Cập nhật style cho header và row
        rowClassName={(record, index) => index % 2 === 0 ? 'ant-table-row-even' : 'ant-table-row-odd'}
      />
    </Card>
  );
}

// Bảng chi tiết Ngành hàng (Đã cập nhật màu sắc)
function DetailIndustryTable({ industryData, totalRevenue }) {
    const [selectedIndustries, setSelectedIndustries] = useState([]);
    const defaultCheckedList = ['soLuong', 'doanhThu', 'dtqd', 'coefficient', 'unitPrice', 'efficiency', 'percent'];
    const [checkedList, setCheckedList] = useState(defaultCheckedList);
    
    // Danh sách Ngành hàng / Nhóm hàng để tạo bộ lọc
    const industryOptions = useMemo(() => {
        return industryData.flatMap(item => [item.name, ...(item.children || []).map(c => c.name)]).filter((value, index, self) => self.indexOf(value) === index).sort();
    }, [industryData]);

    const filteredIndustryData = useMemo(() => {
        if (selectedIndustries.length === 0) return industryData;
        return industryData
            .map(parent => {
                const filteredChildren = (parent.children || []).filter(child => selectedIndustries.includes(child.name));
                const isParentSelected = selectedIndustries.includes(parent.name);

                if (isParentSelected || filteredChildren.length > 0) {
                    const childrenToInclude = (parent.children || []).filter(child => isParentSelected || selectedIndustries.includes(child.name));
                    
                    const newParent = { 
                        ...parent, 
                        children: childrenToInclude 
                    };

                    if(childrenToInclude.length > 0 && !isParentSelected) { 
                        newParent.soLuong = childrenToInclude.reduce((sum, item) => sum + item.soLuong, 0);
                        newParent.doanhThu = childrenToInclude.reduce((sum, item) => sum + item.doanhThu, 0);
                        newParent.dtqd = childrenToInclude.reduce((sum, item) => sum + item.dtqd, 0);
                        newParent.key = newParent.name + "_filtered"; 
                    }
                    
                    return newParent;
                }
                return null;
            })
            .filter(Boolean);
    }, [industryData, selectedIndustries]);


    const totalRow = useMemo(() => {
        const total = filteredIndustryData.reduce((acc, item) => {
            return {
                soLuong: acc.soLuong + item.soLuong,
                doanhThu: acc.doanhThu + item.doanhThu,
                dtqd: acc.dtqd + item.dtqd
            };
        }, { soLuong: 0, doanhThu: 0, dtqd: 0 });
        
        return { 
            key: "total", 
            name: "TỔNG CỘNG", 
            ...total, 
            children: null 
        };
    }, [filteredIndustryData]);

    const dataSourceWithChildren = useMemo(() => {
        return filteredIndustryData.map(parent => ({
            ...parent,
            children: parent.children || []
        }));
    }, [filteredIndustryData]);
    
    const dataSource = [...dataSourceWithChildren, totalRow];

    const allColumns = [
        { 
            title: "NGÀNH HÀNG / NHÓM HÀNG", dataIndex: "name", key: "name", width: 320, fixed: 'left',
            render: (text, record) => {
                if (record.name === "TỔNG CỘNG") return <b style={{color: ERROR_COLOR, fontSize: 13}}>{text}</b>;
                return <span style={{fontWeight: record.isChild ? 400 : 700, color: record.isChild ? '#444' : PRIMARY_COLOR}}>{text}</span>
            }
        },
        { 
            title: "SỐ LƯỢNG", dataIndex: "soLuong", key: "soLuong", align: 'center', width: 100,
            render: (val, record) => record.name === "TỔNG CỘNG" ? <b>{val}</b> : val 
        },
        { 
            title: "DOANH THU THỰC", dataIndex: "doanhThu", key: "doanhThu", align: 'right', width: 150,
            render: (val, record) => record.name === "TỔNG CỘNG" ? <b style={{color: ERROR_COLOR, fontSize: 13}}>{formatMoneyShort(val)}</b> : formatMoneyShort(val)
        },
        { 
            title: "DOANH THU QĐ", dataIndex: "dtqd", key: "dtqd", align: 'right', width: 150,
            render: (val, record) => <b style={{color: '#722ed1'}}>{formatMoneyShort(val)}</b>
        },
        { 
            title: "HỆ SỐ", dataIndex: "coefficient", key: "coefficient", align: 'center', width: 110,
            render: val => val ? <Tag color="purple">{val}</Tag> : "" 
        },
        { 
            title: "ĐƠN GIÁ TB", key: "unitPrice", align: 'right', width: 120,
            render: (_, record) => {
                if(record.name === "TỔNG CỘNG") return "";
                const price = record.soLuong > 0 ? record.doanhThu / record.soLuong : 0;
                return <span style={{color: "#555"}}>{formatMoneyShort(price)}</span>;
            }
        },
        { 
            title: "HIỆU QUẢ", key: "efficiency", align: 'right', width: 140,
            render: (_, record) => {
                if(record.name === "TỔNG CỘNG") return "";
                const eff = record.doanhThu > 0 ? ((record.dtqd - record.doanhThu)/record.doanhThu)*100 : 0;
                const color = eff >= 0 ? SUCCESS_COLOR : ERROR_COLOR;
                return <Tag color={color}>{eff > 0 ? '+' : ''}{eff.toFixed(1)}%</Tag>
            }
        },
        { 
            title: "% ĐÓNG GÓP", key: "percent", width: 180,
            render: (_, record) => {
                if(record.name === "TỔNG CỘNG") return "";
                const p = totalRevenue > 0 ? (record.doanhThu / totalRevenue) * 100 : 0;
                return <div style={{display: 'flex', alignItems: 'center', gap: 8}}><span style={{width: 35, fontSize: 12}}>{p.toFixed(1)}%</span><Progress percent={p} showInfo={false} size="small" strokeColor={PRIMARY_COLOR} /></div>
            }
        }
    ];

    const visibleColumns = allColumns.filter(col => col.key === 'name' || checkedList.includes(col.key));

    const content = (
        <Checkbox.Group 
            options={allColumns.map(c=>({label: c.title, value: c.key})).filter(c=>c.value !== 'name')} 
            value={checkedList} 
            onChange={setCheckedList}
            style={{display: 'flex', flexDirection: 'column', gap: 8}}
        />
    );

  return (
    <Card style={cardStyle}>
        <div style={{marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10}}>
            <div style={{fontWeight: 'bold', fontSize: 16, color: PRIMARY_COLOR}}>
                <TableOutlined /> CHI TIẾT NGÀNH HÀNG & NHÓM HÀNG
            </div>
            
            <div style={{display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                    <AppstoreOutlined style={{color: '#888'}} />
                    <Select 
                        mode="multiple" maxTagCount={1} placeholder="Lọc nhanh Ngành hàng" style={{width: 200}} size="small"
                        value={selectedIndustries} onChange={setSelectedIndustries} allowClear
                    >
                        {industryOptions.map(c => <Option key={c} value={c}>{c}</Option>)}
                    </Select>
                </div>
                <Divider type="vertical" />
                <Popover content={content} title="Ẩn/Hiện Cột" trigger="click" placement="bottomRight">
                    <Button icon={<SettingOutlined />} size="small">Cột</Button>
                </Popover>
            </div>
        </div>
        <Table 
            columns={visibleColumns} 
            dataSource={dataSource} 
            scroll={{x: 'max-content', y: 500}} 
            pagination={false} 
            size="small" 
            rowKey="key" 
            bordered 
            expandable={{defaultExpandAllRows: false}}
            style={{ fontSize: '12px' }}
            // Thêm style cho các hàng quan trọng (Hàng tổng cộng)
            rowClassName={(record, index) => record.name === "TỔNG CỘNG" ? 'summary-row' : ''}
        />
        {/* Thêm style CSS để làm đẹp bảng */}
        <style jsx global>{`
            .ant-table-wrapper {
                border-radius: 8px;
                overflow: hidden;
            }
            .ant-table-thead > tr > th {
                background-color: #f0f5ff !important; /* Màu xanh nhạt cho header */
                color: ${PRIMARY_COLOR} !important;
                font-weight: 700;
                text-transform: uppercase;
                border-bottom: 2px solid ${PRIMARY_COLOR};
            }
            .ant-table-row-even {
                background-color: #f9f9f9;
            }
            .summary-row {
                background-color: #fff1f0 !important; /* Màu đỏ nhạt cho hàng tổng cộng */
                font-weight: bold;
            }
            .summary-row td {
                border-top: 2px solid ${ERROR_COLOR} !important;
            }
        `}</style>
    </Card>
  );
}

// Bảng đơn giá trung bình (Đã cập nhật màu sắc)
function StaffAvgPriceTable({ rawData }) {
  const targetGroups = [
    { id: "1094", name: "Tivi LED (1094)", target: 9000000 },
    { id: "1097", name: "Tủ lạnh (1097)", target: 9000000 },
    { id: "1098", name: "Máy lạnh (1098)", target: 9000000 },
    { id: "1099", name: "Máy giặt (1099)", target: 9000000 },
    { id: "1491", name: "Smartphone (1491)", target: 7000000 },
    { id: "1274", name: "Laptop (1274)", target: 14000000 },
  ];

  const [selectedGroups, setSelectedGroups] = useState([]);

  const dataSource = useMemo(() => {
    const staffMap = {};

    rawData.forEach((item) => {
      const staffName = item.nguoiTao || "Unknown";
      const groupStr = (item.nhomHang || "").toString();
      
      const target = targetGroups.find(t => groupStr.startsWith(t.id));
      
      if (target) {
        if (!staffMap[staffName]) {
          staffMap[staffName] = { key: staffName, name: staffName };
          targetGroups.forEach(t => {
            staffMap[staffName][`${t.id}_rev`] = 0; 
            staffMap[staffName][`${t.id}_qty`] = 0; 
          });
        }
        staffMap[staffName][`${target.id}_rev`] += (item.doanhThu || 0);
        staffMap[staffName][`${target.id}_qty`] += (item.soLuong || 0);
      }
    });

    return Object.values(staffMap).map(staff => {
      const row = { key: staff.key, name: staff.name };
      targetGroups.forEach(t => {
        const rev = staff[`${t.id}_rev`];
        const qty = staff[`${t.id}_qty`];
        row[t.id] = qty > 0 ? (rev / qty) : 0;
        row[`${t.id}_qty`] = qty;
      });
      return row;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [rawData]);

  const visibleGroups = selectedGroups.length > 0 
    ? targetGroups.filter(g => selectedGroups.includes(g.id)) 
    : targetGroups;

  const columns = [
    {
      title: "Nhân Viên", dataIndex: "name", key: "name", fixed: "left", width: 180,
      render: text => <b style={{ color: PRIMARY_COLOR, fontSize: 12 }}>{text}</b>
    },
    ...visibleGroups.map(group => ({
      title: (
        <div style={{textAlign: 'center'}}>
            <div>{group.name.split('(')[0]}</div>
            <div style={{fontSize: 10, fontWeight: 400, color: '#888'}}>(MT: {formatMoneyShort(group.target)})</div>
        </div>
      ), 
      dataIndex: group.id, key: group.id, width: 150, align: "right",
      sorter: (a, b) => a[group.id] - b[group.id],
      render: (price, record) => {
        if (!price || price === 0) return <span style={{ color: "#eee" }}>-</span>;
        
        const isPass = price >= group.target;
        const color = isPass ? SUCCESS_COLOR : ERROR_COLOR;
        
        return (
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end'}}>
            <span style={{ color: color, fontWeight: 700, fontSize: 13 }}>
                {formatMoneyShort(price)}
            </span>
            <span style={{ fontSize: 11, color: "#999", fontStyle: 'italic' }}>SL: {record[`${group.id}_qty`]}</span>
          </div>
        );
      }
    }))
  ];

  return (
    <Card style={cardStyle} bodyStyle={{paddingTop: 10}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
          <div style={{fontSize: 16, fontWeight: 'bold', color: PRIMARY_COLOR}}><DollarOutlined /> Đơn Giá Trung Bình</div>
          <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
              <FilterFilled style={{color: '#888'}} />
              <span style={{fontSize: 13, color: '#555'}}>Lọc nhóm:</span>
              <Select 
                mode="multiple" 
                placeholder="Chọn nhóm hàng hiển thị" 
                style={{width: 250}} 
                size="small"
                value={selectedGroups}
                onChange={setSelectedGroups}
                maxTagCount={2}
              >
                {targetGroups.map(g => <Option key={g.id} value={g.id}>{g.name}</Option>)}
              </Select>
          </div>
      </div>
      <div style={{marginBottom: 10, fontSize: 12, color: '#666', display: 'flex', gap: 15}}>
          <span><Tag color={SUCCESS_COLOR}>Xanh</Tag> Đạt mục tiêu</span>
          <span><Tag color={ERROR_COLOR}>Đỏ</Tag> Thấp hơn mục tiêu</span>
      </div>
      <Table
        dataSource={dataSource} 
        columns={columns} 
        scroll={{ x: 'max-content', y: 500 }}
        pagination={{ pageSize: 10 }} 
        bordered 
        size="small" 
        style={{ fontSize: '12px' }}
         rowClassName={(record, index) => index % 2 === 0 ? 'ant-table-row-even' : 'ant-table-row-odd'}
      />
    </Card>
  );
}

// Bảng thi đua (Đã cập nhật màu sắc)
function CompetitionTable() {
    const [rawDataInput, setRawDataInput] = useState("");
    const [tableData, setTableData] = useState([]);
    const [ocrLoading, setOcrLoading] = useState(false);
    const [ocrProgress, setOcrProgress] = useState(0);
    
    const daysInMonth = moment().daysInMonth();
    const currentMonth = moment().month() + 1; 
    const currentYear = moment().year();

    const tableRef = useRef(null);
    
    const handleImageUpload = (file) => {
        setOcrLoading(true);
        setOcrProgress(0);
        
        Tesseract.recognize(
            file,
            'vie', 
            { 
                logger: m => {
                    if(m.status === 'recognizing text') {
                        setOcrProgress(Math.floor(m.progress * 100));
                    }
                }
            }
        ).then(({ data: { text } }) => {
            setRawDataInput(text); 
            setOcrLoading(false);
            message.success("Đã quét dữ liệu từ ảnh thành công!");
        }).catch(err => {
            console.error(err);
            message.error("Lỗi khi quét ảnh. Vui lòng thử lại với ảnh rõ nét hơn.");
            setOcrLoading(false);
        });
        
        return false; 
    };

    const findColumnIndices = (headerLine) => {
        const headers = headerLine.split(/[\t]|\s{2,}/).map(h => h.trim().toLowerCase().replace(/[^a-z0-9%]/g, ''));
        
        const nameKeywords = ['nganhhang', 'ten', 'nhom', 'mat hang'];
        const thucHienKeywords = ['dtqd', 'dtlk', 'thuchien', 'datduoc', 'sl', 'sllk', 'thực hiện']; 
        const targetKeywords = ['target', 'muctieu', 'mt', 'mục tiêu'];
        const percentKeywords = ['%htdukien', '%hoanthanh', '%'];

        const indices = {};
        
        for (let keyword of nameKeywords) {
            const index = headers.findIndex(h => h.includes(keyword));
            if (index > -1) indices.nameIdx = index;
        }

        for (let keyword of thucHienKeywords) {
             const index = headers.findIndex(h => h.includes(keyword));
             if (index > -1 && index !== indices.nameIdx) indices.actualIdx = index;
        }

        for (let keyword of targetKeywords) {
             const index = headers.findIndex(h => h.includes(keyword));
             if (index > -1) indices.targetIdx = index;
        }

        for (let keyword of percentKeywords) {
             const index = headers.findIndex(h => h.includes(keyword));
             if (index > -1) indices.percentIdx = index;
        }

        return indices;
    };

    const processData = () => {
        if (!rawDataInput.trim()) {
            message.warning("Vui lòng nhập dữ liệu hoặc scan ảnh trước.");
            return;
        }

        try {
            const lines = rawDataInput.split('\n').filter(line => line.trim().length > 0);
            if (lines.length < 2) return;

            let headerIndex = 0;
            for(let i=0; i<Math.min(lines.length, 5); i++) {
                const lineLower = lines[i].toLowerCase();
                if(lineLower.includes('tiêu') || lineLower.includes('target') || lineLower.includes('thực hiện')) {
                    headerIndex = i;
                    break;
                }
            }

            const indices = findColumnIndices(lines[headerIndex]);
            
            const map = {
                name: indices.nameIdx !== undefined ? indices.nameIdx : 0,
                target: indices.targetIdx !== undefined ? indices.targetIdx : 1,
                actual: indices.actualIdx !== undefined ? indices.actualIdx : 2,
            };

            const data = [];
            
            for (let i = headerIndex + 1; i < lines.length; i++) {
                const parts = lines[i].trim().split(/[\t]|\s{2,}/).map(p => p.trim());
                if (parts.length < 2) continue;

                const name = parts[map.name];
                
                const cleanNumber = (str) => {
                    if(!str) return 0;
                    let clean = str.replace(/\./g, '').replace(/,/g, ''); 
                    return parseFloat(clean) || 0;
                };

                const target = cleanNumber(parts[map.target]);
                const actual = cleanNumber(parts[map.actual]);

                if (!name || (target === 0 && actual === 0)) continue;

                const percent = target > 0 ? (actual / target) * 100 : 0;
                const remaining = target - actual;
                
                const daysLeft = daysInMonth - moment().date();
                const dailyNeeded = (remaining > 0 && daysLeft > 0) ? remaining / daysLeft : 0;

                data.push({
                    key: i,
                    name,
                    target,
                    actual,
                    percent,
                    remaining,
                    dailyNeeded
                });
            }
            setTableData(data);
            message.success(`Đã xử lý ${data.length} dòng dữ liệu.`);
        } catch (error) {
            console.error(error);
            message.error("Lỗi xử lý dữ liệu. Vui lòng kiểm tra định dạng.");
        }
    };

    const columns = [
        { title: "Tên / Đơn vị", dataIndex: "name", key: "name", width: 200, fixed: 'left', render: text => <b style={{color: PRIMARY_COLOR}}>{text}</b> },
        { 
            title: "Mục Tiêu", dataIndex: "target", key: "target", align: 'right', width: 120,
            render: val => formatMoneyShort(val),
            sorter: (a, b) => a.target - b.target 
        },
        { 
            title: "Thực Hiện", dataIndex: "actual", key: "actual", align: 'right', width: 120,
            render: val => <b style={{color: '#722ed1'}}>{formatMoneyShort(val)}</b>,
            sorter: (a, b) => a.actual - b.actual
        },
        {
            title: "Tiến Độ", dataIndex: "percent", key: "percent", align: 'center', width: 180,
            render: (val, record) => {
                const color = val >= 100 ? SUCCESS_COLOR : val >= 80 ? WARNING_COLOR : ERROR_COLOR;
                return (
                    <Tooltip title={`Còn lại: ${formatMoneyShort(record.remaining)}`}>
                        <Progress percent={val} strokeColor={color} format={p => `${p.toFixed(1)}%`} />
                    </Tooltip>
                )
            },
            sorter: (a, b) => a.percent - b.percent
        },
        {
            title: "Còn Lại", dataIndex: "remaining", key: "remaining", align: 'right', width: 120,
            render: val => val > 0 ? <span style={{color: ERROR_COLOR}}>{formatMoneyShort(val)}</span> : <Tag color="success">Về đích</Tag>,
            sorter: (a, b) => a.remaining - b.remaining
        },
        {
            title: "Cần/Ngày", dataIndex: "dailyNeeded", key: "dailyNeeded", align: 'right', width: 120,
            render: val => val > 0 ? formatMoneyShort(val) : "-"
        }
    ];

    return (
        <Card style={cardStyle} title={<span><TrophyOutlined /> Theo Dõi Thi Đua Tháng {currentMonth}/{currentYear}</span>}>
            <Row gutter={16} style={{marginBottom: 16}}>
                <Col span={12}>
                    <div style={{marginBottom: 8, fontWeight: 500}}>1. Nhập liệu (Copy từ Excel/Zalo hoặc Scan ảnh):</div>
                    <Input.TextArea 
                        rows={6} 
                        value={rawDataInput} 
                        onChange={(e) => setRawDataInput(e.target.value)}
                        placeholder="Paste dữ liệu vào đây (Cấu trúc: Tên | Mục tiêu | Thực hiện)..." 
                    />
                    <div style={{marginTop: 8, display: 'flex', gap: 10}}>
                        <Upload 
                            beforeUpload={handleImageUpload} 
                            showUploadList={false} 
                            accept="image/*"
                        >
                            <Button type="dashed" icon={<ScanOutlined />} loading={ocrLoading}>
                                {ocrLoading ? `Đang quét (${ocrProgress}%)` : "Scan từ ảnh"}
                            </Button>
                        </Upload>
                        <Button type="primary" onClick={processData} icon={<ArrowDownOutlined />}>Phân Tích</Button>
                        <Button onClick={() => setRawDataInput("")} type="default">Xóa</Button>
                    </div>
                </Col>
                <Col span={12}>
                     <div style={{background: '#f0f5ff', border: `1px solid ${PRIMARY_COLOR}`, padding: 15, borderRadius: 8, height: '100%'}}>
                        <b><InfoCircleOutlined style={{color: PRIMARY_COLOR}} /> Hướng dẫn:</b>
                        <ul style={{marginTop: 5, paddingLeft: 20, fontSize: 13, color: '#555'}}>
                            <li><b>Cách 1:</b> Copy bảng từ Excel hoặc Zalo PC dán vào ô bên trái.</li>
                            <li><b>Cách 2:</b> Bấm "Scan từ ảnh" để chụp màn hình bảng số liệu.</li>
                            <li>Hệ thống sẽ tự động nhận diện cột Tên, Mục tiêu, Thực hiện.</li>
                            <li>Cột "Cần/Ngày" tính dựa trên số ngày còn lại trong tháng.</li>
                        </ul>
                     </div>
                </Col>
            </Row>

            <Divider />

            <div id="competition-table">
                <div style={{marginBottom: 10, display: 'flex', justifyContent: 'flex-end'}}>
                     <Button icon={<CameraOutlined />} onClick={() => captureTable('competition-table', 'Bang_Thi_Dua.png')}>Chụp bảng này</Button>
                </div>
                <Table 
                    ref={tableRef}
                    dataSource={tableData} 
                    columns={columns} 
                    rowKey="key" 
                    pagination={false} 
                    scroll={{ x: 800, y: 500 }}
                    size="small"
                    rowClassName={(record, index) => index % 2 === 0 ? 'ant-table-row-even' : 'ant-table-row-odd'}
                    summary={pageData => {
                        let totalTarget = 0;
                        let totalActual = 0;
                        pageData.forEach(({ target, actual }) => {
                            totalTarget += target;
                            totalActual += actual;
                        });
                        const totalPercent = totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0;
                        const totalRemaining = totalTarget - totalActual;

                        return (
                            <Table.Summary.Row className="summary-row">
                                <Table.Summary.Cell index={0}><b style={{color: ERROR_COLOR}}>TỔNG CỘNG</b></Table.Summary.Cell>
                                <Table.Summary.Cell index={1} align="right">{formatMoneyShort(totalTarget)}</Table.Summary.Cell>
                                <Table.Summary.Cell index={2} align="right"><b style={{color: '#722ed1'}}>{formatMoneyShort(totalActual)}</b></Table.Summary.Cell>
                                <Table.Summary.Cell index={3} align="center"><Tag color={PRIMARY_COLOR}>{totalPercent.toFixed(1)}%</Tag></Table.Summary.Cell>
                                <Table.Summary.Cell index={4} align="right"><b style={{color: ERROR_COLOR}}>{formatMoneyShort(totalRemaining)}</b></Table.Summary.Cell>
                                <Table.Summary.Cell index={5}></Table.Summary.Cell>
                            </Table.Summary.Row>
                        );
                    }}
                />
            </div>
        </Card>
    );
}

// ==========================================
// 5. MAIN APP COMPONENT (GIỮ NGUYÊN LOGIC)
// ==========================================

export default function ExcelDashboard() {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Filter lists extracted from data
  const [listCreators, setListCreators] = useState([]);
  const [listStatuses, setListStatuses] = useState([]);
  const [listExportTypes, setListExportTypes] = useState([]);
  const [listReturnStatuses, setListReturnStatuses] = useState([]);

  // Active Filters
  const [filters, setFilters] = useState({
    creators: [],
    statuses: [],
    exportTypes: [],
    returnStatuses: [],
    dateRange: []
  });

  // Aggregated Stats
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalConvertedRevenue: 0,
    conversionEfficiency: 0,
    installmentRevenue: 0,
    installmentRate: 0
  });

  const [industryData, setIndustryData] = useState([]);
  const [staffData, setStaffData] = useState([]);

  // ----------------------------------------
  // HELPER: SMART MAPPING (TÌM CỘT THÔNG MINH)
  // ----------------------------------------
  const identifyColumn = (headers, keys) => {
     // 1. Tìm chính xác
     for (const key of keys) {
         const match = headers.find(h => h.trim().toLowerCase() === key.toLowerCase());
         if (match) return match;
     }
     // 2. Tìm gần đúng (chứa từ khóa)
     for (const key of keys) {
         const match = headers.find(h => h.trim().toLowerCase().includes(key.toLowerCase()));
         if (match) return match;
     }
     return null;
  };

  // ----------------------------------------
  // FILE HANDLING 
  // ----------------------------------------
  const handleFileUpload = (file) => {
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: "binary" });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        
        // Đọc raw data để lấy header
        const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        if (!rawData || rawData.length === 0) throw new Error("File rỗng");
        
        // Giả sử dòng đầu tiên là header
        const headers = rawData[0].map(h => String(h)); 
        
        // --- SMART MAPPING CONFIG ---
        const mapConfig = {
            nguoiTao: ['Người tạo', 'nhân viên', 'sales', 'tên nv', 'staff', 'nguoi tao'],
            trangThai: ['Trạng thái xuất', 'trạng thái', 'status', 'tình trạng', 'trang thai'],
            hinhThuc: ['Hình thức xuất', 'hình thức', 'loại xuất', 'type', 'hinh thuc'],
            traHang: ['Tình trạng nhập trả của sản phẩm đổi với sản phẩm chính', 'tình trạng trả', 'nhập trả', 'trả hàng', 'return', 'tra hang'],
            nganhHang: ['Ngành hàng', 'ngành hàng', 'industry', 'ngành', 'nganh hang'],
            nhomHang: ['Nhóm hàng', 'nhóm hàng', 'group', 'nhóm', 'nhom hang'],
            ngayChungTu: ['Ngày tạo', 'ngày chứng từ', 'ngày', 'date', 'ngay chung tu', 'ngày hạch toán'], 
            soLuong: ['Số lượng', 'sl', 'qty', 'quantity', 'so luong'],
            doanhThu: ['Giá bán', 'Giá bán_1', 'Phải thu', 'Đã thu', 'tổng tiền thanh toán', 'doanh thu', 'thành tiền', 'tổng tiền', 'amount', 'doanh thu thực', 'tiền']
        };

        const colMap = {};
        Object.keys(mapConfig).forEach(key => {
            colMap[key] = identifyColumn(headers, mapConfig[key]);
        });

        // Convert lại sang JSON object dựa trên header
        const jsonData = XLSX.utils.sheet_to_json(ws, { defval: "" }); 

        if (jsonData && jsonData.length > 0) {
            const normalizedData = jsonData.map((row, index) => {
                // Helper lấy giá trị an toàn
                const getVal = (key) => colMap[key] ? row[colMap[key]] : "";

                // Xử lý số tiền (Excel có thể format chuỗi "1.000.000" hoặc số raw)
                let dt = getVal('doanhThu');
                if (typeof dt === 'string') dt = parseFloat(dt.replace(/\./g, '').replace(/,/g, '')) || 0;
                else dt = Number(dt) || 0;

                let sl = getVal('soLuong');
                if (typeof sl === 'string') sl = parseFloat(sl.replace(/\./g, '')) || 0;
                else sl = Number(sl) || 0;

                return {
                    key: index,
                    nguoiTao: getVal('nguoiTao') || "Unknown",
                    trangThai: getVal('trangThai'),
                    hinhThuc: getVal('hinhThuc'),
                    traHang: getVal('traHang'),
                    nganhHang: getVal('nganhHang'),
                    nhomHang: getVal('nhomHang'),
                    ngayChungTu: getVal('ngayChungTu'), 
                    soLuong: sl,
                    doanhThu: dt, 
                };
            });

            setData(normalizedData);
            
            // Cập nhật danh sách filter từ dữ liệu mới
            setListCreators([...new Set(normalizedData.map(i => i.nguoiTao))].sort());
            setListStatuses([...new Set(normalizedData.map(i => i.trangThai))].filter(Boolean).sort());
            setListExportTypes([...new Set(normalizedData.map(i => i.hinhThuc))].filter(Boolean).sort());
            setListReturnStatuses([...new Set(normalizedData.map(i => i.traHang))].filter(Boolean).sort());
            
            setLastUpdate(moment().format("HH:mm DD/MM/YYYY"));
            message.success(`Đã tải lên ${normalizedData.length} dòng dữ liệu.`);
            
            if(!colMap.doanhThu) message.warning("Không tìm thấy cột 'Giá bán/Doanh thu'. Dữ liệu sẽ sai lệch.");
            if(!colMap.nguoiTao) message.warning("Không tìm thấy cột 'Người tạo/Nhân viên'.");
        }
      } catch (err) {
        console.error(err);
        message.error("Lỗi đọc file Excel. Vui lòng kiểm tra định dạng.");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
    return false;
  };

  // ----------------------------------------
  // DATA PROCESSING KERNEL (LOGIC XỬ LÝ & TÍNH TOÁN)
  // ----------------------------------------
  const processMainData = useCallback(() => {
    if (data.length === 0) return;

    setLoading(true);
    setTimeout(() => { 
        let result = data;

        // 1. Apply Filters
        if (filters.creators.length > 0) result = result.filter(r => filters.creators.includes(r.nguoiTao));
        if (filters.statuses.length > 0) result = result.filter(r => filters.statuses.includes(r.trangThai));
        if (filters.exportTypes.length > 0) result = result.filter(r => filters.exportTypes.includes(r.hinhThuc));
        if (filters.returnStatuses.length > 0) result = result.filter(r => filters.returnStatuses.includes(r.traHang));
        if (filters.dateRange.length === 2) {
            const start = filters.dateRange[0].startOf('day');
            const end = filters.dateRange[1].endOf('day');
            result = result.filter(r => {
                let d;
                if (typeof r.ngayChungTu === 'number') {
                    d = moment(new Date((r.ngayChungTu - (25567 + 2)) * 86400 * 1000));
                } else {
                    d = moment(r.ngayChungTu, ["DD/MM/YYYY", "YYYY-MM-DD", "DD-MM-YYYY", moment.ISO_8601]);
                }
                return d.isValid() && d.isBetween(start, end, null, '[]');
            });
        }

        // 2. Calculation Variables
        let totalRev = 0;
        let totalConverted = 0;
        let totalInstallment = 0;
        
        const indMap = {}; 
        const staffMap = {}; 

        result.forEach(row => {
            
            const isInstallment = row.hinhThuc && row.hinhThuc.toLowerCase().includes("trả góp");
            const isInsurance = row.nganhHang && (row.nganhHang.includes("164") || row.nganhHang.toLowerCase().includes("bảo hiểm"));

            let coef = 1.0;
            if (isAllowedProduct(row.nganhHang, row.nhomHang) || ALLOWED_EXPORT_TYPES.includes(row.hinhThuc)) {
                 coef = getConversionCoefficient(row.nganhHang, row.nhomHang);
            }
            
            const convertedVal = row.doanhThu * coef;

            // Tổng hợp toàn cục
            totalRev += row.doanhThu;
            totalConverted += convertedVal;
            if (isInstallment) totalInstallment += row.doanhThu;

            // --- TỔNG HỢP THEO CẤU TRÚC: NGÀNH HÀNG -> NHÓM HÀNG ---
            const industryName = row.nganhHang || "Khác";
            const groupName = row.nhomHang || "Chưa phân nhóm";

            if (!indMap[industryName]) {
                indMap[industryName] = { 
                    key: industryName, 
                    name: industryName, 
                    soLuong: 0, 
                    doanhThu: 0, 
                    dtqd: 0, 
                    isChild: false, 
                    children: {}
                };
            }
            indMap[industryName].soLuong += row.soLuong;
            indMap[industryName].doanhThu += row.doanhThu;
            indMap[industryName].dtqd += convertedVal;

            if (!indMap[industryName].children[groupName]) {
                indMap[industryName].children[groupName] = {
                    key: `${industryName}-${groupName}`,
                    name: groupName,
                    soLuong: 0,
                    doanhThu: 0,
                    dtqd: 0,
                    isChild: true,
                    coefficient: coef
                };
            }
            indMap[industryName].children[groupName].soLuong += row.soLuong;
            indMap[industryName].children[groupName].doanhThu += row.doanhThu;
            indMap[industryName].children[groupName].dtqd += convertedVal;


            // --- TỔNG HỢP THEO NHÂN VIÊN ---
            const sName = row.nguoiTao;
            if (!staffMap[sName]) {
                staffMap[sName] = { key: sName, name: sName, doanhThu: 0, dtqd: 0, bhRevenue: 0 };
            }
            staffMap[sName].doanhThu += row.doanhThu;
            staffMap[sName].dtqd += convertedVal;
            if (isInsurance) staffMap[sName].bhRevenue += row.doanhThu;
        });

        // 3. Finalize Stats
        const efficiency = totalRev > 0 ? ((totalConverted - totalRev) / totalRev) * 100 : 0;
        const installmentRate = totalRev > 0 ? (totalInstallment / totalRev) * 100 : 0;

        setStats({
            totalRevenue: totalRev,
            totalConvertedRevenue: totalConverted,
            conversionEfficiency: parseFloat(efficiency.toFixed(2)),
            installmentRevenue: totalInstallment,
            installmentRate: parseFloat(installmentRate.toFixed(2))
        });

        // 4. Transform Maps to Arrays for Tables
        const indArray = Object.values(indMap).map(parent => ({
            ...parent,
            children: Object.values(parent.children).sort((a,b) => b.doanhThu - a.doanhThu)
        })).sort((a,b) => b.doanhThu - a.doanhThu);

        const stfArray = Object.values(staffMap).map(s => ({
            ...s,
            efficiency: s.doanhThu > 0 ? ((s.dtqd - s.doanhThu) / s.doanhThu) * 100 : 0
        })).sort((a,b) => b.doanhThu - a.doanhThu);

        setFilteredData(result);
        setIndustryData(indArray);
        setStaffData(stfArray);
        setLoading(false);

    }, 100); 
  }, [data, filters]);

  useEffect(() => {
    processMainData();
  }, [processMainData]);

  const onResetFilters = () => {
    setFilters({
        creators: [],
        statuses: [],
        exportTypes: [],
        returnStatuses: [],
        dateRange: []
    });
  };

  return (
    <div style={{ background: "#f0f2f5", minHeight: "100vh", padding: 20 }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
        <Col>
          <div style={{ fontSize: 24, fontWeight: 800, ...gradientText }}>
            <FundOutlined /> DASHBOARD DOANH THU & HIỆU QUẢ KD
          </div>
          <div style={{ color: "#666" }}>
            Cập nhật: {lastUpdate || "Chưa có dữ liệu"} | Tổng số dòng: {filteredData.length}/{data.length}
          </div>
        </Col>
        <Col>
           <Space>
             <Upload 
                accept=".xlsx, .xls, .csv" 
                showUploadList={false} 
                beforeUpload={handleFileUpload}
             >
                <Button type="primary" size="large" icon={<UploadOutlined />} loading={loading} style={{borderRadius: 8}}>
                    Tải File Excel/CSV
                </Button>
             </Upload>
           </Space>
        </Col>
      </Row>

      <FilterPanel 
        creators={listCreators}
        statuses={listStatuses}
        exportTypes={listExportTypes}
        returnStatuses={listReturnStatuses}
        filters={filters}
        setFilters={setFilters}
        onReset={onResetFilters}
      />

      {loading ? (
          <div style={{textAlign: 'center', padding: 50}}><Spin size="large" tip="Đang xử lý dữ liệu..." /></div>
      ) : (
        <Tabs defaultActiveKey="1" type="card" size="large">
            <TabPane tab={<span><AppstoreOutlined /> Tổng Quan</span>} key="1">
                <OverviewSection stats={stats} />

                {/* THAY ĐỔI: Sử dụng Biểu đồ cột Ngành hàng (CategoryChartBar) */}
                <Row gutter={20} style={{marginBottom: 20}}>
                    <Col span={12}>
                        <CategoryChartBar industryData={industryData} totalRevenue={stats.totalRevenue} />
                    </Col>
                    <Col span={12}>
                        <StaffHorizontalChart staffData={staffData} />
                    </Col>
                </Row>

                <div id="capture-area-1">
                    <Row gutter={20} style={{marginBottom: 20}}>
                        <Col span={24}>
                            <StaffAvgPriceTable rawData={filteredData} />
                        </Col>
                    </Row>
                    
                    <Row gutter={20} style={{marginBottom: 20}}>
                        <Col span={24}>
                            <DetailIndustryTable 
                                industryData={industryData} 
                                totalRevenue={stats.totalRevenue} 
                            />
                        </Col>
                    </Row>

                    <Row gutter={20}>
                        <Col span={24}>
                            <TopStaffRanking staffData={staffData} totalRevenue={stats.totalRevenue} />
                        </Col>
                    </Row>
                </div>
            </TabPane>

            <TabPane tab={<span><TrophyOutlined /> Thi Đua & Mục Tiêu</span>} key="2">
                 <CompetitionTable />
            </TabPane>
        </Tabs>
      )}
      
      <div style={{textAlign: 'center', marginTop: 40, color: '#aaa', fontSize: 12}}>
        Hệ thống hỗ trợ báo cáo doanh thu & tính lương thưởng tự động © 2025
      </div>
    </div>
  );
}