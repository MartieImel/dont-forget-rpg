import { Routes, Route, Navigate } from "react-router-dom";
import NavBar from "./components/NavBar";
import RequireAuth from "./components/RequireAuth";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import HomePage from "./pages/HomePage";
import CharacterSheetPage from "./pages/CharacterSheetPage";
import SurveyCreatePage from "./pages/SurveyCreatePage";
import CampaignCreatePage from "./pages/CampaignCreatePage";
import CampaignDashboardPage from "./pages/CampaignDashboardPage";
import BoardPage from "./pages/BoardPage";
import EscapeLabPage from "./pages/EscapeLabPage";
import EscapeEditorPage from "./pages/EscapeEditorPage";
import { useAuth } from "./context/AuthContext";

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="center-screen muted">Carregando...</div>;
  return user ? <Navigate to="/home" replace /> : <LandingPage />;
}

export default function App() {
  return (
    <>
      <div className="scanlines" aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />
      <NavBar />
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/home"
          element={
            <RequireAuth>
              <HomePage />
            </RequireAuth>
          }
        />
        <Route
          path="/characters/new"
          element={
            <RequireAuth>
              <SurveyCreatePage />
            </RequireAuth>
          }
        />
        <Route
          path="/characters/new/manual"
          element={
            <RequireAuth>
              <CharacterSheetPage />
            </RequireAuth>
          }
        />
        <Route
          path="/characters/:id"
          element={
            <RequireAuth>
              <CharacterSheetPage />
            </RequireAuth>
          }
        />
        <Route
          path="/campaigns/new"
          element={
            <RequireAuth>
              <CampaignCreatePage />
            </RequireAuth>
          }
        />
        <Route
          path="/campaigns/:id/fuga"
          element={
            <RequireAuth>
              <EscapeEditorPage />
            </RequireAuth>
          }
        />
        <Route
          path="/fuga/teste"
          element={
            <RequireAuth>
              <EscapeLabPage />
            </RequireAuth>
          }
        />
        <Route
          path="/campaigns/:id/board"
          element={
            <RequireAuth>
              <BoardPage />
            </RequireAuth>
          }
        />
        <Route
          path="/campaigns/:id"
          element={
            <RequireAuth>
              <CampaignDashboardPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
