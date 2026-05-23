import { cn } from "@/lib/utils";
import { 
  BarChart3, 
  Package, 
  ShoppingCart, 
  Users, 
  MessageSquare, 
  Mail, 
  PieChart, 
  Settings, 
  HelpCircle,
  ChevronLeft,
  FileText,
  Key,
  Webhook
} from "lucide-react";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3, current: true },
  { name: "Accounts", href: "/accounts", icon: Users },
  { name: "UI Layers", href: "/ui-layers", icon: Package },
  { name: "Customizations", href: "/customizations", icon: Settings },
  { name: "API Usage", href: "/api-usage", icon: MessageSquare, badge: "12" },
];

const otherItems = [
  { name: "Documentation", href: "/docs", icon: FileText },
  { name: "Analytics", href: "/analytics", icon: PieChart },
  { name: "Webhooks", href: "/webhooks", icon: Webhook },
  { name: "API Keys", href: "/api-keys", icon: Key },
  { name: "Changelog", href: "/changelog", icon: FileText },
];

const accountItems = [
  { name: "Account", href: "/account", icon: Settings },
  { name: "Members", href: "/members", icon: Users },
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Feedback", href: "/feedback", icon: HelpCircle },
];

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ease-in-out" 
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      
      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:relative lg:inset-0 flex-shrink-0",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                <ChevronLeft className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="font-semibold text-sm">Kuttl Inc.</div>
                <div className="text-xs text-gray-500">Free Plan</div>
              </div>
            </div>
            <button 
              className="lg:hidden p-2 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" 
              onClick={onClose}
              aria-label="Close navigation menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <div className="flex-1 flex flex-col overflow-y-auto px-4 py-4">
            {/* Main Menu */}
            <div className="mb-8">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                MAIN MENU
              </h3>
              <nav className="space-y-1">
                {navigation.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                      item.current
                        ? "bg-blue-50 text-blue-600 border-r-2 border-blue-500"
                        : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                    )}
                  >
                    <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                    <span className="flex-1">{item.name}</span>
                    {item.badge && (
                      <span className="ml-3 inline-block py-0.5 px-2 text-xs font-medium bg-gray-200 text-gray-800 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </a>
                ))}
              </nav>
            </div>

            {/* Other */}
            <div className="mb-8">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                OTHER
              </h3>
              <nav className="space-y-1">
                {otherItems.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    className="group flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors"
                  >
                    <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                    {item.name}
                  </a>
                ))}
              </nav>
            </div>

            {/* Account */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                ACCOUNT
              </h3>
              <nav className="space-y-1">
                {accountItems.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    className="group flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors"
                  >
                    <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                    {item.name}
                  </a>
                ))}
              </nav>
            </div>
          </div>

          {/* User Profile */}
          <div className="flex-shrink-0 border-t border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
                  JK
                </div>
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  Jevline kief
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}