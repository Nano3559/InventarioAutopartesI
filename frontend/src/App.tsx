import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { AppRoutes } from './routes';
import './styles/responsive.css';

export function App() {
  // ERROR INTENCIONAL PARA PRUEBA DE BLOQUEO DE CI FRONTEND (FASE 3)
  const count: number = "texto_invalido_que_rompe_typescript";
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <AppRoutes />
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;