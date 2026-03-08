import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Welcome from "./pages/Welcome";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Feed from "./pages/Feed";
import Explore from "./pages/Explore";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import Chat from "./pages/Chat";
import Messages from "./pages/Messages";
import Following from "./pages/Following";
import Settings from "./pages/Settings";
import AccountSettings from "./pages/AccountSettings";
import PreferenceSettings from "./pages/PreferenceSettings";
import PrivacySettings from "./pages/PrivacySettings";
import SetAvatar from "./pages/SetAvatar";
import SetUsername from "./pages/SetUsername";
import CreatePost from "./pages/CreatePost";
import CreateStory from "./pages/CreateStory";
import StoryViewer from "./pages/StoryViewer";
import EditProfile from "./pages/EditProfile";
import FollowersList from "./pages/FollowersList";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background"><span className="text-foreground">Loading...</span></div>;
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background"><span className="text-foreground">Loading...</span></div>;
  if (user && profile?.onboarding_completed) return <Navigate to="/feed" replace />;
  if (user && !profile?.onboarding_completed) return <Navigate to="/onboarding/avatar" replace />;
  return <>{children}</>;
};

const AppRoutes = () => (
  <div className="mx-auto max-w-md min-h-screen">
    <Routes>
      <Route path="/" element={<PublicRoute><Welcome /></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/onboarding/avatar" element={<ProtectedRoute><SetAvatar /></ProtectedRoute>} />
      <Route path="/onboarding/username" element={<ProtectedRoute><SetUsername /></ProtectedRoute>} />
      <Route path="/feed" element={<ProtectedRoute><Feed /></ProtectedRoute>} />
      <Route path="/explore" element={<ProtectedRoute><Explore /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
      <Route path="/chat/:conversationId" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
      <Route path="/following" element={<ProtectedRoute><Following /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/settings/account" element={<ProtectedRoute><AccountSettings /></ProtectedRoute>} />
      <Route path="/settings/preference" element={<ProtectedRoute><PreferenceSettings /></ProtectedRoute>} />
      <Route path="/settings/privacy" element={<ProtectedRoute><PrivacySettings /></ProtectedRoute>} />
      <Route path="/create-post" element={<ProtectedRoute><CreatePost /></ProtectedRoute>} />
      <Route path="/create-story" element={<ProtectedRoute><CreateStory /></ProtectedRoute>} />
      <Route path="/story" element={<ProtectedRoute><StoryViewer /></ProtectedRoute>} />
      <Route path="/edit-profile" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <AppRoutes />
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
