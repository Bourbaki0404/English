import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Send,
  Plus,
  RotateCcw,
  MessageSquare,
  Download,
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
      alert("Please configure your API key in settings first!");
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
      console.error("Error sending message:", error);
      alert(
        `Failed to send message: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
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

  const exportChatHistory = () => {
    if (!currentSession) return;

    const chatText = currentSession.messages
      .map(
        (msg) =>
          `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`,
      )
      .join("\n\n");

    const blob = new Blob([chatText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentSession.title}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const deleteChatSession = (sessionId: string) => {
    setChatHistory(chatHistory.filter((s) => s.id !== sessionId));
    if (currentSession?.id === sessionId) {
      setCurrentSession(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 bg-white z-50 flex flex-col">
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
            onClick={() => setShowHistory(!showHistory)}
            className="text-sm"
            title="Chat History"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTemplates(!showTemplates)}
            className="text-sm"
            title="Prompt Templates"
          >
            <MessageSquare className="w-4 h-4" />
          </Button>
          {currentSession && (
            <Button
              variant="ghost"
              size="sm"
              onClick={exportChatHistory}
              className="text-sm"
              title="Export Chat"
            >
              <Download className="w-4 h-4" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>
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

      {/* Prompt Templates Drawer */}
      {showTemplates && (
        <div className="absolute top-16 left-0 right-0 bg-white border-b border-gray-200 z-10 max-h-64 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900">Prompt Templates</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCreatingTemplate(true)}
              >
                Add Template
              </Button>
            </div>

            {isCreatingTemplate && (
              <div className="mb-4 p-3 border border-gray-200 rounded-lg bg-gray-50">
                <input
                  type="text"
                  placeholder="Template name..."
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full mb-2 p-2 text-sm border border-gray-300 rounded"
                />
                <textarea
                  placeholder="Template content..."
                  value={templateContent}
                  onChange={(e) => setTemplateContent(e.target.value)}
                  className="w-full mb-2 p-2 text-sm border border-gray-300 rounded h-20 resize-none"
                />
                <div className="flex space-x-2">
                  <Button size="sm" onClick={createTemplate}>
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
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {promptTemplates.length === 0 ? (
              <p className="text-gray-500 text-sm">No templates yet</p>
            ) : (
              <div className="space-y-2">
                {promptTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-start justify-between p-2 rounded-lg bg-gray-50 hover:bg-gray-100"
                  >
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => useTemplate(template)}
                    >
                      <div className="font-medium text-sm text-gray-900">
                        {template.name}
                      </div>
                      <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                        {template.content}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteTemplate(template.id)}
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
          currentSession.messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start space-x-3 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-purple-600" />
                </div>
              )}

              <div
                className={`max-w-[80%] p-3 rounded-lg ${
                  message.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-900"
                }`}
              >
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {message.content}
                </div>
                <div
                  className={`text-xs mt-2 ${
                    message.role === "user" ? "text-blue-200" : "text-gray-500"
                  }`}
                >
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>

              {message.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
              )}
            </div>
          ))
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
  );
}
