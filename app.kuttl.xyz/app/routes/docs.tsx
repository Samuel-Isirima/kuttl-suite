import { DashboardLayout } from "@/components/dashboard-layout";
import { AuthWrapper } from "../components/auth-wrapper";
import { 
  Globe, 
  Camera, 
  Palette, 
  Code, 
  Key, 
  Zap, 
  Shield, 
  BarChart3, 
  Copy,
  ExternalLink,
  CheckCircle,
  ArrowRight
} from "lucide-react";
import { useState } from "react";

export default function Docs() {
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  const copyToClipboard = async (text: string, snippetId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSnippet(snippetId);
      setTimeout(() => setCopiedSnippet(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const features = [
    {
      icon: Camera,
      title: "Website Snapshots",
      description: "Capture the complete structure and state of any website, including all HTML elements, styles, and content.",
      details: [
        "Full DOM tree analysis",
        "CSS style extraction",
        "Component hierarchy mapping",
        "Content fingerprinting"
      ]
    },
    {
      icon: Palette,
      title: "AI-Powered Customizations",
      description: "Use natural language to describe website changes, and let our AI implement them automatically.",
      details: [
        "Natural language processing",
        "Context-aware modifications",
        "Style-preserving updates",
        "Real-time preview"
      ]
    },
    {
      icon: BarChart3,
      title: "Usage Analytics",
      description: "Track website engagement, customization performance, and user interactions in real-time.",
      details: [
        "Real-time metrics",
        "Custom event tracking",
        "Performance monitoring",
        "User behavior analysis"
      ]
    },
    {
      icon: Shield,
      title: "Secure & Privacy-First",
      description: "Enterprise-grade security with full data privacy and compliance standards.",
      details: [
        "End-to-end encryption",
        "GDPR compliant",
        "No personal data storage",
        "Secure API endpoints"
      ]
    }
  ];

  const codeExamples = [
    {
      id: "basic-integration",
      title: "Basic Integration",
      description: "Add Kuttl to any website with a single script tag",
      language: "html",
      code: `<!-- Add this script tag to your website -->
<script src="https://app.kuttl.xyz/kuttl.js" 
        data-website="YOUR_WEBSITE_KEY"></script>`
    },
    {
      id: "api-snapshot",
      title: "Take a Snapshot via API",
      description: "Capture website state programmatically",
      language: "javascript",
      code: `fetch('https://api.kuttl.xyz/api/v1/snapshots', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: 'https://example.com',
    include_styles: true,
    include_scripts: false
  })
})`
    },
    {
      id: "ai-customization",
      title: "AI Customization Request",
      description: "Request website changes using natural language",
      language: "javascript",
      code: `fetch('https://api.kuttl.xyz/api/prompt', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: "Make the header blue and increase font size by 20%",
    website_key: "YOUR_WEBSITE_KEY",
    apply_changes: true
  })
})`
    }
  ];

  return (
    <AuthWrapper>
      <DashboardLayout>
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center pb-8 border-b border-gray-200">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              How Kuttl Works
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Transform any website with AI-powered customizations, real-time analytics, 
              and intelligent snapshot technology.
            </p>
          </div>

          {/* What is Kuttl */}
          <section className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg p-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">What is Kuttl?</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <p className="text-gray-700 mb-4">
                  Kuttl is an intelligent website management platform that combines AI-powered 
                  customization with advanced analytics. It allows you to:
                </p>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span>Capture complete website snapshots</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span>Modify websites using natural language</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span>Track user interactions and performance</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span>Deploy changes instantly across your sites</span>
                  </li>
                </ul>
              </div>
              <div className="text-center">
                <div className="bg-white rounded-lg p-6 shadow-lg">
                  <div className="text-3xl font-bold text-blue-600 mb-2">3-Step Process</div>
                  <div className="space-y-4 text-sm">
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold text-xs">1</div>
                      <span>Capture website snapshot</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold text-xs">2</div>
                      <span>Request AI customizations</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold text-xs">3</div>
                      <span>Deploy and track changes</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Core Features */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Core Features</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {features.map((feature) => (
                <div key={feature.title} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <feature.icon className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
                  </div>
                  <p className="text-gray-600 mb-4">{feature.description}</p>
                  <ul className="space-y-2">
                    {feature.details.map((detail) => (
                      <li key={detail} className="flex items-center space-x-2 text-sm text-gray-500">
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          {/* Quick Start */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Start Guide</h2>
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Getting Started in 3 Steps</h3>
                <div className="space-y-6">
                  
                  {/* Step 1 */}
                  <div className="flex space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">1</div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 mb-2">Add a Website</h4>
                      <p className="text-gray-600 mb-3">
                        Go to the <a href="/websites" className="text-blue-600 hover:text-blue-800">Websites</a> section and add your website URL to get a unique tracking key.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">2</div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 mb-2">Install Tracking Script</h4>
                      <p className="text-gray-600 mb-3">
                        Add the Kuttl script to your website using your unique website key:
                      </p>
                      <div className="bg-gray-50 rounded-md p-3 text-sm font-mono">
                        <code>&lt;script src="https://app.kuttl.xyz/kuttl.js" data-website="YOUR_WEBSITE_KEY"&gt;&lt;/script&gt;</code>
                      </div>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">3</div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 mb-2">Start Customizing</h4>
                      <p className="text-gray-600 mb-3">
                        Use the <a href="/customizations" className="text-blue-600 hover:text-blue-800">Customizations</a> panel to make AI-powered changes to your website using natural language.
                      </p>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </section>

          {/* Code Examples */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Code Examples</h2>
            <div className="space-y-6">
              {codeExamples.map((example) => (
                <div key={example.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{example.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{example.description}</p>
                      </div>
                      <button
                        onClick={() => copyToClipboard(example.code, example.id)}
                        className="flex items-center space-x-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                      >
                        {copiedSnippet === example.id ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                        <span className="text-sm">{copiedSnippet === example.id ? 'Copied!' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                  <div className="p-6">
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-x-auto text-sm">
                      <code>{example.code}</code>
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* API Reference */}
          <section>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-8">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center">
                  <Code className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">API Reference</h2>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">Available Endpoints</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center space-x-3">
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-mono">GET</span>
                      <span className="font-mono">/api/v1/websites</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-mono">POST</span>
                      <span className="font-mono">/api/v1/snapshots</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-mono">POST</span>
                      <span className="font-mono">/api/prompt</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-mono">GET</span>
                      <span className="font-mono">/api/v1/usage/stats</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">Authentication</h3>
                  <p className="text-sm text-gray-600">
                    All API requests require authentication using API keys. Get your API key from the{" "}
                    <a href="/api-keys" className="text-blue-600 hover:text-blue-800">API Keys</a> section.
                  </p>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                    <div className="flex items-start space-x-2">
                      <Key className="w-4 h-4 text-yellow-600 mt-0.5" />
                      <div className="text-sm text-yellow-800">
                        <strong>Security:</strong> Never expose your API keys in client-side code. Use them only in secure server environments.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Use Cases */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Common Use Cases</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-3">A/B Testing</h3>
                <p className="text-gray-600 text-sm">
                  Create and deploy multiple website variations to test user engagement and conversion rates.
                </p>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <Palette className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-3">Brand Updates</h3>
                <p className="text-gray-600 text-sm">
                  Instantly update brand colors, fonts, and styling across all your websites with AI assistance.
                </p>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-3">Performance Monitoring</h3>
                <p className="text-gray-600 text-sm">
                  Track website performance, user interactions, and optimization opportunities in real-time.
                </p>
              </div>
            </div>
          </section>

          {/* Support */}
          <section className="bg-blue-50 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Need Help?</h2>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Our documentation covers the most common use cases, but if you need additional support 
              or have specific questions about integrating Kuttl with your workflow, we're here to help.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="mailto:support@kuttl.xyz"
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <span>Contact Support</span>
                <ExternalLink className="ml-2 w-4 h-4" />
              </a>
              <a
                href="/api-keys"
                className="inline-flex items-center px-6 py-3 bg-white text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <span>Get API Keys</span>
                <ArrowRight className="ml-2 w-4 h-4" />
              </a>
            </div>
          </section>

        </div>
      </DashboardLayout>
    </AuthWrapper>
  );
}