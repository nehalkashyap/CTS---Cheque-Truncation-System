import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";

import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import AddCheque from "./pages/AddCheque";
import Processing from "./pages/Processing";
import Evaluated from "./pages/Evaluated";
import ChequeDetails from "./pages/ChequeDetails";
import Profile from "./pages/Profile";
import BankAccounts from "./pages/BankAccounts";
import Support from "./pages/Support";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";

function Shell({ title }: { title: string }) {
  return (
    <ProtectedRoute>
      <AppLayout title={title} />
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            <Route element={<Shell title="Dashboard" />}>
              <Route path="/dashboard" element={<Dashboard />} />
            </Route>
            <Route element={<Shell title="Deposit a cheque" />}>
              <Route path="/cheques/add" element={<AddCheque />} />
            </Route>
            <Route element={<Shell title="Processing" />}>
              <Route path="/cheques/processing" element={<Processing />} />
            </Route>
            <Route element={<Shell title="Evaluated" />}>
              <Route path="/cheques/evaluated" element={<Evaluated />} />
            </Route>
            <Route element={<Shell title="Cheque details" />}>
              <Route path="/cheques/:id" element={<ChequeDetails />} />
            </Route>
            <Route element={<Shell title="Profile" />}>
              <Route path="/profile" element={<Profile />} />
            </Route>
            <Route element={<Shell title="Bank Accounts" />}>
              <Route path="/banks" element={<BankAccounts />} />
            </Route>
            <Route element={<Shell title="AI Assistant" />}>
              <Route path="/support" element={<Support />} />
            </Route>
            <Route element={<Shell title="Notifications" />}>
              <Route path="/notifications" element={<Notifications />} />
            </Route>
            <Route element={<Shell title="Settings" />}>
              <Route path="/settings" element={<Settings />} />
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
