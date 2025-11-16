import React from "react";
import { Layout } from "antd";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import ExcelDashboard from "./components/ExcelDashboard";

const { Content } = Layout;

function App() {
  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sidebar />
      <Layout>
        <Header />
        <Content style={{ margin: 16 }}>
          <ExcelDashboard />
        </Content>
      </Layout>
    </Layout>
  );
}

export default App;
