import { DashboardLayout } from "@/components/dashboard-layout";
import { Eye, EyeOff, Check, Save, User, Bell, Shield, CreditCard, Trash2 } from "lucide-react";
import { useState } from "react";
import { Input } from "../components/ui/input";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("profile");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [profileData, setProfileData] = useState({
    firstName: "Jevline",
    lastName: "Kief",
    email: "j.kief@kuttl.xyz",
    company: "Kuttl Inc.",
    jobTitle: "Product Manager",
    timezone: "UTC-8 (Pacific Time)",
    avatar: ""
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [passwordRequirements, setPasswordRequirements] = useState({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    securityAlerts: true,
    productUpdates: false,
    marketingEmails: false,
    weeklyReports: true,
    apiLimitWarnings: true
  });

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));

    if (name === "newPassword") {
      setPasswordRequirements({
        minLength: value.length >= 8,
        hasUppercase: /[A-Z]/.test(value),
        hasLowercase: /[a-z]/.test(value),
        hasNumber: /\d/.test(value),
        hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?]/.test(value)
      });
    }
  };

  const handleNotificationChange = (setting: string) => {
    setNotificationSettings(prev => ({
      ...prev,
      [setting]: !prev[setting as keyof typeof prev]
    }));
  };

  const passwordsMatch = passwordData.newPassword === passwordData.confirmPassword && passwordData.confirmPassword !== "";
  const allRequirementsMet = Object.values(passwordRequirements).every(Boolean);

  const tabs = [
    { id: "profile", name: "Profile", icon: User },
    { id: "security", name: "Security", icon: Shield },
    { id: "notifications", name: "Notifications", icon: Bell },
    { id: "billing", name: "Billing", icon: CreditCard }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
          <p className="text-sm text-gray-500">Manage your account preferences and security settings</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:w-64">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === tab.id
                        ? "bg-blue-50 text-blue-600 border-r-2 border-blue-500"
                        : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <IconComponent className="mr-3 h-5 w-5 flex-shrink-0" />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1">
            {activeTab === "profile" && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Profile Information</h2>
                
                <form className="space-y-6">
                  {/* Avatar */}
                  <div className="flex items-center space-x-4">
                    <div className="h-16 w-16 rounded-full bg-blue-500 flex items-center justify-center text-white text-xl font-medium">
                      {profileData.firstName.charAt(0)}{profileData.lastName.charAt(0)}
                    </div>
                    <div>
                      <button className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100">
                        Change avatar
                      </button>
                      <p className="text-xs text-gray-500 mt-1">JPG, PNG up to 2MB</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">First name</label>
                      <Input
                        type="text"
                        name="firstName"
                        value={profileData.firstName}
                        onChange={handleProfileChange}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
                      <Input
                        type="text"
                        name="lastName"
                        value={profileData.lastName}
                        onChange={handleProfileChange}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
                    <Input
                      type="email"
                      name="email"
                      value={profileData.email}
                      onChange={handleProfileChange}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                      <Input
                        type="text"
                        name="company"
                        value={profileData.company}
                        onChange={handleProfileChange}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Job title</label>
                      <Input
                        type="text"
                        name="jobTitle"
                        value={profileData.jobTitle}
                        onChange={handleProfileChange}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                    <select
                      name="timezone"
                      value={profileData.timezone}
                      onChange={handleProfileChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="UTC-8 (Pacific Time)">UTC-8 (Pacific Time)</option>
                      <option value="UTC-5 (Eastern Time)">UTC-5 (Eastern Time)</option>
                      <option value="UTC+0 (GMT)">UTC+0 (GMT)</option>
                      <option value="UTC+1 (CET)">UTC+1 (CET)</option>
                    </select>
                  </div>

                  <div className="pt-4">
                    <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <Save className="w-4 h-4" />
                      <span>Save changes</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === "security" && (
              <div className="space-y-6">
                {/* Change Password */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Change Password</h2>
                  
                  <form className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Current password</label>
                      <Input
                        type={showCurrentPassword ? "text" : "password"}
                        name="currentPassword"
                        value={passwordData.currentPassword}
                        onChange={handlePasswordChange}
                        placeholder="Enter current password"
                        rightIcon={
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        }
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
                      <Input
                        type={showNewPassword ? "text" : "password"}
                        name="newPassword"
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        placeholder="Enter new password"
                        rightIcon={
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        }
                      />

                      {/* Password Requirements */}
                      {passwordData.newPassword && (
                        <div className="mt-2 space-y-1">
                          <div className="text-xs text-gray-600">Password must contain:</div>
                          <div className="grid grid-cols-2 gap-1 text-xs">
                            <div className={`flex items-center space-x-1 ${passwordRequirements.minLength ? 'text-green-600' : 'text-gray-400'}`}>
                              <Check className="w-3 h-3" />
                              <span>8+ characters</span>
                            </div>
                            <div className={`flex items-center space-x-1 ${passwordRequirements.hasUppercase ? 'text-green-600' : 'text-gray-400'}`}>
                              <Check className="w-3 h-3" />
                              <span>Uppercase</span>
                            </div>
                            <div className={`flex items-center space-x-1 ${passwordRequirements.hasLowercase ? 'text-green-600' : 'text-gray-400'}`}>
                              <Check className="w-3 h-3" />
                              <span>Lowercase</span>
                            </div>
                            <div className={`flex items-center space-x-1 ${passwordRequirements.hasNumber ? 'text-green-600' : 'text-gray-400'}`}>
                              <Check className="w-3 h-3" />
                              <span>Number</span>
                            </div>
                            <div className={`flex items-center space-x-1 ${passwordRequirements.hasSpecialChar ? 'text-green-600' : 'text-gray-400'} col-span-2`}>
                              <Check className="w-3 h-3" />
                              <span>Special character</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Confirm new password</label>
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                        placeholder="Confirm new password"
                        error={passwordData.confirmPassword && !passwordsMatch}
                        rightIcon={
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        }
                      />
                      {passwordData.confirmPassword && !passwordsMatch && (
                        <p className="mt-1 text-xs text-red-600">Passwords do not match</p>
                      )}
                      {passwordsMatch && (
                        <p className="mt-1 text-xs text-green-600">Passwords match</p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={!allRequirementsMet || !passwordsMatch || !passwordData.currentPassword}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      <Save className="w-4 h-4" />
                      <span>Update password</span>
                    </button>
                  </form>
                </div>

                {/* Two-Factor Authentication */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Two-Factor Authentication</h2>
                  <p className="text-sm text-gray-600 mb-4">Add an extra layer of security to your account</p>
                  
                  <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-md">
                    <div>
                      <div className="text-sm font-medium text-gray-900">Authenticator App</div>
                      <div className="text-xs text-gray-500">Not enabled</div>
                    </div>
                    <button className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100">
                      Enable
                    </button>
                  </div>
                </div>

                {/* Active Sessions */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Sessions</h2>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-md">
                      <div>
                        <div className="text-sm font-medium text-gray-900">MacBook Pro - Safari</div>
                        <div className="text-xs text-gray-500">San Francisco, CA • Current session</div>
                      </div>
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Current</span>
                    </div>
                    
                    <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-md">
                      <div>
                        <div className="text-sm font-medium text-gray-900">iPhone - Mobile Safari</div>
                        <div className="text-xs text-gray-500">San Francisco, CA • 2 hours ago</div>
                      </div>
                      <button className="text-xs text-red-600 hover:text-red-800">Revoke</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "notifications" && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Notification Preferences</h2>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Email Notifications</h3>
                    <div className="space-y-3">
                      {[
                        { key: "emailNotifications", label: "All email notifications", description: "Receive email notifications for account activity" },
                        { key: "securityAlerts", label: "Security alerts", description: "Get notified about security-related events" },
                        { key: "productUpdates", label: "Product updates", description: "News about new features and improvements" },
                        { key: "marketingEmails", label: "Marketing emails", description: "Promotional content and special offers" },
                        { key: "weeklyReports", label: "Weekly reports", description: "Summary of your account activity" },
                        { key: "apiLimitWarnings", label: "API limit warnings", description: "Alerts when approaching usage limits" }
                      ].map((setting) => (
                        <div key={setting.key} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{setting.label}</div>
                            <div className="text-xs text-gray-500">{setting.description}</div>
                          </div>
                          <button
                            onClick={() => handleNotificationChange(setting.key)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                              notificationSettings[setting.key as keyof typeof notificationSettings]
                                ? "bg-blue-600"
                                : "bg-gray-200"
                            }`}
                          >
                            <span
                              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                notificationSettings[setting.key as keyof typeof notificationSettings]
                                  ? "translate-x-5"
                                  : "translate-x-1"
                              }`}
                            />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4">
                    <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <Save className="w-4 h-4" />
                      <span>Save preferences</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "billing" && (
              <div className="space-y-6">
                {/* Current Plan */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Current Plan</h2>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-gray-900">Free Plan</div>
                      <div className="text-sm text-gray-500">10,000 API calls per month</div>
                      <div className="text-xs text-gray-400 mt-1">7,450 calls used this month</div>
                    </div>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                      Upgrade Plan
                    </button>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h2>
                  <p className="text-sm text-gray-600 mb-4">No payment method on file</p>
                  <button className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100">
                    Add payment method
                  </button>
                </div>

                {/* Billing History */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Billing History</h2>
                  <div className="text-center py-8">
                    <div className="text-sm text-gray-500">No billing history available</div>
                    <div className="text-xs text-gray-400 mt-1">Invoices will appear here when you upgrade to a paid plan</div>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="bg-white rounded-lg border border-red-200 p-6">
                  <h2 className="text-lg font-semibold text-red-900 mb-4">Danger Zone</h2>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 mb-1">Delete Account</h3>
                      <p className="text-xs text-gray-500 mb-3">Once you delete your account, there is no going back. Please be certain.</p>
                      <button className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500">
                        <Trash2 className="w-4 h-4" />
                        <span>Delete account</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}