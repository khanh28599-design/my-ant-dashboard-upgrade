import React, { useState, useEffect, useRef, useMemo } from "react";
import * as XLSX from "xlsx";
import { Row, Col, Card, Button, Select, DatePicker, Input, Table, Tabs, Tag, Space, Spin, message, Progress, Statistic } from "antd";
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
  SearchOutlined,
  TrophyOutlined,
  RiseOutlined
} from "@ant-design/icons";
import moment from "moment";

const { Option } = Select;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

// ==========================================
// STYLES & COLORS (GIAO DIỆN)
// ==========================================
const cardStyle = {
  borderRadius: 12,
  boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
  border: "none",
  overflow: "hidden"
};

const gradientText = {
  background: "linear-gradient(45deg, #1890ff, #722ed1)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  fontWeight: 800
};

const formatMoneyShort = (amount) => {
  if (!amount) return "0";
  if (amount >= 1000000000) return (amount / 1000000000).toFixed(1) + " Tỷ";
  if (amount >= 1000000) return (amount / 1000000).toFixed(1) + " Tr";
  if (amount >= 1000) return (amount / 1000).toFixed(0) + " k";
  return amount.toLocaleString('vi-VN');
};

// ==========================================
// 1. CẤU HÌNH LOGIC NGHIỆP VỤ (CẬP NHẬT HỆ SỐ MỚI)
// ==========================================

// Danh sách ID cho phép (cập nhật thêm Xe đạp, v.v.)
const ALLOWED_IDS = ["1034", "1116", "1214", "1274", "13", "1394", "16", "164", "1754", "1755", "1756", "184", "22", "23", "244", "304", "484", "664", "1634"];

const isAllowedProduct = (industryStr, groupStr) => {
    const check = (str) => str && ALLOWED_IDS.some(id => str.toString().startsWith(id));
    return check(industryStr) || check(groupStr);
};

// --- HÀM LẤY HỆ SỐ QUI ĐỔI (CẬP NHẬT MỚI) ---
const getConversionCoefficient = (industryStr, groupStr) => {
    // Lấy ID và Tên để so sánh (chuyển về chữ thường)
    const iStr = industryStr ? industryStr.toString().toLowerCase() : "";
    const gStr = groupStr ? groupStr.toString().toLowerCase() : "";
    
    // Lấy ID đầu chuỗi (VD: "664 - Sim" -> "664")
    const iID = industryStr ? industryStr.toString().split(" - ")[0] : "";
    const gID = groupStr ? groupStr.toString().split(" - ")[0] : "";

    // 1. SIM SỐ: 545% (5.45)
    if (iID === "664" || iStr.includes("sim")) return 5.45;

    // 2. BẢO HIỂM: 418% (4.18)
    // Thường nằm trong VAS (164) hoặc tên có chữ Bảo hiểm
    if (iID === "164" || iStr.includes("bảo hiểm") || gStr.includes("bảo hiểm")) return 4.18;

    // 3. PHỤ KIỆN: 337% (3.37)
    if (["184", "1394", "16", "38"].includes(iID) || iStr.includes("phụ kiện")) return 3.37;

    // 4. ĐỒNG HỒ THỜI TRANG & WEARABLE: 300% (3.0)
    if (["1274", "23"].includes(iID) || iStr.includes("đồng hồ") || iStr.includes("wearable")) return 3.00;

    // 5. GIA DỤNG KHÔNG ĐIỆN: 192% (1.92)
    // Thường là ID 1034 (Dụng cụ nhà bếp)
    if (iID === "1034" || iStr.includes("không điện")) return 1.92;

    // 6. GIA DỤNG CÓ ĐIỆN: 185% (1.85)
    // Thường là 484, 1214, 1116
    if (["484", "1214", "1116"].includes(iID) || iStr.includes("gia dụng")) return 1.85;

    // 7. LOA KARAOKE: 129% (1.29)
    // Thường nằm trong Điện tử (304), cần check tên Nhóm hàng
    if (gStr.includes("loa") || gStr.includes("karaoke")) return 1.29;

    // 8. XE ĐẠP: 112% (1.12)
    if (iStr.includes("xe đạp") || gStr.includes("xe đạp")) return 1.12;

    // 9. DÀN MÁY: 102% (1.02)
    if (gStr.includes("dàn máy") || gStr.includes("âm thanh")) return 1.02;

    // 10. MẶC ĐỊNH (Điện thoại, Laptop, Tivi...): 100% (1.0)
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
    <Card style={{ ...cardStyle, marginBottom: 20 }}>
      <Row gutter={[16, 16]} align="middle" justify="start">
        <Col span={4}>
          <div style={{color: "#666", marginBottom: 4}}><b>Người tạo ({creators.length})</b></div>
          <Select 
            mode="multiple" allowClear placeholder="Chọn nhân viên..."
            value={filters.creators} onChange={(val) => handleChange('creators', val)}
            size="middle" style={{ width: "100%" }} showSearch optionFilterProp="children" maxTagCount={1}
          >
            {creators.map(c => <Option key={c} value={c}>{c}</Option>)}
          </Select>
        </Col>
        <Col span={4}>
          <div style={{color: "#666", marginBottom: 4}}><b>Trạng thái xuất</b></div>
          <Select 
            mode="multiple" allowClear placeholder="Chọn trạng thái..."
            value={filters.statuses} onChange={(val) => handleChange('statuses', val)}
            size="middle" style={{ width: "100%" }}
          >
            {statuses.map(s => <Option key={s} value={s}>{s}</Option>)}
          </Select>
        </Col>
        <Col span={4}>
          <div style={{color: "#666", marginBottom: 4}}><b>Khoảng thời gian</b></div>
          <Select defaultValue="all" size="middle" style={{ width: "100%" }} onChange={handleTimeSelect}>
            <Option value="all">Tất cả</Option>
            <Option value="today">Hôm nay</Option>
            <Option value="this_week">Tuần này</Option>
            <Option value="this_month">Tháng này</Option>
            <Option value="last_month">Tháng trước</Option>
          </Select>
        </Col>
        <Col span={6}>
          <div style={{color: "#666", marginBottom: 4}}><b>Từ ngày - Đến ngày</b></div>
          <RangePicker 
            size="middle" style={{width: "100%"}} 
            value={filters.dateRange} onChange={(dates) => handleChange('dateRange', dates)}
            format="DD/MM/YYYY"
          /> 
        </Col>
        <Col span={4}>
          <div style={{color: "#666", marginBottom: 4}}><b>Tìm kiếm</b></div>
          <Input 
            placeholder="Mã ĐH, Tên SP..." size="middle" prefix={<SearchOutlined />}
            value={filters.keyword} onChange={(e) => handleChange('keyword', e.target.value)}
          />
        </Col>
        <Col span={2}>
          <Button type="dashed" icon={<ReloadOutlined />} size="middle" style={{marginTop: 24, width: "100%"}} onClick={onReset}>Xóa</Button>
        </Col>
      </Row>
    </Card>
  );
}

// ==========================================
// 3. CÁC COMPONENT HIỂN THỊ
// ==========================================

function OverviewSection({ stats }) {
  const effColor = stats.conversionEfficiency >= 0 ? "#52c41a" : "#f5222d";
  const EffIcon = stats.conversionEfficiency >= 0 ? ArrowUpOutlined : ArrowDownOutlined;

  const cards = [
    {
      title: "TỔNG DOANH THU THỰC",
      value: formatMoneyShort(stats.totalRevenue),
      sub: `Số lượng: ${stats.totalQuantity}`,
      icon: <FundOutlined style={{ fontSize: 24, color: "#fff" }} />,
      background: "linear-gradient(135deg, #3C8CE7 10%, #00EAFF 100%)",
      shadow: "0 10px 20px -10px rgba(60, 140, 231, 0.5)"
    },
    {
      title: "TỔNG DOANH THU QUY ĐỔI",
      value: formatMoneyShort(stats.totalConvertedRevenue),
      sub: "DTQĐ = DT Thực * Hệ số",
      icon: <RiseOutlined style={{ fontSize: 24, color: "#fff" }} />,
      background: "linear-gradient(135deg, #667eea 10%, #764ba2 100%)", 
      shadow: "0 10px 20px -10px rgba(102, 126, 234, 0.5)"
    },
    {
      title: "HIỆU QUẢ QĐ (TỈ TRỌNG)",
      value: `${stats.conversionEfficiency > 0 ? '+' : ''}${stats.conversionEfficiency}%`,
      sub: "(DTQĐ - DT Thực) / DT Thực",
      icon: <EffIcon style={{ fontSize: 24, color: "#fff" }} />,
      background: stats.conversionEfficiency >= 0 
          ? "linear-gradient(135deg, #11998e 10%, #38ef7d 100%)"
          : "linear-gradient(135deg, #FF416C 10%, #FF4B2B 100%)",
      shadow: "0 10px 20px -10px rgba(17, 153, 142, 0.5)"
    },
    {
      title: "TỶ LỆ TRẢ GÓP",
      value: stats.installmentRate + "%",
      sub: `SL HĐ Trả góp: ${stats.installmentCount}`,
      icon: <PieChartOutlined style={{ fontSize: 24, color: "#fff" }} />,
      background: "linear-gradient(135deg, #f2709c 10%, #ff9472 100%)",
      shadow: "0 10px 20px -10px rgba(242, 112, 156, 0.5)"
    }
  ];

  return (
    <Row gutter={20} style={{marginBottom: 20}}>
      {cards.map((item, idx) => (
        <Col span={6} key={idx}>
          <Card bordered={false} style={{ borderRadius: 16, background: item.background, boxShadow: item.shadow, height: 120 }}>
            <Row align="middle" justify="space-between">
                <Col>
                    <div style={{ color: "rgba(255,255,255,0.8)", fontWeight: 600, fontSize: 12, textTransform: "uppercase", marginBottom: 4 }}>{item.title}</div>
                    <div style={{ fontSize: 26, fontWeight: 700, color: "#fff" }}>{item.value}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>{item.sub}</div>
                </Col>
                <Col>
                    <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: "50%", padding: 10 }}>
                        {item.icon}
                    </div>
                </Col>
            </Row>
          </Card>
        </Col>
      ))}
    </Row>
  );
}

function CategoryChartBar({ industryData, totalRevenue }) {
    const parentData = industryData.filter(i => !i.isChild && i.doanhThu > 0).sort((a, b) => b.doanhThu - a.doanhThu);
    const colors = [
        "linear-gradient(to right, #2980b9, #6dd5fa, #ffffff)", 
        "linear-gradient(to right, #11998e, #38ef7d)", 
        "linear-gradient(to right, #f12711, #f5af19)", 
        "linear-gradient(to right, #8e44ad, #c39bd3)",
        "linear-gradient(to right, #F37335, #FDC830)",
        "linear-gradient(to right, #00b09b, #96c93d)"
    ];

    return (
        <Card style={cardStyle} title={<span style={{color: '#1890ff'}}><BarChartOutlined/> Tỷ trọng ngành hàng</span>}>
            <div style={{ display: "flex", gap: 16, overflowX: 'auto', paddingBottom: 10 }}>
                {parentData.length > 0 ? parentData.map((item, index) => {
                    const percent = totalRevenue > 0 ? (item.doanhThu / totalRevenue) * 100 : 0;
                    const bg = colors[index % colors.length];
                    const displayName = item.name.includes("-") ? item.name.split("-")[1] : item.name;
                    
                    return (
                        <div key={item.key} style={{minWidth: 110, background: "#f9f9f9", padding: 10, borderRadius: 8, border: "1px solid #eee"}}>
                            <b style={{fontSize: 12, color: "#555"}}>{displayName}</b>
                            <div style={{fontSize: 14, fontWeight: 'bold', margin: "4px 0", color: "#333"}}>{formatMoneyShort(item.doanhThu)}</div>
                            <div style={{ height: 8, width: "100%", background: "#e8e8e8", borderRadius: 4, overflow: 'hidden'}}>
                                <div style={{ height: '100%', width: `${percent}%`, background: bg }}></div>
                            </div>
                            <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>{percent.toFixed(1)}%</div>
                        </div>
                    )
                }) : <div style={{padding: 20, color: '#999'}}>Không có dữ liệu phù hợp</div>}
            </div>
        </Card>
    );
}

function StaffHorizontalChart({ staffData }) {
  const sortedStaff = [...staffData].sort((a, b) => b.doanhThu - a.doanhThu).slice(0, 10);
  const maxRevenue = sortedStaff.length > 0 ? sortedStaff[0].doanhThu : 0;

  return (
    <Card style={{ ...cardStyle, height: '100%' }} title={<span style={{color: '#1890ff'}}><TrophyOutlined /> Top 10 Doanh Thu</span>}>
      <div style={{ height: 400, overflowY: 'auto', paddingRight: 10 }}>
        {sortedStaff.map((staff, index) => {
          const percent = maxRevenue > 0 ? (staff.doanhThu / maxRevenue) * 100 : 0;
          const rankColor = index === 0 ? "#FFD700" : index === 1 ? "#C0C0C0" : index === 2 ? "#CD7F32" : "#eee";
          
          return (
            <div key={staff.key} style={{ marginBottom: 16 }}>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 2, fontSize: 13}}>
                 <span>
                    <Tag color="default" style={{borderColor: rankColor, color: index < 3 ? "#000" : "#666", background: index < 3 ? rankColor : "#fff"}}>#{index+1}</Tag> 
                    <b>{staff.name}</b>
                 </span>
                 <b>{formatMoneyShort(staff.doanhThu)}</b>
              </div>
              <Progress 
                percent={percent} 
                showInfo={false} 
                strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }} 
                size="small" 
                trailColor="#f0f0f0"
              />
            </div>
          );
        })}
        {sortedStaff.length === 0 && <div style={{color: '#999'}}>Chưa có dữ liệu</div>}
      </div>
    </Card>
  );
}

function TopStaffRanking({ staffData, totalRevenue }) {
  const personalTarget = totalRevenue * 0.1;
  return (
    <Card size="small" style={cardStyle} title={<b>Bảng Chi Tiết Nhân Viên</b>}>
      <Table
        dataSource={staffData}
        pagination={{ pageSize: 10 }}
        size="middle"
        rowKey="key"
        columns={[
          {title: "#", render: (text, record, index) => index + 1, width: 50, align: 'center'},
          {title: "Nhân Viên", dataIndex: "name", key: "name", render: txt => <b style={{color: "#1890ff"}}>{txt}</b>},
          {title: "Doanh Thu Thực", dataIndex: "doanhThu", key: "doanhThu", render: val => formatMoneyShort(val), align: 'right', sorter: (a, b) => a.doanhThu - b.doanhThu},
          {title: "Doanh Thu QĐ", dataIndex: "dtqd", key: "dtqd", render: val => <b style={{color: "#722ed1"}}>{formatMoneyShort(val)}</b>, align: 'right', sorter: (a, b) => a.dtqd - b.dtqd},
          {title: "Hiệu quả", dataIndex: "efficiency", key: "efficiency", align: 'center',
             render: val => <Tag color={val >= 0 ? "success" : "error"}>{val > 0 ? '+' : ''}{val}%</Tag>,
             sorter: (a, b) => a.efficiency - b.efficiency
          },
          {title: "% Mục Tiêu", key: "target", 
             render: (_, record) => {
                 const p = personalTarget > 0 ? (record.doanhThu / personalTarget) * 100 : 0;
                 return <Progress percent={p} size="small" steps={5} strokeColor="#52c41a" showInfo={false} />
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
          render: (text, record) => record.name === "TỔNG CỘNG" ? <b style={{color: "red"}}>{text}</b> : <span style={{fontWeight: record.isChild ? 400 : 600}}>{text}</span>
        },
        { title: "SỐ LƯỢNG", dataIndex: "soLuong", key: "soLuong", align: 'center', 
          render: (val, record) => record.name === "TỔNG CỘNG" ? <b>{val}</b> : val 
        },
        { title: "DOANH THU THỰC", dataIndex: "doanhThu", key: "doanhThu", align: 'right',
          render: (val, record) => record.name === "TỔNG CỘNG" ? <b style={{color: "red", fontSize: 15}}>{formatMoneyShort(val)}</b> : formatMoneyShort(val)
        },
        { title: "DOANH THU QĐ", dataIndex: "dtqd", key: "dtqd", align: 'right',
          render: (val, record) => <b style={{color: "#1890ff"}}>{formatMoneyShort(val)}</b>
        },
        { title: "HỆ SỐ", dataIndex: "coefficient", key: "coefficient", align: 'center', 
          render: val => val ? <Tag color="purple">{val}</Tag> : "" 
        },
        { title: "ĐƠN GIÁ", key: "unitPrice", align: 'right',
          render: (_, record) => {
             if(record.name === "TỔNG CỘNG") return "";
             const price = record.soLuong > 0 ? record.doanhThu / record.soLuong : 0;
             return <Tag color="default" style={{fontWeight: 'bold'}}>{formatMoneyShort(price)}</Tag>
          }
        },
        { title: "HIỆU QUẢ", key: "efficiency", align: 'right',
          render: (_, record) => {
             if(record.name === "TỔNG CỘNG") return "";
             // (DTQD - DT) / DT
             const eff = record.doanhThu > 0 ? ((record.dtqd - record.doanhThu)/record.doanhThu)*100 : 0;
             const color = eff >= 0 ? "#52c41a" : "#f5222d";
             return <span style={{color: color, fontWeight: 'bold'}}>{eff > 0 ? '+' : ''}{eff.toFixed(1)}%</span>
          }
        },
        { title: "% CHẠM", key: "percent", 
          render: (_, record) => {
             if(record.name === "TỔNG CỘNG") return "";
             const target = totalRevenue * 0.1;
             const p = target > 0 ? (record.doanhThu / target) * 100 : 0;
             return <span style={{fontSize: 12}}>{p.toFixed(0)}%</span>
          },
          align: 'right'
        }
    ];

  return (
    <Card style={cardStyle}>
        <div style={{marginBottom: 16, fontWeight: 'bold', fontSize: 16, color: '#1890ff'}}><TableOutlined /> CHI TIẾT NGÀNH HÀNG (Drill-down)</div>
        <Table columns={columns} dataSource={dataSource} scroll={{x: 1000}} pagination={false} size="middle" rowKey="key" bordered/>
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
            // CÔNG THỨC QUAN TRỌNG: TÍNH DTQD DỰA TRÊN HỆ SỐ MỚI
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

        const efficiency = totalRev > 0 ? ((totalConvertedRev - totalRev) / totalRev) * 100 : 0;
        const installmentRate = data.length > 0 ? (installmentCount / data.length) * 100 : 0;

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
    <div style={{ padding: 32, background: "#f5f7fa", minHeight: "100vh", fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
      <input type="file" accept=".xlsx, .xls, .csv" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <h1 style={{ margin: 0, fontSize: 28, ...gradientText }}>
             DASHBOARD HIỆU QUẢ KINH DOANH
          </h1>
          <div style={{ color: "#8c8c8c", fontSize: 13, marginTop: 4 }}>Dữ liệu: {allData.length > 0 ? `Đã tải ${allData.length} dòng` : "Vui lòng nhập file Excel"}</div>
        </Col>
        <Col>
            <Button type="primary" shape="round" icon={<PlusOutlined />} size="large" style={{ marginRight: 12, background: "linear-gradient(90deg, #1890ff, #096dd9)", border: "none" }} onClick={handleImportClick}>Nhập YCX</Button>
            <Button shape="round" icon={<FilterOutlined />} size="large">Cài đặt</Button>
        </Col>
      </Row>
      <Spin spinning={loading} tip="Đang tính toán dữ liệu...">
          <FilterPanel creators={uniqueCreators} statuses={uniqueStatuses} filters={filters} setFilters={setFilters} onReset={resetFilters} />
          <OverviewSection stats={stats} />
          
          <Row gutter={20} style={{marginBottom: 20}}>
             <Col span={16}>
                 <Tabs defaultActiveKey="1" type="card" size="large" style={{background: "#fff", padding: 16, borderRadius: 12, ...cardStyle}}>
                    <TabPane tab="Biểu đồ Ngành Hàng" key="1"><CategoryChartBar industryData={industryData} totalRevenue={stats.totalRevenue} /></TabPane>
                    <TabPane tab="Chi tiết Nhân Viên" key="2"><TopStaffRanking staffData={staffData} totalRevenue={stats.totalRevenue} /></TabPane>
                 </Tabs>
             </Col>
             <Col span={8}>
                 <StaffHorizontalChart staffData={staffData} />
             </Col>
          </Row>

          <DetailIndustryTable industryData={industryData} totalRevenue={stats.totalRevenue} />
      </Spin>
    </div>
  );
}