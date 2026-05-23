import { DashboardLayout } from "@/components/dashboard-layout";
import { CheckCircle, AlertTriangle, Plus, Zap, Bug, Wrench } from "lucide-react";

const changelogEntries = [
  {
    id: 1,
    version: "v2.1.0",
    date: "May 8, 2026",
    type: "feature",
    title: "Enhanced UI Layer Performance",
    description: "Improved rendering speed for complex customizations by 40%. New caching mechanism for frequently used components.",
    changes: [
      "Added intelligent caching for UI layer components",
      "Optimized CSS injection for better performance",
      "Reduced initial load time by 25%"
    ]
  },
  {
    id: 2,
    version: "v2.0.5",
    date: "May 3, 2026",
    type: "fix",
    title: "Account Management Fixes",
    description: "Fixed critical issues with account creation and API key generation.",
    changes: [
      "Fixed account creation failing for certain email domains",
      "Resolved API key regeneration timeout issues",
      "Improved error messaging for invalid account operations"
    ]
  },
  {
    id: 3,
    version: "v2.0.4",
    date: "April 28, 2026",
    type: "improvement",
    title: "Customization Editor Updates",
    description: "Enhanced the customization editor with better preview capabilities and real-time validation.",
    changes: [
      "Added live preview for customization changes",
      "Improved CSS validation with helpful error messages",
      "New component library with 50+ pre-built elements"
    ]
  },
  {
    id: 4,
    version: "v2.0.3",
    date: "April 22, 2026",
    type: "security",
    title: "Security Enhancements",
    description: "Important security updates and improvements to API authentication.",
    changes: [
      "Enhanced API key encryption",
      "Added rate limiting for all endpoints",
      "Improved CORS handling for cross-origin requests",
      "Updated dependencies to patch security vulnerabilities"
    ]
  },
  {
    id: 5,
    version: "v2.0.2",
    date: "April 15, 2026",
    type: "feature",
    title: "Webhook Integration",
    description: "Added comprehensive webhook support for real-time notifications of customization events.",
    changes: [
      "New webhook endpoints for customization events",
      "Configurable webhook retry logic",
      "Webhook payload validation and signing",
      "Dashboard for managing webhook subscriptions"
    ]
  }
];

const typeConfig = {
  feature: {
    icon: Zap,
    color: "bg-blue-100 text-blue-800",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200"
  },
  fix: {
    icon: Bug,
    color: "bg-red-100 text-red-800",
    bgColor: "bg-red-50",
    borderColor: "border-red-200"
  },
  improvement: {
    icon: Wrench,
    color: "bg-green-100 text-green-800",
    bgColor: "bg-green-50",
    borderColor: "border-green-200"
  },
  security: {
    icon: AlertTriangle,
    color: "bg-yellow-100 text-yellow-800",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200"
  }
};

export default function Changelog() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Changelog</h1>
            <p className="text-sm text-gray-500">Track updates and improvements to the Kuttl platform</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Latest:</span>
            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
              v2.1.0
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span>Features</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>Improvements</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                <span>Fixes</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">8</div>
              <div className="text-sm text-gray-500">Features Added</div>
              <div className="text-xs text-green-500 mt-1">This month</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">15</div>
              <div className="text-sm text-gray-500">Improvements</div>
              <div className="text-xs text-green-500 mt-1">This month</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">12</div>
              <div className="text-sm text-gray-500">Issues Fixed</div>
              <div className="text-xs text-green-500 mt-1">This month</div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {changelogEntries.map((entry) => {
            const config = typeConfig[entry.type as keyof typeof typeConfig];
            const IconComponent = config.icon;
            
            return (
              <div 
                key={entry.id} 
                className={`bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow ${config.bgColor} ${config.borderColor}`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-full ${config.color.replace('text-', 'bg-').replace('800', '200')}`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-semibold text-gray-900">{entry.title}</h3>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
                            {entry.type}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-sm font-medium text-gray-600">{entry.version}</span>
                          <span className="text-sm text-gray-500">•</span>
                          <span className="text-sm text-gray-500">{entry.date}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-gray-700 mb-4">{entry.description}</p>
                  
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-900">Changes:</h4>
                    <ul className="space-y-1">
                      {entry.changes.map((change, index) => (
                        <li key={index} className="flex items-start space-x-2 text-sm text-gray-600">
                          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{change}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center py-8">
          <p className="text-sm text-gray-500 mb-4">Want to see older releases?</p>
          <button className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors">
            <Plus className="w-4 h-4" />
            <span>Load More Entries</span>
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}