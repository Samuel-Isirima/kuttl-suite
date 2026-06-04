import { useState, useEffect } from "react";
import { DashboardLayout } from "../components/dashboard-layout";
import { AuthWrapper } from "../components/auth-wrapper";
import { api, getStoredUser } from "../lib/api";
import { toast } from "sonner";
import { User, Mail, Lock, Shield, Calendar, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Input } from "../components/ui/input";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

interface ProfileUpdateData {
  name: string;
  email: string;
}

interface PasswordChangeData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export default function Profile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileFormData, setProfileFormData] = useState<ProfileUpdateData>({
    name: "",
    email: "",
  });
  const [passwordFormData, setPasswordFormData] = useState<PasswordChangeData>({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [profileUpdating, setProfileUpdating] = useState(false);
  const [passwordChanging, setPasswordChanging] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "password">("profile");

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('auth/profile').json<{ success: boolean; data: UserProfile }>();
      const profileData = response.data || response;
      setProfile(profileData);
      setProfileFormData({
        name: profileData.name,
        email: profileData.email,
      });
    } catch (error: any) {
      console.error('Failed to fetch profile:', error);
      
      if (error.response && error.response.status === 401) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return;
      }
      
      toast.error("Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profileFormData.name.trim() || !profileFormData.email.trim()) {
      toast.error("Name and email are required");
      return;
    }

    setProfileUpdating(true);
    try {
      const response = await api.put('auth/profile', {
        json: profileFormData
      }).json<{ success: boolean; data: { user: UserProfile; message: string } }>();
      
      const result = response.data || response;
      setProfile(result.user);
      
      // Update stored user data
      localStorage.setItem('user', JSON.stringify(result.user));
      
      toast.success("Profile updated successfully");
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      
      if (error.response) {
        const errorData = await error.response.json().catch(() => ({}));
        toast.error(errorData.message || "Failed to update profile");
      } else {
        toast.error("Failed to update profile");
      }
    } finally {
      setProfileUpdating(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!passwordFormData.current_password || !passwordFormData.new_password) {
      toast.error("Current password and new password are required");
      return;
    }

    if (passwordFormData.new_password.length < 8) {
      toast.error("New password must be at least 8 characters long");
      return;
    }

    if (passwordFormData.new_password !== passwordFormData.confirm_password) {
      toast.error("New passwords do not match");
      return;
    }

    setPasswordChanging(true);
    try {
      await api.post('auth/change-password', {
        json: {
          current_password: passwordFormData.current_password,
          new_password: passwordFormData.new_password
        }
      }).json();
      
      toast.success("Password changed successfully");
      setPasswordFormData({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
    } catch (error: any) {
      console.error('Failed to change password:', error);
      
      if (error.response) {
        const errorData = await error.response.json().catch(() => ({}));
        toast.error(errorData.message || "Failed to change password");
      } else {
        toast.error("Failed to change password");
      }
    } finally {
      setPasswordChanging(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <AuthWrapper>
        <DashboardLayout>
          <div className="space-y-6">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="bg-white p-6 rounded-lg border">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          </div>
        </DashboardLayout>
      </AuthWrapper>
    );
  }

  return (
    <AuthWrapper>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage your account settings and preferences
              </p>
            </div>
          </div>

          {/* Profile Overview Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
                {profile?.name ? profile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900">{profile?.name}</h2>
                <p className="text-gray-600">{profile?.email}</p>
                <div className="flex items-center space-x-4 mt-2">
                  <div className="flex items-center space-x-1">
                    <Shield className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-500 capitalize">{profile?.role}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    {profile?.verified ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-yellow-500" />
                    )}
                    <span className="text-sm text-gray-500">
                      {profile?.verified ? 'Verified' : 'Unverified'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-500">
                      Joined {profile ? formatDate(profile.created_at) : ''}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab("profile")}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === "profile"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4" />
                    <span>Profile Details</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab("password")}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === "password"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Lock className="w-4 h-4" />
                    <span>Change Password</span>
                  </div>
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === "profile" && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Update Profile Information</h3>
                  <form onSubmit={handleProfileUpdate} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                          Full Name
                        </label>
                        <Input
                          type="text"
                          id="name"
                          value={profileFormData.name}
                          onChange={(e) => setProfileFormData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Enter your full name"
                          required
                          icon={<User className="h-4 w-4" />}
                        />
                      </div>
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                          Email Address
                        </label>
                        <Input
                          type="email"
                          id="email"
                          value={profileFormData.email}
                          onChange={(e) => setProfileFormData(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="Enter your email address"
                          required
                          icon={<Mail className="h-4 w-4" />}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={profileUpdating}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {profileUpdating ? "Updating..." : "Update Profile"}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {activeTab === "password" && (
                <div className="max-w-md mx-auto">
                  {/* Header with Icon */}
                  <div className="text-center mb-8">
                    <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                      <Lock className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="text-2xl font-semibold text-gray-900 mb-2">Change Password</h3>
                    <p className="text-gray-600">
                      To change your password, please fill in the fields below.
                      Your password must contain at least 8 characters, it must also include at least
                      one upper case letter, one lower case letter, one number and one special
                      character.
                    </p>
                  </div>

                  <form onSubmit={handlePasswordChange} className="space-y-6">
                    <div>
                      <label htmlFor="current_password" className="block text-sm font-medium text-gray-900 mb-2">
                        Current Password
                      </label>
                      <Input
                        type={showCurrentPassword ? "text" : "password"}
                        id="current_password"
                        value={passwordFormData.current_password}
                        onChange={(e) => setPasswordFormData(prev => ({ ...prev, current_password: e.target.value }))}
                        placeholder="Current Password"
                        required
                        icon={<Lock className="h-4 w-4" />}
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
                      <label htmlFor="new_password" className="block text-sm font-medium text-gray-900 mb-2">
                        New Password
                      </label>
                      <Input
                        type={showNewPassword ? "text" : "password"}
                        id="new_password"
                        value={passwordFormData.new_password}
                        onChange={(e) => setPasswordFormData(prev => ({ ...prev, new_password: e.target.value }))}
                        placeholder="New Password"
                        required
                        minLength={8}
                        icon={<Lock className="h-4 w-4" />}
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
                    </div>

                    <div>
                      <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-900 mb-2">
                        Confirm Password
                      </label>
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        id="confirm_password"
                        value={passwordFormData.confirm_password}
                        onChange={(e) => setPasswordFormData(prev => ({ ...prev, confirm_password: e.target.value }))}
                        placeholder="Confirm Password"
                        required
                        icon={<Lock className="h-4 w-4" />}
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
                    </div>

                    <button
                      type="submit"
                      disabled={passwordChanging}
                      className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {passwordChanging ? "Changing..." : "Change Password"}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </AuthWrapper>
  );
}