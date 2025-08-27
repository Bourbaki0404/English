import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Send,
  Plus,
  RotateCcw,
  MessageSquare,
  Upload,
  Sparkles,
  Bot,
  User,
  Loader2,
  Copy,
  Undo2,
  Check,
} from "lucide-react";
import { Button } from "./ui/button";
import { AppSettings } from "./SettingsModal";
import { getLLMService } from "../services/llmService";
import { ErrorHandler } from "@/lib/error-handler";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

interface PromptTemplate {
  id: string;
  name: string;
  content: string;
  createdAt: Date;
}

interface AIComposerProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
}

export default function AIComposer({
  isOpen,
  onClose,
  settings,
}: AIComposerProps) {
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(
    null,
  );
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateContent, setTemplateContent] = useState("");
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [messageViewMode, setMessageViewMode] = useState<{
    [key: string]: "formatted" | "raw";
  }>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem("ai-composer-history");
    const savedTemplates = localStorage.getItem("ai-composer-templates");

    if (savedHistory) {
      try {
        const parsedHistory = JSON.parse(savedHistory).map((session: any) => ({
          ...session,
          createdAt: new Date(session.createdAt),
          updatedAt: new Date(session.updatedAt),
          messages: session.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          })),
        }));
        setChatHistory(parsedHistory);
      } catch (error) {
        console.error("Error loading chat history:", error);
      }
    }

    if (savedTemplates) {
      try {
        const parsedTemplates = JSON.parse(savedTemplates).map(
          (template: any) => ({
            ...template,
            createdAt: new Date(template.createdAt),
          }),
        );
        setPromptTemplates(parsedTemplates);
      } catch (error) {
        console.error("Error loading prompt templates:", error);
      }
    }
  }, []);

  // Save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem("ai-composer-history", JSON.stringify(chatHistory));
  }, [chatHistory]);

  useEffect(() => {
    localStorage.setItem(
      "ai-composer-templates",
      JSON.stringify(promptTemplates),
    );
  }, [promptTemplates]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentSession?.messages]);

  // Focus input when component opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const generateSessionTitle = async (
    firstMessage: string,
  ): Promise<string> => {
    try {
      const llmService = getLLMService(settings);
      const titlePrompt = `Generate a short, descriptive title (max 4-5 words) for a chat conversation that starts with this message: "${firstMessage.slice(0, 100)}..."

Return only the title, no quotes or additional text.`;

      const title = await llmService.chatWithAI(titlePrompt);
      return title.trim().replace(/["']/g, "").slice(0, 50);
    } catch (error) {
      console.error("Error generating title:", error);
      return (
        firstMessage.slice(0, 30) + (firstMessage.length > 30 ? "..." : "")
      );
    }
  };

  const startNewChat = () => {
    setCurrentSession(null);
    setInputValue("");
    setShowHistory(false);
    setShowTemplates(false);
  };

  const loadChatSession = (session: ChatSession) => {
    setCurrentSession(session);
    setShowHistory(false);
    setShowTemplates(false);
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    if (!settings.llm.apiKey) {
      ErrorHandler.showWarning(
        "API Key Required",
        "Please configure your API key in settings first!",
      );
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    let session = currentSession;
    if (!session) {
      // Create new session
      session = {
        id: Date.now().toString(),
        title: "New Chat",
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    const updatedSession = {
      ...session,
      messages: [...session.messages, userMessage],
      updatedAt: new Date(),
    };

    setCurrentSession(updatedSession);
    setInputValue("");
    setIsLoading(true);

    try {
      const llmService = getLLMService(settings);
      const response = await llmService.chatWithAI(inputValue.trim());

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response,
        timestamp: new Date(),
      };

      const finalSession = {
        ...updatedSession,
        messages: [...updatedSession.messages, assistantMessage],
        updatedAt: new Date(),
      };

      // Generate title for new sessions
      if (
        finalSession.title === "New Chat" &&
        finalSession.messages.length === 2
      ) {
        try {
          const title = await generateSessionTitle(userMessage.content);
          finalSession.title = title;
        } catch (error) {
          console.error("Error generating title:", error);
        }
      }

      setCurrentSession(finalSession);

      // Update history
      setChatHistory((prev) => {
        const existing = prev.find((s) => s.id === finalSession.id);
        if (existing) {
          return prev.map((s) => (s.id === finalSession.id ? finalSession : s));
        } else {
          return [finalSession, ...prev];
        }
      });
    } catch (error) {
      ErrorHandler.handle(error, "AI Chat");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const useTemplate = (template: PromptTemplate) => {
    setInputValue(template.content);
    setShowTemplates(false);
    inputRef.current?.focus();
  };

  const createTemplate = () => {
    if (!templateName.trim() || !templateContent.trim()) return;

    const newTemplate: PromptTemplate = {
      id: Date.now().toString(),
      name: templateName.trim(),
      content: templateContent.trim(),
      createdAt: new Date(),
    };

    setPromptTemplates([newTemplate, ...promptTemplates]);
    setTemplateName("");
    setTemplateContent("");
    setIsCreatingTemplate(false);
  };

  const deleteTemplate = (id: string) => {
    setPromptTemplates(promptTemplates.filter((t) => t.id !== id));
  };


  const deleteChatSession = (sessionId: string) => {
    setChatHistory(chatHistory.filter((s) => s.id !== sessionId));
    if (currentSession?.id === sessionId) {
      setCurrentSession(null);
    }
  };

  const handleClose = () => {
    onClose();
  };

  const toggleMessageView = (messageId: string) => {
    setMessageViewMode((prev) => ({
      ...prev,
      [messageId]: prev[messageId] === "raw" ? "formatted" : "raw",
    }));
  };

  const copyMessage = async (messageContent: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(messageContent);
      setCopiedMessageId(messageId);
      // 让用户手动看到复制状态，不自动清除
    } catch (error) {
      console.error("Failed to copy message:", error);
    }
  };

  const recallMessage = (messageId: string) => {
    if (!currentSession) return;

    const messageIndex = currentSession.messages.findIndex(
      (msg) => msg.id === messageId,
    );
    if (messageIndex === -1) return;

    // Remove the message and all messages after it
    const updatedMessages = currentSession.messages.slice(0, messageIndex);
    const updatedSession = {
      ...currentSession,
      messages: updatedMessages,
      updatedAt: new Date(),
    };

    setCurrentSession(updatedSession);

    // Update in chat history
    setChatHistory((prev) =>
      prev.map((session) =>
        session.id === currentSession.id ? updatedSession : session,
      ),
    );
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Background overlay */}
      <div
        className="absolute inset-0 bg-black bg-opacity-30 animate-in fade-in duration-300"
        style={{
          zIndex: 999,
          maxWidth: "100%", // Stay within parent container
          maxHeight: "100%" // Stay within parent container
        }}
        onClick={handleClose}
      />

      {/* Right drawer contained within app bounds */}
      <div
        className="absolute top-0 right-0 bottom-0 w-5/6 bg-white flex flex-col shadow-2xl animate-in slide-in-from-right duration-300"
        style={{
          zIndex: 1000,
          maxWidth: "calc(100% - 20px)", // Ensure it stays within bounds
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h1 className="text-lg font-semibold text-gray-900">AI Composer</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={startNewChat}
              className="text-sm"
              title="New Chat"
            >
              <Plus className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowHistory(!showHistory);
                setShowTemplates(false);
              }}
              className="text-sm"
              title="Chat History"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowTemplates(!showTemplates);
                setShowHistory(false);
              }}
              className="text-sm"
              title="Prompt Templates"
            >
              <MessageSquare className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Chat History Drawer */}
        {showHistory && (
          <div className="absolute top-16 left-0 right-0 bg-white border-b border-gray-200 z-10 max-h-64 overflow-y-auto">
            <div className="p-4">
              <h3 className="font-medium text-gray-900 mb-3">Chat History</h3>
              {chatHistory.length === 0 ? (
                <p className="text-gray-500 text-sm">No chat history yet</p>
              ) : (
                <div className="space-y-2">
                  {chatHistory.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer"
                      onClick={() => loadChatSession(session)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900 truncate">
                          {session.title}
                        </div>
                        <div className="text-xs text-gray-500">
                          {session.messages.length} messages •{" "}
                          {session.updatedAt.toLocaleDateString()}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteChatSession(session.id);
                        }}
                        className="ml-2 p-1"
                      >
                        <X className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Prompt Templates Drawer - Obsidian Style */}
        {showTemplates && (
          <div className="absolute top-16 left-0 right-0 bg-white border-b border-gray-200 z-10 max-h-[70vh] overflow-y-auto shadow-lg">
            <div className="p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Prompt Templates
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreatingTemplate(true)}
                  className="text-sm px-3 py-1.5 h-auto"
                >
                  Add Prompt Template
                </Button>
              </div>

              {/* How to use section - more compact */}
              <div className="mb-4 p-3 bg-gray-50 border-l-4 border-blue-500 rounded-r-md">
                <p className="text-sm text-gray-600 leading-relaxed">
                  <span className="font-medium text-gray-800">How to use:</span> Create templates with reusable content that you can quickly insert into your chat. Type{" "}
                  <code className="mx-1 px-1 py-0.5 bg-gray-200 rounded text-xs font-mono">
                    /template-name
                  </code>{" "}
                  in the chat input to trigger template insertion. You can also drag and select text in the chat input to reveal a "Create template" button for quick template creation.
                </p>
              </div>

              {/* Create template form */}
              {isCreatingTemplate && (
                <div className="mb-4 p-4 border border-gray-200 rounded-lg bg-white shadow-sm">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        placeholder="Template name..."
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        className="w-full p-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Content
                      </label>
                      <textarea
                        placeholder="Template content..."
                        value={templateContent}
                        onChange={(e) => setTemplateContent(e.target.value)}
                        className="w-full p-2 text-sm border border-gray-300 rounded-md h-20 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div className="flex space-x-2 mt-3">
                    <Button size="sm" onClick={createTemplate} className="px-3 py-1.5 h-auto text-xs">
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsCreatingTemplate(false);
                        setTemplateName("");
                        setTemplateContent("");
                      }}
                      className="px-3 py-1.5 h-auto text-xs"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Saved Templates section */}
              <div className="mb-3">
                <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <span>Saved Templates</span>
                  {promptTemplates.length > 0 && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {promptTemplates.length}
                    </span>
                  )}
                </h3>
              </div>

              {/* Templates List */}
              <div className="space-y-2">
                {promptTemplates.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400 mb-2">
                      <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-gray-500 text-sm">No templates found</p>
                    <p className="text-gray-400 text-xs mt-1">Click "Add Prompt Template" to create your first template</p>
                  </div>
                ) : (
                  promptTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="group p-3 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer bg-white"
                      onClick={() => useTemplate(template)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm text-gray-900 truncate">
                              {template.name}
                            </h4>
                            <span className="text-xs text-gray-400">
                              /{template.name.toLowerCase().replace(/\s+/g, '-')}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                            {template.content}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-gray-400">
                              {template.createdAt.toLocaleDateString()}
                            </span>
                            <div className="flex-1"></div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteTemplate(template.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 h-6 w-6 text-gray-400 hover:text-red-500 transition-all"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!currentSession || currentSession.messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Bot className="w-16 h-16 text-gray-300 mb-4" />
              <h2 className="text-xl font-semibold text-gray-700 mb-2">
                Welcome to AI Composer
              </h2>
              <p className="text-gray-500 mb-6 max-w-sm">
                Start a conversation with AI to generate content, get help, or
                brainstorm ideas.
              </p>
              <div className="space-y-2 text-sm text-gray-400">
                <p>💡 Use prompt templates to get started quickly</p>
                <p>💾 Your chat history is automatically saved</p>
                <p>📤 Export conversations as text files</p>
              </div>
            </div>
          ) : (
            currentSession.messages.map((message) => {
              const viewMode = messageViewMode[message.id] || "formatted";
              const isRawMode = viewMode === "raw";

              return (
                <div
                  key={message.id}
                  className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm"
                >
                  {/* Message Window Header */}
                  <div
                    className={`flex items-center justify-between px-4 py-2 border-b border-gray-200 ${
                      message.role === "user" ? "bg-blue-50" : "bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          message.role === "user"
                            ? "bg-blue-500"
                            : "bg-purple-500"
                        }`}
                      />
                      <span className="text-sm font-medium text-gray-700">
                        {message.role === "user" ? "You" : "AI Assistant"}
                      </span>
                      <span className="text-xs text-gray-500">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleMessageView(message.id)}
                        className="h-7 w-7 p-0 text-gray-500 hover:text-gray-700"
                        title={isRawMode ? "Show formatted" : "Show raw text"}
                      >
                        {isRawMode ? (
                          <span className="text-xs font-bold">F</span>
                        ) : (
                          <span className="text-xs font-bold">R</span>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyMessage(message.content, message.id)}
                        className="h-7 w-7 p-0 text-gray-500 hover:text-gray-700"
                        title="Copy message"
                      >
                        {copiedMessageId === message.id ? (
                          <Check className="w-3 h-3 text-green-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => recallMessage(message.id)}
                        className="h-7 w-7 p-0 text-gray-500 hover:text-gray-700"
                        title="Recall message"
                      >
                        <Undo2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Message Content */}
                  <div className="p-4">
                    {isRawMode ? (
                      <pre className="whitespace-pre-wrap text-sm font-mono text-gray-800 bg-gray-50 p-3 rounded border">
                        {message.content}
                      </pre>
                    ) : (
                      <div className="prose prose-sm max-w-none">
                        <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
                          {message.content}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4 bg-white">
          <div className="flex items-end space-x-3">
            <div className="flex-1">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
                className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                rows={3}
                disabled={isLoading}
              />
            </div>
            <Button
              onClick={sendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-3"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
