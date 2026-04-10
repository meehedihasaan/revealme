import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import PageLoader from "@/components/PageLoader";
import PageLoadWrapper from "@/components/PageLoadWrapper";
import { usePresence } from "@/hooks/usePresence";
import { useScrollToTop } from "@/hooks/useScrollToTop";
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
import UserProfile from "./pages/UserProfile";
import RequestVerification from "./pages/RequestVerification";
import NotFound from "./pages/NotFound";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminVerifications from "./pages/admin/AdminVerifications";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminUserManagement from "./pages/admin/AdminUserManagement";
import AdminRoleManagement from "./pages/admin/AdminRoleManagement";
import AdminAppSettings from "./pages/admin/AdminAppSettings";
import AdminPosts from "./pages/admin/AdminPosts";
import AdminBanManagement from "./pages/admin/AdminBanManagement";
import AdminWordFilter from "./pages/admin/AdminWordFilter";
import AdminReportedContent from "./pages/admin/AdminReportedContent";
import PostDetail from "./pages/PostDetail";
import VerifyCode from "./pages/VerifyCode";
import UserMap from "./pages/UserMap";
import NearbyUsers from "./pages/NearbyUsers";
import LocationSettings from "./pages/LocationSettings";
import DiscoverPeople from "./pages/DiscoverPeople";
import ResetPassword from "./pages/ResetPassword";
import NotificationSettings from "./pages/NotificationSettings";
import DataStorageSettings from "./pages/DataStorageSettings";
import HelpSupportSettings from "./pages/HelpSupportSettings";
import ActivitySettings from "./pages/ActivitySettings";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (user && profile === null) return <PageLoader />;
  if (user && profile?.onboarding_completed) return <Navigate to="/feed" replace />;
  if (user && !profile?.onboarding_completed) return <Navigate to="/onboarding/avatar" replace />;
  return <>{children}</>;
};

const AppRoutes = () => {
  usePresence();
  useScrollToTop();
  return (
  <div className="mx-auto max-w-md min-h-screen">
    <Routes>
      <Route path="/" element={<PublicRoute><Welcome /></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/onboarding/verify" element={<VerifyCode />} />
      <Route path="/onboarding/avatar" element={<ProtectedRoute><SetAvatar /></ProtectedRoute>} />
      <Route path="/onboarding/username" element={<ProtectedRoute><SetUsername /></ProtectedRoute>} />
      <Route path="/onboarding/discover" element={<ProtectedRoute><DiscoverPeople /></ProtectedRoute>} />
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
      <Route path="/settings/verification" element={<ProtectedRoute><RequestVerification /></ProtectedRoute>} />
      <Route path="/settings/location" element={<ProtectedRoute><LocationSettings /></ProtectedRoute>} />
      <Route path="/create-post" element={<ProtectedRoute><CreatePost /></ProtectedRoute>} />
      <Route path="/create-story" element={<ProtectedRoute><CreateStory /></ProtectedRoute>} />
      <Route path="/story" element={<ProtectedRoute><StoryViewer /></ProtectedRoute>} />
      <Route path="/edit-profile" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
      <Route path="/followers" element={<ProtectedRoute><FollowersList /></ProtectedRoute>} />
      <Route path="/user/:userId" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
      <Route path="/post/:postId" element={<ProtectedRoute><PostDetail /></ProtectedRoute>} />
      <Route path="/user-map" element={<ProtectedRoute><UserMap /></ProtectedRoute>} />
      <Route path="/nearby-users" element={<ProtectedRoute><NearbyUsers /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="verifications" element={<AdminVerifications />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="user-management" element={<AdminUserManagement />} />
        <Route path="roles" element={<AdminRoleManagement />} />
        <Route path="settings" element={<AdminAppSettings />} />
        <Route path="posts" element={<AdminPosts />} />
        <Route path="bans" element={<AdminBanManagement />} />
        <Route path="word-filter" element={<AdminWordFilter />} />
        <Route path="reports" element={<AdminReportedContent />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  </div>
  );
};

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
