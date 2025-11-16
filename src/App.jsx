import React from "react";
import { Layout } from "antd";
import "antd/dist/reset.css"; // Reset CSS của Ant Design
import "./App.css"; // CSS riêng của bạn nếu có

// Import các component
import ExcelDashboard from "./components/ExcelDashboard";
import Sidebar from "./components/Sidebar"; // Nếu bạn đã có Sidebar
import Header from "./components/Header";   // Nếu bạn đã có Header

const { Content } = Layout;

function App() {
  return (
    <Layout style={{ minHeight: "100vh" }}>
      {/* Sidebar nếu có */}
      {Sidebar && <Sidebar />}

      <Layout>
        {/* Header nếu có */}
        {Header && <Header />}

        {/* Nội dung chính */}
        <Content style={{ margin: 16 }}>
          <ExcelDashboard />
        </Content>
      </Layout>
    </Layout>
  );
}

export default App;
