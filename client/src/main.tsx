import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext.tsx'
import { BrowserRouter } from 'react-router-dom'
import './styles/global.css';
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from './utils/queryClient.ts'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
     <AuthProvider>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
)
