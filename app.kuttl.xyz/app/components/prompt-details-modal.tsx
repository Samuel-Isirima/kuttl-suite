import { useState } from "react";
import { X, Copy, CheckCircle, AlertCircle, Clock, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface PromptDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  call: {
    id: string;
    prompt_text?: string;
    prompt_response?: string;
    ai_provider?: string;
    ai_model?: string;
    patches_count: number;
    success_status?: string;
    response_time_ms: number;
    timestamp: string;
    domain?: string;
    browser_fingerprint?: string;
  } | null;
}

export function PromptDetailsModal({ isOpen, onClose, call }: PromptDetailsModalProps) {
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedResponse, setCopiedResponse] = useState(false);

  if (!isOpen || !call) return null;

  const copyToClipboard = async (text: string, setCopied: (value: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getStatusIcon = () => {
    switch (call.success_status) {
      case 'ok':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusColor = () => {
    switch (call.success_status) {
      case 'ok':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'error':
        return 'text-red-700 bg-red-50 border-red-200';
      default:
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 transition-opacity"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden bg-white rounded-lg -xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <Zap className="w-5 h-5 text-blue-500" />
              <h2 className="text-xl font-semibold text-gray-900">Prompt Details</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
            <div className="p-6 space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500">Provider</div>
                  <div className="font-medium capitalize">{call.ai_provider || 'N/A'}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500">Model</div>
                  <div className="font-medium">{call.ai_model || 'N/A'}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500">Patches</div>
                  <div className="font-medium">{call.patches_count}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500">Response Time</div>
                  <div className="font-medium">{call.response_time_ms}ms</div>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getStatusIcon()}
                  <span className={cn("inline-flex px-3 py-1 text-sm font-medium rounded-full border", getStatusColor())}>
                    {call.success_status || 'Unknown'}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  {formatTimestamp(call.timestamp)}
                </div>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">Domain</div>
                  <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                    {call.domain || 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">Browser Session</div>
                  <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded font-mono">
                    {call.browser_fingerprint || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Prompt Text */}
              {call.prompt_text && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium text-gray-900">User Prompt</h3>
                    <button
                      onClick={() => copyToClipboard(call.prompt_text!, setCopiedPrompt)}
                      className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
                    >
                      {copiedPrompt ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                      <span>{copiedPrompt ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <pre className="text-sm text-blue-800 whitespace-pre-wrap font-mono">
                      {call.prompt_text}
                    </pre>
                  </div>
                </div>
              )}

              {/* AI Response */}
              {call.prompt_response && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium text-gray-900">AI Response</h3>
                    <button
                      onClick={() => copyToClipboard(call.prompt_response!, setCopiedResponse)}
                      className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
                    >
                      {copiedResponse ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                      <span>{copiedResponse ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono max-h-96 overflow-y-auto">
                      {call.prompt_response}
                    </pre>
                  </div>
                </div>
              )}

              {/* No prompt data message */}
              {!call.prompt_text && !call.prompt_response && (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Prompt Data Available</h3>
                  <p className="text-gray-500">
                    This API call doesn't contain prompt information. This might be a non-AI endpoint call.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-3 bg-gray-50">
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}