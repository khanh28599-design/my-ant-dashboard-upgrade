import React, { useState, useEffect, useRef, useMemo } from "react";
import * as XLSX from "xlsx";
import { Row, Col, Card, Button, Select, DatePicker, Input, Table, Tabs, Tag, Space, Spin, message, Progress, Popover, Checkbox, Divider, Tooltip } from "antd";
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
  CloseCircleOutlined
} from "@ant-design/icons";
import moment from "moment";

const { Option } = Select;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

// ==========================================
// STYLES & HELPERS
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
// 1. CẤU HÌNH WHITELIST & HỆ SỐ
// ==========================================
const ALLOWED_IDS = ["1034", "1116", "1214", "1274", "13", "1394", "16", "164", "1754", "1755", "1756", "184", "22", "23", "244", "304", "484", "664"];

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

// ==========================================
// 2. COMPONENT BỘ LỌC TỔNG
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
    { title: "TỔNG DOANH THU THỰC", value: formatMoneyShort(stats.totalRevenue), sub: `SL: ${stats.totalQuantity}`, icon: <FundOutlined style={{fontSize: 24, color: "#fff"}}/>, background: "linear-gradient(135deg, #3C8CE7 10%, #00EAFF 100%)" },
    { title: "TỔNG DOANH THU QUY ĐỔI", value: formatMoneyShort(stats.totalConvertedRevenue), sub: "DTQĐ = DT * Hệ số", icon: <RiseOutlined style={{fontSize: 24, color: "#fff"}}/>, background: "linear-gradient(135deg, #667eea 10%, #764ba2 100%)" },
    { title: "HIỆU QUẢ QĐ (TỈ TRỌNG)", value: `${stats.conversionEfficiency > 0 ? '+' : ''}${stats.conversionEfficiency}%`, sub: "(DTQĐ - DT) / DT", icon: <EffIcon style={{fontSize: 24, color: "#fff"}}/>, background: stats.conversionEfficiency >= 0 ? "linear-gradient(135deg, #11998e 10%, #38ef7d 100%)" : "linear-gradient(135deg, #FF416C 10%, #FF4B2B 100%)" },
    { title: "TỶ LỆ TRẢ GÓP", value: stats.installmentRate + "%", sub: `SL HĐ: ${stats.installmentCount}`, icon: <PieChartOutlined style={{fontSize: 24, color: "#fff"}}/>, background: "linear-gradient(135deg, #f2709c 10%, #ff9472 100%)" }
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

function CategoryChartBar({ industryData, totalRevenue }) {
    const parentData = industryData.filter(i => !i.isChild && i.doanhThu > 0).sort((a, b) => b.doanhThu - a.doanhThu);
    const colors = ["linear-gradient(to right, #2980b9, #6dd5fa)", "linear-gradient(to right, #11998e, #38ef7d)", "linear-gradient(to right, #f12711, #f5af19)", "linear-gradient(to right, #8e44ad, #c39bd3)", "linear-gradient(to right, #F37335, #FDC830)", "linear-gradient(to right, #00b09b, #96c93d)"];

    return (
        <Card style={cardStyle} title={<span style={{color: '#1890ff'}}><BarChartOutlined/> Tỷ trọng ngành hàng</span>}>
            <div style={{ display: "flex", gap: 16, overflowX: 'auto', paddingBottom: 10 }}>
                {parentData.length > 0 ? parentData.map((item, index) => {
                    const percent = totalRevenue > 0 ? (item.doanhThu / totalRevenue) * 100 : 0;
                    const bg = colors[index % colors.length];
                    return (
                        <div key={item.key} style={{minWidth: 110, background: "#f9f9f9", padding: 10, borderRadius: 8, border: "1px solid #eee"}}>
                            <b style={{fontSize: 12, color: "#555"}}>{item.name.includes("-") ? item.name.split("-")[1] : item.name}</b>
                            <div style={{fontSize: 14, fontWeight: 'bold', margin: "4px 0", color: "#333"}}>{formatMoneyShort(item.doanhThu)}</div>
                            <div style={{ height: 8, width: "100%", background: "#e8e8e8", borderRadius: 4, overflow: 'hidden'}}>
                                <div style={{ height: '100%', width: `${percent}%`, background: bg }}></div>
                            </div>
                            <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>{percent.toFixed(1)}%</div>
                        </div>
                    )
                }) : <div style={{padding: 20, color: '#999'}}>Không có dữ liệu</div>}
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
                 <span><Tag color="default" style={{borderColor: rankColor, color: index < 3 ? "#000" : "#666", background: index < 3 ? rankColor : "#fff"}}>#{index+1}</Tag> <b>{staff.name}</b></span>
                 <b>{formatMoneyShort(staff.doanhThu)}</b>
              </div>
              <Progress percent={percent} showInfo={false} strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }} size="small" />
            </div>
          );
        })}
        {sortedStaff.length === 0 && <div style={{color: '#999'}}>Chưa có dữ liệu</div>}
      </div>
    </Card>
  );
}

// ==========================================
// 4. CÁC BẢNG CHI TIẾT
// ==========================================

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
          {title: "Hiệu quả", dataIndex: "efficiency", key: "efficiency", align: 'center', render: val => <Tag color={val >= 0 ? "success" : "error"}>{val > 0 ? '+' : ''}{val}%</Tag>, sorter: (a, b) => a.efficiency - b.efficiency},
          {title: "% Mục Tiêu", key: "target", render: (_, record) => <Progress percent={personalTarget > 0 ? (record.doanhThu / personalTarget) * 100 : 0} size="small" steps={5} strokeColor="#52c41a" showInfo={false} />, align: 'center'},
          {title: "Bảo Hiểm", dataIndex: "bhRevenue", key: "bhRevenue", render: val => formatMoneyShort(val), align: 'right'},
        ]}
      />
    </Card>
  );
}

function DetailIndustryTable({ industryData, totalRevenue, creators, filters, setFilters }) {
    const [searchText, setSearchText] = useState('');
    const [searchedColumn, setSearchedColumn] = useState('');
    const searchInput = useRef(null);
    const [selectedIndustries, setSelectedIndustries] = useState([]);
    const defaultCheckedList = ['name', 'soLuong', 'doanhThu', 'dtqd', 'coefficient', 'unitPrice', 'efficiency', 'percent'];
    const [checkedList, setCheckedList] = useState(defaultCheckedList);
    
    const industryOptions = useMemo(() => {
        return industryData.filter(item => !item.isChild).map(item => item.name).sort();
    }, [industryData]);

    const getColumnSearchProps = (dataIndex) => ({
        filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
            <div style={{ padding: 8 }}>
                <Input
                    ref={searchInput}
                    placeholder={`Tìm tên...`}
                    value={selectedKeys[0]}
                    onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
                    onPressEnter={() => handleSearch(selectedKeys, confirm, dataIndex)}
                    style={{ marginBottom: 8, display: 'block' }}
                />
                <Space>
                    <Button type="primary" onClick={() => handleSearch(selectedKeys, confirm, dataIndex)} icon={<SearchOutlined />} size="small" style={{ width: 90 }}>Tìm</Button>
                    <Button onClick={() => handleReset(clearFilters)} size="small" style={{ width: 90 }}>Xóa</Button>
                </Space>
            </div>
        ),
        filterIcon: filtered => <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />,
        onFilter: (value, record) => record[dataIndex] ? record[dataIndex].toString().toLowerCase().includes(value.toLowerCase()) : '',
        onFilterDropdownVisibleChange: visible => { if (visible) setTimeout(() => searchInput.current.select(), 100); },
    });

    const handleSearch = (selectedKeys, confirm, dataIndex) => { confirm(); setSearchText(selectedKeys[0]); setSearchedColumn(dataIndex); };
    const handleReset = (clearFilters) => { clearFilters(); setSearchText(''); };

    const filteredIndustryData = useMemo(() => {
        if (selectedIndustries.length === 0) return industryData;
        return industryData.filter(item => {
            if (item.isChild) {
                const parentName = item.key.split('-')[0];
                return selectedIndustries.includes(parentName);
            }
            return selectedIndustries.includes(item.name);
        });
    }, [industryData, selectedIndustries]);

    const totalRow = filteredIndustryData.reduce((acc, item) => {
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

    const dataSource = [...filteredIndustryData, totalRow];

    const industryFilters = industryData.filter(i => !i.isChild).map(item => ({ text: item.name, value: item.name }));
    const uniqueCoefficients = [...new Set(industryData.map(item => item.coefficient))].filter(Boolean).map(c => ({ text: c, value: c }));

    const allColumns = [
        { 
            title: "NGÀNH HÀNG / NHÓM HÀNG", dataIndex: "name", key: "name", width: 320, fixed: 'left',
            ...getColumnSearchProps('name'),
            filters: industryFilters,
            filterSearch: true, 
            onFilter: (value, record) => record.name.indexOf(value) === 0,
            render: (text, record) => record.name === "TỔNG CỘNG" ? <b style={{color: "#d9363e", fontSize: 15}}>{text}</b> : <span style={{fontWeight: record.isChild ? 400 : 600, paddingLeft: record.isChild ? 20 : 0}}>{text}</span>
        },
        { 
            title: "SỐ LƯỢNG", dataIndex: "soLuong", key: "soLuong", align: 'center', width: 100,
            sorter: (a, b) => a.soLuong - b.soLuong,
            render: (val, record) => record.name === "TỔNG CỘNG" ? <b>{val}</b> : val 
        },
        { 
            title: "DOANH THU THỰC", dataIndex: "doanhThu", key: "doanhThu", align: 'right', width: 150,
            sorter: (a, b) => a.doanhThu - b.doanhThu,
            render: (val, record) => record.name === "TỔNG CỘNG" ? <b style={{color: "#d9363e", fontSize: 15}}>{formatMoneyShort(val)}</b> : formatMoneyShort(val)
        },
        { 
            title: "DOANH THU QĐ", dataIndex: "dtqd", key: "dtqd", align: 'right', width: 150,
            sorter: (a, b) => a.dtqd - b.dtqd,
            render: (val, record) => <b style={{color: "#1890ff"}}>{formatMoneyShort(val)}</b>
        },
        { 
            title: "HỆ SỐ", dataIndex: "coefficient", key: "coefficient", align: 'center', width: 110,
            filters: uniqueCoefficients,
            onFilter: (value, record) => record.coefficient === value,
            sorter: (a, b) => (parseFloat(a.coefficient)||0) - (parseFloat(b.coefficient)||0),
            render: val => val ? <Tag color="purple">{val}</Tag> : "" 
        },
        { 
            title: "ĐƠN GIÁ TB", key: "unitPrice", align: 'right', width: 120,
            sorter: (a, b) => (a.doanhThu/a.soLuong) - (b.doanhThu/b.soLuong),
            render: (_, record) => {
                if(record.name === "TỔNG CỘNG") return "";
                const price = record.soLuong > 0 ? record.doanhThu / record.soLuong : 0;
                return <span style={{color: "#555"}}>{formatMoneyShort(price)}</span>;
            }
        },
        { 
            title: "HIỆU QUẢ", key: "efficiency", align: 'right', width: 140,
            sorter: (a, b) => {
                const effA = a.doanhThu > 0 ? ((a.dtqd - a.doanhThu)/a.doanhThu) : -999;
                const effB = b.doanhThu > 0 ? ((b.dtqd - b.doanhThu)/b.doanhThu) : -999;
                return effA - effB;
            },
            render: (_, record) => {
                if(record.name === "TỔNG CỘNG") return "";
                const eff = record.doanhThu > 0 ? ((record.dtqd - record.doanhThu)/record.doanhThu)*100 : 0;
                const color = eff >= 0 ? "#52c41a" : "#f5222d";
                return <Tag color={color}>{eff > 0 ? '+' : ''}{eff.toFixed(1)}%</Tag>
            }
        },
        { 
            title: "% ĐÓNG GÓP", key: "percent", width: 180,
            render: (_, record) => {
                if(record.name === "TỔNG CỘNG") return "";
                const p = totalRevenue > 0 ? (record.doanhThu / totalRevenue) * 100 : 0;
                return <div style={{display: 'flex', alignItems: 'center', gap: 8}}><span style={{width: 35, fontSize: 12}}>{p.toFixed(1)}%</span><Progress percent={p} showInfo={false} size="small" strokeColor="#1890ff" /></div>
            }
        }
    ];

    const visibleColumns = allColumns.filter(col => checkedList.includes(col.key));

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
            <div style={{fontWeight: 'bold', fontSize: 16, color: '#1890ff'}}>
                <TableOutlined /> CHI TIẾT NGÀNH HÀNG
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
            columns={visibleColumns} dataSource={dataSource} scroll={{x: 1200, y: 500}} 
            pagination={false} size="middle" rowKey="key" bordered expandable={{defaultExpandAllRows: false}}
        />
    </Card>
  );
}

// ==========================================
// 5. COMPONENT MỚI: BẢNG ĐƠN GIÁ TB (UPDATED)
// ==========================================
function StaffAvgPriceTable({ rawData }) {
  // Cấu hình Target cho từng nhóm hàng
  const targetGroups = [
    { id: "1094", name: "Tivi LED (1094)", target: 9000000 },
    { id: "1097", name: "Tủ lạnh (1097)", target: 9000000 },
    { id: "1098", name: "Máy lạnh (1098)", target: 9000000 },
    { id: "1099", name: "Máy giặt (1099)", target: 9000000 },
    { id: "1491", name: "Smartphone (1491)", target: 7000000 },
    { id: "1274", name: "Laptop (1274)", target: 14000000 }, // Added Laptop
  ];

  // State cho bộ lọc nhóm hàng
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

  // Lọc các cột dựa trên selectedGroups
  const visibleGroups = selectedGroups.length > 0 
    ? targetGroups.filter(g => selectedGroups.includes(g.id)) 
    : targetGroups;

  const columns = [
    {
      title: "Nhân Viên", dataIndex: "name", key: "name", fixed: "left", width: 180,
      render: text => <b style={{ color: "#1890ff" }}>{text}</b>
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
        
        // Logic tô màu
        const isPass = price >= group.target;
        const color = isPass ? "#52c41a" : "#f5222d";
        
        return (
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end'}}>
            <span style={{ color: color, fontWeight: 700, fontSize: 14 }}>
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
          <div style={{fontSize: 16, fontWeight: 'bold', color: '#1890ff'}}><DollarOutlined /> Đơn Giá Trung Bình (Doanh Thu / Số Lượng)</div>
          
          {/* BỘ LỌC NHÓM HÀNG RIÊNG */}
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
          <span><Tag color="#52c41a">Xanh</Tag> Đạt mục tiêu</span>
          <span><Tag color="#f5222d">Đỏ</Tag> Thấp hơn mục tiêu</span>
      </div>
      <Table
        dataSource={dataSource} columns={columns} scroll={{ x: 1000, y: 500 }}
        pagination={{ pageSize: 10 }} bordered size="small"
      />
    </Card>
  );
}

// ==========================================
// 6. MAIN COMPONENT
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

    // Lọc dữ liệu khi bộ lọc thay đổi
    const filteredData = useMemo(() => {
        if (allData.length === 0) return [];
        return allData.filter(item => {
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
    }, [allData, filters]);

    useEffect(() => {
        if (filteredData.length > 0) {
            processStatistics(filteredData);
        }
    }, [filteredData]);

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
            conversionEfficiency: parseFloat(efficiency.toFixed(2)),
            installmentRate: parseFloat(installmentRate.toFixed(2)),
            installmentCount: installmentCount,
            totalContracts: data.length,
            pendingConvertedRevenue: pendingConvertedRev
        });

        setIndustryData(finalIndustryData);
        setStaffData(finalStaffData);
    };

    const handleResetFilters = () => {
        setFilters({ creators: [], statuses: [], dateRange: [], keyword: '' });
    };

    return (
        <div style={{ padding: "24px", backgroundColor: "#f0f2f5", minHeight: "100vh", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <div>
                    <h2 style={{ margin: 0, color: "#001529", display: 'flex', alignItems: 'center', gap: 10 }}>
                        <FundOutlined style={{ color: "#1890ff", fontSize: 28 }} />
                        <span style={gradientText}>DASHBOARD DOANH THU & HIỆU QUẢ</span>
                    </h2>
                    <span style={{ color: "#888" }}>Báo cáo chi tiết hiệu suất kinh doanh và chuyển đổi</span>
                </div>
                <Space>
                    <input type="file" accept=".xlsx, .xls" ref={fileInputRef} style={{ display: "none" }} onChange={handleFileUpload} />
                    <Button type="primary" icon={<PlusOutlined />} size="large" onClick={handleImportClick} style={{ borderRadius: 6 }}>Nhập File Excel</Button>
                </Space>
            </div>

            <Spin spinning={loading} tip="Đang xử lý dữ liệu..." size="large">
                <FilterPanel creators={uniqueCreators} statuses={uniqueStatuses} filters={filters} setFilters={setFilters} onReset={handleResetFilters} />

                {allData.length > 0 ? (
                    <>
                        <OverviewSection stats={stats} />
                        <Row gutter={[20, 20]} style={{ marginBottom: 20 }}>
                            <Col xs={24} lg={16}><CategoryChartBar industryData={industryData} totalRevenue={stats.totalRevenue} /></Col>
                            <Col xs={24} lg={8}><StaffHorizontalChart staffData={staffData} /></Col>
                        </Row>
                        <Card style={{ ...cardStyle, padding: 0 }} bodyStyle={{ padding: 0 }}>
                            <Tabs defaultActiveKey="1" type="card" size="large" tabBarStyle={{ margin: 0, padding: "10px 10px 0 10px", background: "#fafafa", borderBottom: "1px solid #f0f0f0" }}>
                                <TabPane tab={<span><AppstoreOutlined /> Chi Tiết Ngành Hàng</span>} key="1">
                                    <div style={{ padding: 20 }}>
                                        <DetailIndustryTable industryData={industryData} totalRevenue={stats.totalRevenue} creators={uniqueCreators} filters={filters} setFilters={setFilters} />
                                    </div>
                                </TabPane>
                                <TabPane tab={<span><DollarOutlined /> Đơn Giá TB / Nhóm</span>} key="3">
                                    <div style={{ padding: 20 }}>
                                        <StaffAvgPriceTable rawData={filteredData} />
                                    </div>
                                </TabPane>
                                <TabPane tab={<span><UserOutlined /> Xếp Hạng Nhân Viên</span>} key="2">
                                    <div style={{ padding: 20 }}>
                                        <TopStaffRanking staffData={staffData} totalRevenue={stats.totalRevenue} />
                                    </div>
                                </TabPane>
                            </Tabs>
                        </Card>
                    </>
                ) : (
                    <div style={{ textAlign: "center", padding: "100px 0", background: "#fff", borderRadius: 12, border: "2px dashed #eee" }}>
                        <div style={{ fontSize: 60, marginBottom: 20 }}>📂</div>
                        <h3 style={{ color: "#666" }}>Chưa có dữ liệu</h3>
                        <p style={{ color: "#999" }}>Vui lòng nhấn nút "Nhập File Excel" ở góc phải để bắt đầu</p>
                        <Button onClick={handleImportClick}>Tải file lên ngay</Button>
                    </div>
                )}
            </Spin>
            
            <div style={{ textAlign: "center", marginTop: 40, color: "#bbb", fontSize: 12 }}>Excel Dashboard System ©{moment().year()} Created with Ant Design & React</div>
        </div>
    );
}