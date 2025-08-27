import React, { useState } from "react";
import { Button } from "./ui/button";
import { ErrorHandler } from "@/lib/error-handler";
import { ChevronLeft, ChevronRight, FileText, Plus, Menu } from "lucide-react";
import { useQuiz } from "../contexts/QuizContext";
import { useNavigate } from "react-router-dom";

interface Document {
  id: string;
  name: string;
  content: string;
  type: "folder" | "file";
  children?: Document[];
}

const mockDocuments: Document[] = [
  {
    id: "1",
    name: "remote-note",
    type: "folder",
    content: "",
    children: [
      {
        id: "2",
        name: "copilot-conversations",
        type: "folder",
        content: "",
        children: [],
      },
      {
        id: "3",
        name: "copilot-custom-prompts",
        type: "folder",
        content: "",
        children: [],
      },
      {
        id: "4",
        name: "English",
        type: "folder",
        content: "",
        children: [
          { id: "5", name: "English 2", type: "file", content: "" },
          { id: "6", name: "English 3", type: "file", content: "" },
          {
            id: "7",
            name: "English 4",
            type: "file",
            content:
              "# English 4\n\nThe ancient ruins attest to the skill of the builders. [to provide or serve as clear evidence of]\n\nI can attest to his honesty; he is a very trustworthy person. [to declare that something exists or is true, especially formally or as an official witness]",
          },
        ],
      },
      { id: "8", name: "English 5 (not common)", type: "file", content: "" },
      { id: "9", name: "hello", type: "file", content: "" },
      { id: "10", name: "hey", type: "file", content: "" },
      { id: "11", name: "Prompts", type: "file", content: "" },
    ],
  },
];

interface QuizTool {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
}

const quizTools: QuizTool[] = [
  {
    id: "flashcard",
    title: "Flash Card",
    description: "Create flashcards from selected text",
    icon: "🎴",
    color: "bg-blue-100 border-blue-200 hover:bg-blue-150",
  },
  {
    id: "multiple-choice",
    title: "Multiple Choice",
    description: "Generate multiple choice questions",
    icon: "📝",
    color: "bg-green-100 border-green-200 hover:bg-green-150",
  },
  {
    id: "short-writing",
    title: "Short Writing",
    description: "Create writing prompts and exercises",
    icon: "✍️",
    color: "bg-purple-100 border-purple-200 hover:bg-purple-150",
  },
];

export default function EditorLayout() {
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    mockDocuments[0].children![3].children![2],
  );
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(["1", "4"]),
  );
  const [selectedText, setSelectedText] = useState("");

  const { quizzes } = useQuiz();
  const navigate = useNavigate();

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleQuizToolClick = (toolId: string) => {
    if (!selectedText) {
      ErrorHandler.showWarning(
        "No Text Selected",
        "Please select some text first to generate a quiz!",
      );
      return;
    }

    switch (toolId) {
      case "flashcard":
        navigate("/quiz/flashcard");
        break;
      case "multiple-choice":
        navigate("/quiz/multiple-choice");
        break;
      case "short-writing":
        navigate("/quiz/short-writing");
        break;
    }
  };

  const handleQuizClick = (quiz: any) => {
    switch (quiz.type) {
      case "flashcard":
        navigate("/quiz/flashcard");
        break;
      case "multiple-choice":
        navigate("/quiz/multiple-choice");
        break;
      case "short-writing":
        navigate("/quiz/short-writing");
        break;
    }
  };

  const handleTextSelection = () => {
    const selection = window.getSelection()?.toString();
    if (selection) {
      setSelectedText(selection);
    }
  };

  const renderDocumentTree = (docs: Document[], level = 0): React.ReactNode => {
    return docs.map((doc) => (
      <div key={doc.id} className={`ml-${level * 4}`}>
        <div
          className={`flex items-center py-1 px-2 hover:bg-gray-100 cursor-pointer text-sm ${
            selectedDocument?.id === doc.id
              ? "bg-blue-50 text-blue-700"
              : "text-gray-700"
          }`}
          onClick={() => {
            if (doc.type === "folder") {
              toggleFolder(doc.id);
            } else {
              setSelectedDocument(doc);
            }
          }}
        >
          {doc.type === "folder" ? (
            <>
              <ChevronRight
                className={`w-3 h-3 mr-1 transition-transform ${
                  expandedFolders.has(doc.id) ? "rotate-90" : ""
                }`}
              />
              <span>{doc.name}</span>
            </>
          ) : (
            <>
              <FileText className="w-3 h-3 mr-2 text-gray-500" />
              <span>{doc.name}</span>
            </>
          )}
        </div>
        {doc.type === "folder" &&
          expandedFolders.has(doc.id) &&
          doc.children && (
            <div className="ml-2">
              {renderDocumentTree(doc.children, level + 1)}
            </div>
          )}
      </div>
    ));
  };

  return (
    <div className="h-screen flex bg-white">
      {/* Left Sidebar - Document Navigation */}
      <div
        className={`transition-all duration-300 border-r border-gray-200 bg-gray-50 ${
          leftSidebarOpen ? "w-64" : "w-0 overflow-hidden"
        }`}
      >
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Documents</h2>
            <Button variant="ghost" size="sm">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="p-2 overflow-y-auto max-h-full">
          {renderDocumentTree(mockDocuments)}
        </div>
      </div>

      {/* Toggle Left Sidebar Button */}
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-4 left-2 z-10"
        onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
      >
        {leftSidebarOpen ? (
          <ChevronLeft className="w-4 h-4" />
        ) : (
          <Menu className="w-4 h-4" />
        )}
      </Button>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col">
        {/* Editor Header */}
        <div className="h-14 border-b border-gray-200 flex items-center justify-between px-6">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              {selectedDocument
                ? selectedDocument.name
                : "No document selected"}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm">
              <span className="text-sm">Share</span>
            </Button>
          </div>
        </div>

        {/* Editor Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {selectedDocument ? (
            <div className="max-w-4xl mx-auto">
              <div
                className="prose prose-lg max-w-none"
                style={{
                  fontFamily: "system-ui, -apple-system, sans-serif",
                  lineHeight: "1.6",
                  fontSize: "16px",
                }}
              >
                {selectedDocument.content ? (
                  <div
                    dangerouslySetInnerHTML={{
                      __html: selectedDocument.content
                        .replace(/\n/g, "<br/>")
                        .replace(
                          /\[([^\]]+)\]/g,
                          '<span style="color: #8b5cf6; background: #f3f4f6; padding: 2px 4px; border-radius: 4px; font-size: 14px;">$1</span>',
                        ),
                    }}
                    onMouseUp={handleTextSelection}
                  />
                ) : (
                  <p className="text-gray-500">
                    This document is empty. Start writing...
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">
                Select a document to start editing
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar - Quiz Tools */}
      <div
        className={`transition-all duration-300 border-l border-gray-200 bg-white ${
          rightSidebarOpen ? "w-80" : "w-0 overflow-hidden"
        }`}
      >
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Quiz Tools</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="text-sm text-gray-600 mb-4">
            {selectedText ? (
              <div className="p-2 bg-blue-50 border border-blue-200 rounded">
                <div className="font-medium text-blue-800 mb-1">
                  Selected text:
                </div>
                <div className="text-blue-700 text-xs">
                  "{selectedText.substring(0, 50)}
                  {selectedText.length > 50 ? "..." : '"'}
                </div>
              </div>
            ) : (
              "Select text in the editor to generate quizzes"
            )}
          </div>

          {quizTools.map((tool) => (
            <div
              key={tool.id}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${tool.color}`}
              onClick={() => handleQuizToolClick(tool.id)}
            >
              <div className="flex items-start space-x-3">
                <span className="text-2xl">{tool.icon}</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 mb-1">
                    {tool.title}
                  </h3>
                  <p className="text-sm text-gray-600">{tool.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-gray-200">
          <h3 className="font-semibold text-gray-800 mb-3">Recent Quizzes</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {quizzes.slice(0, 5).map((quiz) => (
              <div
                key={quiz.id}
                className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleQuizClick(quiz)}
              >
                <div className="text-sm font-medium text-gray-800">
                  {quiz.title}
                </div>
                <div className="text-xs text-gray-500">
                  {quiz.data.length}{" "}
                  {quiz.type === "flashcard"
                    ? "flashcards"
                    : quiz.type === "multiple-choice"
                      ? "questions"
                      : "tasks"}
                </div>
              </div>
            ))}
            {quizzes.length === 0 && (
              <div className="text-sm text-gray-500 text-center py-4">
                No quizzes yet. Select text and click a quiz tool to get
                started!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toggle Right Sidebar Button */}
      {!rightSidebarOpen && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-4 right-2 z-10"
          onClick={() => setRightSidebarOpen(true)}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}
