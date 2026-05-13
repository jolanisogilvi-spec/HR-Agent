import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import App from './App'
import './index.css'

dayjs.locale('zh-cn')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#00A3FF',
          colorSuccess: '#20C997',
          colorWarning: '#F5A524',
          colorError: '#FF5C7A',
          colorInfo: '#00A3FF',
          colorText: '#172033',
          colorTextSecondary: '#637083',
          colorBgLayout: '#EEF3F8',
          colorBgContainer: 'rgba(255,255,255,0.92)',
          borderRadius: 8,
          boxShadow: '0 14px 40px rgba(24, 39, 75, 0.10)',
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif",
        },
        components: {
          Button: {
            controlHeight: 34,
            borderRadius: 7,
            primaryShadow: '0 8px 18px rgba(0, 163, 255, 0.24)',
          },
          Card: {
            borderRadiusLG: 8,
          },
          Table: {
            headerBg: '#F4F8FC',
            headerColor: '#172033',
            rowHoverBg: '#F0F8FF',
          },
          Menu: {
            darkItemBg: 'transparent',
            darkItemSelectedBg: 'rgba(0, 163, 255, 0.16)',
            darkItemSelectedColor: '#FFFFFF',
            darkItemColor: 'rgba(226, 239, 255, 0.74)',
          },
        },
      }}
    >
      <App />
    </ConfigProvider>
  </React.StrictMode>
)
