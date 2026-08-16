import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import PublicLayout from "./components/PublicLayout";
import PortalLayout from "./components/PortalLayout";

import Home from "./pages/public/Home";
import ServicesPage from "./pages/public/Services";
import ServiceDetail from "./pages/public/ServiceDetail";
import { HowItWorks, Pricing, FaqPage, About, Coverage, ReviewsPage, BecomeProvider, ComingSoon, CompletionCodePage } from "./pages/public/InfoPages";
import { BlogList, BlogPost } from "./pages/public/Blog";
import Contact from "./pages/public/Contact";
import TrustSafety from "./pages/public/TrustSafety";
import { LegalPage, NotFound } from "./pages/public/Legal";

import { Login, Register, ForgotPassword, ResetPassword, AuthCallback } from "./pages/auth/AuthPages";

import { Messages, Notifications, SettingsPage, Support, MyReviews } from "./pages/portal/Shared";
import AiAssistant from "./pages/portal/AiAssistant";

import { CustomerDashboard, NewRequest, MyRequests, QuotesPage, PaymentsPage, InvoicesPage, Favourites } from "./pages/customer/Customer";
import RequestDetail from "./pages/customer/RequestDetail";
import { PaymentSuccess, PaymentCancel } from "./pages/customer/PaymentResult";

import { ProviderDashboard, BrowseJobs, MyQuotes, MyJobs, Earnings, Availability, Verification, ProviderProfile } from "./pages/provider/Provider";
import JobDetail from "./pages/provider/JobDetail";

import { AdminDashboard, AdminUsers, AdminProviders, AdminJobs, AdminPayments, AdminReports } from "./pages/admin/Admin";
import { AdminCategories, AdminBlog, AdminCms, AdminTemplates, AdminReviews, AdminSupport, AdminAudit, AdminSettings } from "./pages/admin/AdminGeneric";
import AdminAi from "./pages/admin/AdminAi";
import CommsHub from "./pages/admin/CommsHub";

function Protected({ roles, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div data-testid="auth-loading" className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (roles && !roles.includes(user.role)) {
    const home = user.role === "admin" || user.role === "super_admin" ? "/admin" : user.role === "provider" ? "/pro" : "/dashboard";
    return <Navigate to={home} replace />;
  }
  return children;
}

function GuestOnly({ children }) {
  const { user, loading, homeFor } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to={homeFor(user)} replace />;
  return children;
}

const sharedRoutes = (base) => [
  <Route key="m" path={`${base}/messages`} element={<Messages />} />,
  <Route key="mc" path={`${base}/messages/:convId`} element={<Messages />} />,
  <Route key="n" path={`${base}/notifications`} element={<Notifications />} />,
  <Route key="r" path={`${base}/reviews`} element={<MyReviews />} />,
  <Route key="s" path={`${base}/support`} element={<Support />} />,
  <Route key="set" path={`${base}/settings`} element={<SettingsPage />} />,
];

function AppRouter() {
  const location = useLocation();
  if (location.hash?.includes("session_id=")) return <AuthCallback />;
  return (
    <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/services/:slug" element={<ServiceDetail />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/the-code" element={<CompletionCodePage />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/faq" element={<FaqPage />} />
            <Route path="/about" element={<About />} />
            <Route path="/coverage" element={<Coverage />} />
            <Route path="/reviews" element={<ReviewsPage />} />
            <Route path="/become-provider" element={<BecomeProvider />} />
            <Route path="/blog" element={<BlogList />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/trust" element={<TrustSafety />} />
            <Route path="/trust-safety" element={<TrustSafety />} />
            <Route path="/legal/:slug" element={<LegalPage />} />
            <Route path="/coming-soon" element={<ComingSoon />} />
            <Route path="*" element={<NotFound />} />
          </Route>

          <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
          <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
          <Route path="/forgot-password" element={<GuestOnly><ForgotPassword /></GuestOnly>} />
          <Route path="/reset-password" element={<GuestOnly><ResetPassword /></GuestOnly>} />

          <Route element={<Protected roles={["customer"]}><PortalLayout role="customer" /></Protected>}>
            <Route path="/dashboard" element={<CustomerDashboard />} />
            <Route path="/dashboard/requests" element={<MyRequests />} />
            <Route path="/dashboard/requests/new" element={<NewRequest />} />
            <Route path="/dashboard/requests/:id" element={<RequestDetail />} />
            <Route path="/dashboard/quotes" element={<QuotesPage />} />
            <Route path="/dashboard/payments" element={<PaymentsPage />} />
            <Route path="/dashboard/invoices" element={<InvoicesPage />} />
            <Route path="/dashboard/favourites" element={<Favourites />} />
            <Route path="/dashboard/assistant" element={<AiAssistant assistant="customer" />} />
            {sharedRoutes("/dashboard")}
          </Route>

          <Route element={<Protected roles={["provider"]}><PortalLayout role="provider" /></Protected>}>
            <Route path="/pro" element={<ProviderDashboard />} />
            <Route path="/pro/browse" element={<BrowseJobs />} />
            <Route path="/pro/browse/:id" element={<RequestDetail providerView />} />
            <Route path="/pro/jobs" element={<MyJobs />} />
            <Route path="/pro/jobs/:id" element={<JobDetail />} />
            <Route path="/pro/quotes" element={<MyQuotes />} />
            <Route path="/pro/earnings" element={<Earnings />} />
            <Route path="/pro/calendar" element={<Availability />} />
            <Route path="/pro/verification" element={<Verification />} />
            <Route path="/pro/profile" element={<ProviderProfile />} />
            <Route path="/pro/assistant" element={<AiAssistant assistant="provider" />} />
            {sharedRoutes("/pro")}
          </Route>

          <Route element={<Protected roles={["admin", "super_admin"]}><PortalLayout role="admin" /></Protected>}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/providers" element={<AdminProviders />} />
            <Route path="/admin/jobs" element={<AdminJobs />} />
            <Route path="/admin/payments" element={<AdminPayments />} />
            <Route path="/admin/reviews" element={<AdminReviews />} />
            <Route path="/admin/support" element={<AdminSupport />} />
            <Route path="/admin/categories" element={<AdminCategories />} />
            <Route path="/admin/blog" element={<AdminBlog />} />
            <Route path="/admin/cms" element={<AdminCms />} />
            <Route path="/admin/templates" element={<AdminTemplates />} />
            <Route path="/admin/comms" element={<CommsHub />} />
            <Route path="/admin/ai" element={<AdminAi />} />
            <Route path="/admin/reports" element={<AdminReports />} />
            <Route path="/admin/audit" element={<AdminAudit />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
          </Route>

          <Route path="/payment/success" element={<PaymentSuccess />} />
          <Route path="/payment/cancel" element={<PaymentCancel />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <AppRouter />
      </BrowserRouter>
    </AuthProvider>
  );
}
