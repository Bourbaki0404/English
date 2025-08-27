import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  FileText,
  Plus,
  Menu,
  X,
  Settings,
  Loader2,
  Search,
  Bookmark,
  MoreVertical,
  Home,
  Layers,
  PenTool,
  Grid,
} from "lucide-react";
import { Button } from "./ui/button";
import SettingsModal, { AppSettings } from "./SettingsModal";
import { ErrorHandler } from "@/lib/error-handler";
import AIComposer from "./AIComposer";
import { getLLMService } from "../services/llmService";
import { useQuiz } from "../contexts/QuizContext";

interface Document {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
}

const initialDocuments: Document[] = [
  {
    id: "1",
    title: "English 2",
    content: "Welcome to English 2! Start writing your notes here...",
    createdAt: new Date("2024-01-15"),
  },
  {
    id: "2",
    title: "English 3",
    content: "Welcome to English 3! This is your study space.",
    createdAt: new Date("2024-01-16"),
  },
  {
    id: "3",
    title: "English 4",
    content: `Companies often **hedge** against currency fluctuations to protect their profits [hedge is an investment that is made to reduce the risk of adverse price movements in an asset]

Investors often **hedge** their bets by buying different types of assets [To reduce or protect against the risk of loss, especially in finance.]

A **hedge** fund is a private, unregistered investment fund. Hedge funds pool money from investors and invest in securities or other types of assets with the goal of getting positive returns.

He **hedged** when asked about his future plans. [avoid giving a direct answer]

Her **dogged** efforts to learn the piano finally paid off when she performed at the concert. [is persistent, determined, and doesn't give up easily, even when facing difficulties]

He was caught **doctoring** the financial records to hide his mistakes [To alter or falsify something (often secretly or dishonestly) to deceive others]

She **doctored** the old chair to make it usable again. [repair]

It's illegal to **falsify** your resume by lying about your qualifications [alter or create something false in order to deceive others, often to hide the truth or gain an unfair advantage]

A company conducting **due diligence** before acquiring another business to check its finances and legal liabilities. [careful, thorough, and systematic effort or research done to gather information, assess risks, or verify facts before making a decision]

The company took on significant **liability** after the accident, as they had to pay for damages. [Legal or financial responsibility for something, especially for`,
    createdAt: new Date("2024-01-17"),
  },
];

export default function MobileEditorLayout() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>("3");
  const [selectedText, setSelectedText] = useState("");
  const [selectedDisplayText, setSelectedDisplayText] = useState("");
  const [isTextSelected, setIsTextSelected] = useState(false);
  const [selectedLineIndices, setSelectedLineIndices] = useState<number[]>([]);
  // 简单的抽屉状态管理
  const [documentsDrawerOpen, setDocumentsDrawerOpen] = useState(false);
  const [quizDrawerOpen, setQuizDrawerOpen] = useState(false);
  const [searchDrawerOpen, setSearchDrawerOpen] = useState(false);
  const [moreDrawerOpen, setMoreDrawerOpen] = useState(false);
  const [aiComposerOpen, setAiComposerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    { doc: Document; matches: string[]; lineNumbers: number[] }[]
  >([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [generatingType, setGeneratingType] = useState<string>("");
  const [settings, setSettings] = useState<AppSettings>({
    general: {
      languageLevel: "cet4",
    },
    llm: {
      apiKey: "AIzaSyCNDJgpRcdDiEVSNomjIMTW1yNWjX7K6P0",
      provider: "gemini",
      model: "gemini-2.0-flash",
    },
  });
  const { createQuiz, getQuizzesByDocument, getAllQuizzes } = useQuiz();
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState("");
  const [titleCollisionWarning, setTitleCollisionWarning] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [showModeToast, setShowModeToast] = useState(false);
  const [modeToastMessage, setModeToastMessage] = useState("");

  const selectedDocument = documents.find(
    (doc) => doc.id === selectedDocumentId,
  );
  const documentQuizzes = selectedDocument
    ? getQuizzesByDocument(selectedDocument.id)
    : [];
  const allQuizzes = getAllQuizzes();

  // Function to get display name for document
  const getDocumentDisplayName = (doc: Document): string => {
    return doc.title;
  };

  // Check if title already exists in other documents
  const isTitleDuplicate = (title: string, excludeId?: string): boolean => {
    return documents.some(
      (doc) =>
        doc.title.toLowerCase() === title.toLowerCase() && doc.id !== excludeId,
    );
  };

  // Handle title input change with real-time collision detection
  const handleTitleChange = (newTitle: string) => {
    setTempTitle(newTitle);
    // Check for collision in real-time while typing
    if (newTitle.trim() && selectedDocument) {
      const hasCollision = isTitleDuplicate(
        newTitle.trim(),
        selectedDocument.id,
      );
      setTitleCollisionWarning(hasCollision);
    } else {
      setTitleCollisionWarning(false);
    }
  };

  // Start editing title
  const startEditingTitle = () => {
    if (selectedDocument) {
      setTempTitle(selectedDocument.title);
      setIsEditingTitle(true);
      setTitleCollisionWarning(false);
    }
  };

  // Save title changes
  const saveTitleChanges = () => {
    if (!selectedDocument || !tempTitle.trim()) {
      setIsEditingTitle(false);
      setTitleCollisionWarning(false);
      return;
    }

    const trimmedTitle = tempTitle.trim();

    // Check for duplicates - don't save if collision exists
    if (isTitleDuplicate(trimmedTitle, selectedDocument.id)) {
      // Keep editing mode active, collision warning already shown
      return;
    }

    // Update document title
    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === selectedDocument.id ? { ...doc, title: trimmedTitle } : doc,
      ),
    );

    setIsEditingTitle(false);
    setTempTitle("");
    setTitleCollisionWarning(false);
  };

  // Cancel title editing
  const cancelTitleEditing = () => {
    setIsEditingTitle(false);
    setTempTitle("");
    setTitleCollisionWarning(false);
  };

  const handleQuizToolClick = async (toolId: string) => {
    if (!selectedText) {
      ErrorHandler.showWarning(
        "No Text Selected",
        "Please select some text first to generate a quiz!",
      );
      return;
    }

    if (!settings.llm.apiKey) {
      ErrorHandler.showWarning(
        "API Key Required",
        "Please configure your LLM API key in settings first!",
      );
      setSettingsOpen(true);
      return;
    }

    setIsGeneratingQuiz(true);
    setGeneratingType(toolId);
    closeQuizDrawer();

    try {
      const llmService = getLLMService(settings);

      switch (toolId) {
        case "flashcard": {
          const flashcards = await llmService.generateFlashCards(selectedText);
          createQuiz(
            "flashcard",
            `Flashcards - ${getDocumentDisplayName(selectedDocument!)}`,
            selectedText,
            flashcards,
            selectedDocument!.id,
          );
          navigate("/quiz/flashcard");
          break;
        }
        case "multiple-choice": {
          const questions =
            await llmService.generateMultipleChoice(selectedText);
          createQuiz(
            "multiple-choice",
            `Multiple Choice - ${getDocumentDisplayName(selectedDocument!)}`,
            selectedText,
            questions,
            selectedDocument!.id,
          );
          navigate("/quiz/multiple-choice");
          break;
        }
        case "short-writing": {
          const tasks = await llmService.generateWritingTasks(selectedText);
          createQuiz(
            "short-writing",
            `Writing Tasks - ${getDocumentDisplayName(selectedDocument!)}`,
            selectedText,
            tasks,
            selectedDocument!.id,
          );
          navigate("/quiz/short-writing");
          break;
        }
      }
    } catch (error) {
      ErrorHandler.handle(error, "Quiz Generation");
    } finally {
      setIsGeneratingQuiz(false);
      setGeneratingType("");
    }
  };

  // Helper function to find original markdown text from rendered selection
  const findOriginalTextFromSelection = (
    selectedRenderedText: string,
    originalContent: string,
  ): string => {
    if (!selectedRenderedText.trim()) return selectedRenderedText;

    // Clean the selected text (remove extra whitespace, normalize)
    const cleanSelected = selectedRenderedText.trim().replace(/\s+/g, " ");

    // Split original content into lines and find the best match
    const lines = originalContent.split("\n");
    let bestMatch = selectedRenderedText;
    let bestMatchLength = 0;

    for (const line of lines) {
      // Create a clean version of the line for comparison (remove markdown formatting)
      const cleanLine = line
        .replace(/^#+\s+/, "") // Remove headers
        .replace(/\*\*(.*?)\*\*/g, "$1") // Remove bold
        .replace(/\*(.*?)\*/g, "$1") // Remove italic
        .replace(/`(.*?)`/g, "$1") // Remove inline code
        .replace(/\[(.*?)\]\(.*?\)/g, "$1") // Remove links, keep text
        .trim();

      // Check if this line contains our selected text
      if (cleanLine.includes(cleanSelected)) {
        // If the clean line exactly matches our selection, return the original line
        if (cleanLine.trim() === cleanSelected.trim()) {
          return line.trim();
        }

        // For partial matches, try to find the exact boundaries
        const cleanLineNormalized = cleanLine.replace(/\s+/g, " ");
        const selectedIndex = cleanLineNormalized.indexOf(cleanSelected);

        if (selectedIndex !== -1) {
          // Calculate positions in the original line
          // We need to account for markdown formatting that was removed
          let originalStartPos = 0;
          let cleanCharCount = 0;

          // Find the start position in the original line
          for (
            let i = 0;
            i < line.length && cleanCharCount < selectedIndex;
            i++
          ) {
            const char = line[i];
            // Skip markdown characters but count regular characters
            if (char.match(/[a-zA-Z0-9\s.,!?'"]/)) {
              cleanCharCount++;
            }
            originalStartPos = i + 1;
          }

          // Find the end position
          let originalEndPos = originalStartPos;
          let selectedCharCount = 0;

          for (
            let i = originalStartPos;
            i < line.length && selectedCharCount < cleanSelected.length;
            i++
          ) {
            const char = line[i];
            if (char.match(/[a-zA-Z0-9\s.,!?'"]/)) {
              selectedCharCount++;
            }
            originalEndPos = i + 1;
          }

          // Extract the segment with markdown formatting preserved
          const candidate = line
            .substring(Math.max(0, originalStartPos), originalEndPos)
            .trim();

          // Check if this candidate is better than our current best match
          if (candidate.length > bestMatchLength) {
            bestMatch = candidate;
            bestMatchLength = candidate.length;
          }
        }
      }
    }

    return bestMatch;
  };

  const findSelectedLineIndices = (selection: Selection, originalText: string): number[] => {
    if (!showPreview || !previewContent || !selection.rangeCount) return [];

    try {
      const range = selection.getRangeAt(0);
      const selectedLines: number[] = [];

      // Find which content lines contain the selected text
      const lines = (showPreview ? previewContent : selectedDocument?.content || '').split('\n');
      const cleanSelectedText = originalText.trim().toLowerCase();

      lines.forEach((line, index) => {
        const cleanLine = line
          .replace(/^#+\s+/, '') // Remove headers
          .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
          .replace(/\*(.*?)\*/g, '$1') // Remove italic
          .replace(/`(.*?)`/g, '$1') // Remove inline code
          .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links, keep text
          .replace(/==(.*?)==/g, '$1') // Remove highlights
          .trim().toLowerCase();

        if (cleanLine.includes(cleanSelectedText) || cleanSelectedText.includes(cleanLine)) {
          selectedLines.push(index);
        }
      });

      return selectedLines;
    } catch (error) {
      console.warn('Error finding selected line indices:', error);
      return [];
    }
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString()) {
      const selectedRenderedText = selection.toString();

      // Track selection for temporary formatting removal in preview mode
      setIsTextSelected(true);

      // Always store the rendered text for display
      setSelectedDisplayText(selectedRenderedText);

      // Debug: log the selection details
      console.log("=== Text Selection Debug ===");
      console.log("Selected rendered text:", selectedRenderedText);
      console.log("Show preview mode:", showPreview);
      console.log("Has preview content:", !!previewContent);
      console.log(
        "Selected document content snippet:",
        selectedDocument?.content.substring(0, 200),
      );

      // If we're in preview mode, try to map back to original markdown
      if (showPreview && previewContent) {
        const originalText = findOriginalTextFromSelection(
          selectedRenderedText,
          previewContent,
        );
        console.log("Mapped to original text:", originalText);
        setSelectedText(originalText);

        // Find which lines should show unformatted text
        const lineIndices = findSelectedLineIndices(selection, originalText);
        setSelectedLineIndices(lineIndices);
      } else {
        // Normal mode - try to map from the current document content
        if (selectedDocument) {
          const originalText = findOriginalTextFromSelection(
            selectedRenderedText,
            selectedDocument.content,
          );
          console.log("Mapped to original text (normal mode):", originalText);
          setSelectedText(originalText);
        } else {
          setSelectedText(selectedRenderedText);
        }
      }
    } else {
      // Clear selection and restore formatting
      setIsTextSelected(false);
      setSelectedLineIndices([]);
      setSelectedText("");
      setSelectedDisplayText("");
    }
  };

  const handleAddDocument = () => {
    // If title editing with collision, revert title first
    if (isEditingTitle && titleCollisionWarning) {
      cancelTitleEditing();
    }

    const newId = (
      Math.max(...documents.map((d) => parseInt(d.id))) + 1
    ).toString();

    // Generate unique title
    let baseTitle = "New Document";
    let titleSuffix = "";
    let counter = 1;

    while (isTitleDuplicate(baseTitle + titleSuffix)) {
      titleSuffix = ` ${counter}`;
      counter++;
    }

    const uniqueTitle = baseTitle + titleSuffix;

    const newDocument: Document = {
      id: newId,
      title: uniqueTitle,
      content: "Start writing your content here...",
      createdAt: new Date(),
    };

    setDocuments((prev) => [...prev, newDocument]);
    setSelectedDocumentId(newId);
  };

  const handleDeleteDocument = (docId: string) => {
    if (documents.length <= 1) {
      ErrorHandler.showWarning(
        "Cannot Delete Document",
        "You must have at least one document.",
      );
      return;
    }

    if (confirm("Are you sure you want to delete this document?")) {
      setDocuments((prev) => prev.filter((doc) => doc.id !== docId));

      if (selectedDocumentId === docId) {
        const remainingDocs = documents.filter((doc) => doc.id !== docId);
        setSelectedDocumentId(remainingDocs[0]?.id || "");
      }
    }
  };

  const handleDocumentSelect = (docId: string) => {
    // If title editing with collision, revert title first
    if (isEditingTitle && titleCollisionWarning) {
      cancelTitleEditing();
    }
    setSelectedDocumentId(docId);
    setSelectedText("");
    setSelectedDisplayText("");
    closeDocumentsDrawer();
    closeSearchDrawer();
  };

  const openDocumentsDrawer = () => {
    setDocumentsDrawerOpen(true);
  };

  const closeDocumentsDrawer = () => {
    setDocumentsDrawerOpen(false);
  };

  const openSearchDrawer = () => {
    setSearchDrawerOpen(true);
  };

  const closeSearchDrawer = () => {
    setSearchDrawerOpen(false);
  };

  const openQuizDrawer = () => {
    setQuizDrawerOpen(true);
  };

  const closeQuizDrawer = () => {
    setQuizDrawerOpen(false);
  };

  const openMoreDrawer = () => {
    setMoreDrawerOpen(true);
  };

  const closeMoreDrawer = () => {
    setMoreDrawerOpen(false);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const results: {
      doc: Document;
      matches: string[];
      lineNumbers: number[];
    }[] = [];
    documents.forEach((doc) => {
      const content = doc.content.toLowerCase();
      const searchTerm = query.toLowerCase();

      if (
        content.includes(searchTerm) ||
        getDocumentDisplayName(doc).toLowerCase().includes(searchTerm)
      ) {
        const lines = doc.content.split("\n");
        const matches: string[] = [];
        const lineNumbers: number[] = [];

        lines.forEach((line, index) => {
          if (line.toLowerCase().includes(searchTerm)) {
            matches.push(line);
            lineNumbers.push(index);
          }
        });

        results.push({
          doc,
          matches: matches.slice(0, 3),
          lineNumbers: lineNumbers.slice(0, 3),
        });
      }
    });

    setSearchResults(results);
  };

  const highlightSearchTerm = (text: string, query: string) => {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, "gi");
    return text.replace(regex, '<mark class="bg-yellow-300">$1</mark>');
  };

  const handleContentChange = (newContent: string) => {
    if (selectedDocument) {
      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === selectedDocument.id
            ? { ...doc, content: newContent }
            : doc,
        ),
      );
    }
  };

  // Render plain text content for edit mode
  const renderPlainTextContent = (content: string) => {
    return content
      .split("\n")
      .map((line, index) => {
        // Skip H1 headers as title is now handled separately
        if (line.startsWith("# ")) {
          return null;
        }
        if (line.trim() === "") {
          return <div key={index} className="mb-4"></div>;
        }

        return (
          <p
            key={index}
            id={`content-line-${index}`}
            className="mb-4 leading-relaxed text-gray-800 text-base whitespace-pre-wrap"
          >
            {line}
          </p>
        );
      })
      .filter(Boolean); // Remove null values from skipped H1 headers
  };

  // Render formatted content for preview mode
  const renderMobileMarkdownContent = (content: string) => {
    return content
      .split("\n")
      .map((line, index) => {
        // Skip H1 headers as title is now handled separately
        if (line.startsWith("# ")) {
          return null;
        }
        if (line.startsWith("## ")) {
          return (
            <h2
              key={index}
              id={`content-line-${index}`}
              className="text-xl font-semibold mb-4 mt-6 text-gray-900"
            >
              {line.substring(3)}
            </h2>
          );
        }
        if (line.trim() === "") {
          return <div key={index} className="mb-4"></div>;
        }

        // Check if this line should show unformatted text (when selected in preview mode)
        const shouldShowUnformatted = showPreview && isTextSelected && selectedLineIndices.includes(index);

        if (shouldShowUnformatted) {
          // Show plain text without formatting
          const plainText = line
            .replace(/^#+\s+/, '') // Remove headers
            .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
            .replace(/\*(.*?)\*/g, '$1') // Remove italic
            .replace(/`(.*?)`/g, '$1') // Remove inline code
            .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links, keep text
            .replace(/==(.*?)==/g, '$1'); // Remove highlights

          return (
            <p
              key={index}
              id={`content-line-${index}`}
              className="mb-4 leading-relaxed text-gray-600 text-base bg-gray-50 px-2 py-1 rounded transition-all duration-200"
            >
              {plainText}
            </p>
          );
        }

        // Handle mobile-optimized markdown formatting (normal mode)
        const processedLine = line
          .replace(
            /\*\*(.*?)\*\*/g,
            '<strong class="font-bold text-gray-900">$1</strong>',
          )
          .replace(
            /==(.*?)==/g,
            '<span class="bg-yellow-200 px-1 py-0.5 rounded font-medium text-gray-900">$1</span>',
          )
          .replace(
            /\[([^\]]+)\]/g,
            '<span class="text-purple-600 text-sm block mt-1 leading-relaxed">[$1]</span>',
          );

        return (
          <p
            key={index}
            id={`content-line-${index}`}
            className="mb-4 leading-relaxed text-gray-800 text-base"
            dangerouslySetInnerHTML={{ __html: processedLine }}
          />
        );
      })
      .filter(Boolean); // Remove null values from skipped H1 headers
  };

  return (
    <div className="h-screen flex justify-center bg-gray-100">
      <div className="w-full max-w-sm bg-white flex flex-col relative shadow-lg overflow-hidden">
        {/* Top Navigation Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 relative z-20">
          <Button
            variant="ghost"
            size="sm"
            className="p-2"
            onClick={() => {
              // If title editing with collision, revert title first
              if (isEditingTitle && titleCollisionWarning) {
                cancelTitleEditing();
              }
              openDocumentsDrawer();
            }}
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </Button>

          <h1 className="text-lg font-medium text-gray-900 truncate mx-4">
            {selectedDocument
              ? getDocumentDisplayName(selectedDocument)
              : "Documents"}
          </h1>

          <div className="flex items-center space-x-2">
            {showPreview ? (
              <Button
                variant="ghost"
                size="sm"
                className="p-2"
                onClick={() => {
                  setShowPreview(false);
                  setPreviewContent("");
                  setPreviewTitle("");
                }}
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-2"
                  onClick={() => {
                    // If title editing with collision, revert title first
                    if (isEditingTitle && titleCollisionWarning) {
                      cancelTitleEditing();
                    }
                    const newMode = !isEditMode;
                    setIsEditMode(newMode);

                    // Show toast notification
                    setModeToastMessage(
                      newMode ? "✒️ Edit Mode" : "👁️ Preview Mode",
                    );
                    setShowModeToast(true);
                  }}
                  title={
                    isEditMode
                      ? "Switch to Preview Mode"
                      : "Switch to Edit Mode"
                  }
                >
                  {isEditMode ? (
                    <span className="text-lg">✒️</span>
                  ) : (
                    <span className="text-lg">👁️</span>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-2"
                  onClick={() => {
                    // If title editing with collision, revert title first
                    if (isEditingTitle && titleCollisionWarning) {
                      cancelTitleEditing();
                    }
                  }}
                >
                  <Bookmark className="w-5 h-5 text-gray-600" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-2"
                  onClick={() => {
                    // If title editing with collision, revert title first
                    if (isEditingTitle && titleCollisionWarning) {
                      cancelTitleEditing();
                    }
                    setSettingsOpen(true);
                  }}
                >
                  <MoreVertical className="w-5 h-5 text-gray-600" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto px-8 py-6 bg-white">
          {selectedDocument ? (
            isEditingContent || isEditMode ? (
              <textarea
                value={selectedDocument.content}
                onChange={(e) => handleContentChange(e.target.value)}
                onBlur={() => setIsEditingContent(false)}
                className="w-full min-h-[calc(100vh-200px)] p-0 border-0 resize-none focus:outline-none bg-transparent text-base leading-relaxed"
                placeholder="Start writing your document content here..."
                autoFocus
              />
            ) : (
              <div
                className="min-h-[calc(100vh-200px)] cursor-text"
                onMouseUp={handleTextSelection}
                onTouchEnd={handleTextSelection}
                onClick={(e) => {
                  // Clear selection if clicking without selection
                  setTimeout(() => {
                    const selection = window.getSelection();
                    if (!selection || !selection.toString().trim()) {
                      setIsTextSelected(false);
                      setSelectedLineIndices([]);
                      setSelectedText("");
                      setSelectedDisplayText("");
                    }
                  }, 10);
                }}
                onDoubleClick={() => !isEditMode && setIsEditingContent(true)}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "copy";
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const quizData = e.dataTransfer.getData("quiz");
                  if (quizData) {
                    try {
                      const quiz = JSON.parse(quizData);
                      setPreviewContent(quiz.sourceText);
                      setPreviewTitle(quiz.title);
                      setShowPreview(true);
                    } catch (error) {
                      console.error("Error parsing dropped quiz data:", error);
                    }
                  }
                }}
              >
                {/* Document Title */}
                <div className="mb-8 relative">
                  {isEditingTitle ? (
                    <div
                      className="text-3xl font-bold text-gray-900 cursor-text min-h-[2.5rem] relative"
                      onClick={(e) => {
                        // Focus the hidden input when clicking anywhere on the title area
                        const input = e.currentTarget.querySelector("input");
                        if (input) input.focus();
                      }}
                    >
                      <input
                        type="text"
                        value={tempTitle}
                        onChange={(e) => handleTitleChange(e.target.value)}
                        onBlur={saveTitleChanges}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            saveTitleChanges();
                          } else if (e.key === "Escape") {
                            cancelTitleEditing();
                          }
                        }}
                        className="absolute inset-0 w-full h-full text-3xl font-bold text-gray-900 bg-transparent border-0 outline-0 resize-none overflow-hidden"
                        style={{
                          fontFamily: "inherit",
                          fontSize: "inherit",
                          fontWeight: "inherit",
                          lineHeight: "inherit",
                          color: "inherit",
                          padding: "0",
                          margin: "0",
                          appearance: "none",
                          border: "none",
                          boxShadow: "none",
                          background: "transparent",
                        }}
                        placeholder="Document title"
                        autoFocus
                      />
                      {/* Invisible text for sizing */}
                      <span className="invisible whitespace-pre-wrap">
                        {tempTitle || "Document title"}
                      </span>
                    </div>
                  ) : (
                    <h1
                      className="text-3xl font-bold text-gray-900 cursor-pointer hover:bg-gray-50 px-2 py-1 -mx-2 rounded transition-colors"
                      onClick={startEditingTitle}
                    >
                      {selectedDocument.title}
                    </h1>
                  )}

                  {/* Collision Warning directly below title */}
                  {titleCollisionWarning && (
                    <div className="absolute top-full left-0 right-0 mt-2 z-[100]">
                      <div className="relative">
                        {/* Triangle pointing up to title */}
                        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                          <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-b-[8px] border-l-transparent border-r-transparent border-b-red-500"></div>
                        </div>
                        {/* Warning banner */}
                        <div className="bg-red-500 text-white px-4 py-3 rounded text-center font-medium shadow-lg">
                          There's already a file with the same name
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Document Content */}
                {showPreview ? (
                  <>
                    <div className="mb-6">
                      <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        📖 {previewTitle || "Quiz Source Preview"}
                      </h1>
                      <div className="text-sm text-gray-600 mb-4">
                        Preview of the original text used to generate this quiz
                      </div>
                    </div>
                    {renderMobileMarkdownContent(previewContent)}
                  </>
                ) : isEditMode ? (
                  renderPlainTextContent(selectedDocument.content)
                ) : (
                  renderMobileMarkdownContent(selectedDocument.content)
                )}
              </div>
            )
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">Select a document to start</p>
                <Button onClick={openDocumentsDrawer}>View Documents</Button>
              </div>
            </div>
          )}
        </div>

        {/* Mode Switch Toast */}
        {showModeToast && (
          <div className="absolute top-20 left-0 right-0 flex justify-center z-[200]">
            <div className="bg-gray-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium">
              {modeToastMessage}
            </div>
          </div>
        )}

        {/* Bottom Navigation */}
        <div className="flex items-center justify-around px-4 py-3 bg-white border-t border-gray-200 relative z-20">
          <Button
            variant="ghost"
            size="sm"
            className="flex flex-col items-center space-y-1 p-2"
            onClick={() => {
              // If title editing with collision, revert title first
              if (isEditingTitle && titleCollisionWarning) {
                cancelTitleEditing();
              }
              openSearchDrawer();
            }}
          >
            <Search className="w-5 h-5 text-gray-600" />
            <span className="text-xs text-gray-600">Search</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="flex flex-col items-center space-y-1 p-2"
            onClick={handleAddDocument}
          >
            <Plus className="w-5 h-5 text-gray-600" />
            <span className="text-xs text-gray-600">Add</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="flex flex-col items-center space-y-1 p-2"
            onClick={() => {
              // If title editing with collision, revert title first
              if (isEditingTitle && titleCollisionWarning) {
                cancelTitleEditing();
              }
              openQuizDrawer();
            }}
          >
            <PenTool className="w-5 h-5 text-gray-600" />
            <span className="text-xs text-gray-600">Quiz</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="flex flex-col items-center space-y-1 p-2"
            onClick={() => {
              // If title editing with collision, revert title first
              if (isEditingTitle && titleCollisionWarning) {
                cancelTitleEditing();
              }
              openMoreDrawer();
            }}
          >
            <Grid className="w-5 h-5 text-gray-600" />
            <span className="text-xs text-gray-600">More</span>
          </Button>
        </div>

        {/* Documents Drawer - Slide from Left */}
        {documentsDrawerOpen && (
          <>
            <div
              className="absolute inset-0 bg-black bg-opacity-30 z-30"
              onClick={closeDocumentsDrawer}
            />
            <div className="absolute top-0 left-0 bottom-0 bg-white z-40 w-4/5 overflow-hidden shadow-xl">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Documents
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeDocumentsDrawer}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="overflow-y-auto flex-1 p-4">
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className={`flex items-center justify-between p-4 rounded-lg cursor-pointer transition-colors ${
                        selectedDocumentId === doc.id
                          ? "bg-blue-50 border border-blue-200"
                          : "bg-gray-50 hover:bg-gray-100"
                      }`}
                      onClick={() => handleDocumentSelect(doc.id)}
                    >
                      <div className="flex items-center flex-1 min-w-0">
                        <FileText
                          className={`w-5 h-5 mr-3 flex-shrink-0 ${
                            selectedDocumentId === doc.id
                              ? "text-blue-500"
                              : "text-gray-500"
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-gray-900 truncate">
                            {getDocumentDisplayName(doc)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {doc.createdAt.toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      {documents.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-2 p-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDocument(doc.id);
                          }}
                        >
                          <X className="w-4 h-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={handleAddDocument}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Document
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Search Drawer */}
        {searchDrawerOpen && (
          <>
            <div
              className="absolute inset-0 bg-black bg-opacity-50 z-30"
              onClick={closeSearchDrawer}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-xl z-40 max-h-[80vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Search</h2>
                <Button variant="ghost" size="sm" onClick={closeSearchDrawer}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="p-4">
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="overflow-y-auto max-h-[50vh] px-4 pb-4">
                {searchResults.length > 0 ? (
                  <div className="space-y-3">
                    {searchResults.map(({ doc, matches, lineNumbers }) => (
                      <div key={doc.id}>
                        <div className="font-medium text-gray-900 mb-2 p-3 bg-gray-100 rounded-t-lg">
                          {getDocumentDisplayName(doc)}
                        </div>
                        {matches.map((match, index) => (
                          <div
                            key={index}
                            className="p-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors border-b last:border-b-0 last:rounded-b-lg"
                            onClick={() => {
                              // Switch to the document first
                              setSelectedDocumentId(doc.id);
                              setSelectedText("");
                              setSelectedDisplayText("");
                              closeSearchDrawer();

                              // Scroll to position immediately
                              const targetLineNumber = lineNumbers[index];
                              const targetElement = document.getElementById(
                                `content-line-${targetLineNumber}`,
                              );

                              if (targetElement) {
                                // Scroll to the element
                                targetElement.scrollIntoView({
                                  behavior: "smooth",
                                  block: "center",
                                  inline: "nearest",
                                });

                                // Add highlight class instead of inline styles
                                targetElement.classList.add("search-highlight");
                              }
                            }}
                          >
                            <div
                              className="text-sm text-gray-600 leading-relaxed"
                              dangerouslySetInnerHTML={{
                                __html: highlightSearchTerm(
                                  match.substring(0, 100) +
                                    (match.length > 100 ? "..." : ""),
                                  searchQuery,
                                ),
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : searchQuery ? (
                  <div className="text-center py-8 text-gray-500">
                    No results found for "{searchQuery}"
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Type to search through all documents
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Quiz Tools Drawer */}
        {quizDrawerOpen && (
          <>
            <div
              className="absolute inset-0 bg-black bg-opacity-50 z-30"
              onClick={closeQuizDrawer}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-xl z-40 max-h-[80vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Quiz Tools
                </h2>
                <Button variant="ghost" size="sm" onClick={closeQuizDrawer}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="overflow-y-auto max-h-[60vh] p-4">
                {selectedText ? (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                    <div className="font-medium text-blue-800 mb-1">
                      Selected text (original markdown):
                    </div>
                    <div className="text-blue-700 text-sm">
                      "{selectedText.substring(0, 100)}
                      {selectedText.length > 100 ? "..." : '"'}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg mb-4">
                    <div className="text-gray-600 text-sm">
                      Select text in the document to generate quizzes
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div
                    className={`p-4 rounded-lg border-2 border-blue-200 bg-blue-50 cursor-pointer hover:shadow-md transition-all ${
                      isGeneratingQuiz && generatingType === "flashcard"
                        ? "opacity-50 pointer-events-none"
                        : ""
                    }`}
                    onClick={() => handleQuizToolClick("flashcard")}
                  >
                    <div className="flex items-center space-x-3">
                      {isGeneratingQuiz && generatingType === "flashcard" ? (
                        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                      ) : (
                        <span className="text-2xl">🎴</span>
                      )}
                      <div>
                        <h3 className="font-semibold text-gray-800">
                          {isGeneratingQuiz && generatingType === "flashcard"
                            ? "Generating..."
                            : "Flash Cards"}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Create flashcards from selected text
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`p-4 rounded-lg border-2 border-green-200 bg-green-50 cursor-pointer hover:shadow-md transition-all ${
                      isGeneratingQuiz && generatingType === "multiple-choice"
                        ? "opacity-50 pointer-events-none"
                        : ""
                    }`}
                    onClick={() => handleQuizToolClick("multiple-choice")}
                  >
                    <div className="flex items-center space-x-3">
                      {isGeneratingQuiz &&
                      generatingType === "multiple-choice" ? (
                        <Loader2 className="w-6 h-6 animate-spin text-green-600" />
                      ) : (
                        <span className="text-2xl">📝</span>
                      )}
                      <div>
                        <h3 className="font-semibold text-gray-800">
                          {isGeneratingQuiz &&
                          generatingType === "multiple-choice"
                            ? "Generating..."
                            : "Multiple Choice"}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Generate multiple choice questions
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`p-4 rounded-lg border-2 border-purple-200 bg-purple-50 cursor-pointer hover:shadow-md transition-all ${
                      isGeneratingQuiz && generatingType === "short-writing"
                        ? "opacity-50 pointer-events-none"
                        : ""
                    }`}
                    onClick={() => handleQuizToolClick("short-writing")}
                  >
                    <div className="flex items-center space-x-3">
                      {isGeneratingQuiz &&
                      generatingType === "short-writing" ? (
                        <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                      ) : (
                        <span className="text-2xl">✍️</span>
                      )}
                      <div>
                        <h3 className="font-semibold text-gray-800">
                          {isGeneratingQuiz &&
                          generatingType === "short-writing"
                            ? "Generating..."
                            : "Short Writing"}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Create writing prompts and exercises
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {allQuizzes.length > 0 && (
                  <>
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <h3 className="font-semibold text-gray-800 mb-3">
                        All Quizzes ({allQuizzes.length})
                      </h3>
                      <div className="space-y-2">
                        {allQuizzes.map((quiz) => {
                          const getQuizIcon = (type: string) => {
                            switch (type) {
                              case "flashcard":
                                return "🎴";
                              case "multiple-choice":
                                return "📝";
                              case "short-writing":
                                return "✍️";
                              default:
                                return "📄";
                            }
                          };

                          const getItemCount = (quiz: any) => {
                            if (Array.isArray(quiz.data)) {
                              switch (quiz.type) {
                                case "flashcard":
                                  return `${quiz.data.length} cards`;
                                case "multiple-choice":
                                  return `${quiz.data.length} questions`;
                                case "short-writing":
                                  return `${quiz.data.length} tasks`;
                                default:
                                  return `${quiz.data.length} items`;
                              }
                            }
                            return "0 items";
                          };

                          return (
                            <div
                              key={quiz.id}
                              className="group p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors relative"
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData(
                                  "quiz",
                                  JSON.stringify(quiz),
                                );
                                e.dataTransfer.effectAllowed = "copy";
                              }}
                            >
                              <div className="flex items-start justify-between">
                                <div
                                  className="flex-1 cursor-pointer"
                                  onClick={() => {
                                    navigate(`/quiz/${quiz.type}`);
                                    closeQuizDrawer();
                                  }}
                                >
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm">
                                      {getQuizIcon(quiz.type)}
                                    </span>
                                    <div className="text-sm font-medium text-gray-800 truncate">
                                      {quiz.title}
                                    </div>
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {getItemCount(quiz)}
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    {quiz.createdAt.toLocaleDateString()}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="p-1 h-6 w-6"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPreviewContent(quiz.sourceText);
                                      setPreviewTitle(quiz.title);
                                      setShowPreview(true);
                                      closeQuizDrawer();
                                    }}
                                    title="Preview source text"
                                  >
                                    <span className="text-xs">👁️</span>
                                  </Button>
                                  <div
                                    className="w-4 h-4 text-gray-400 cursor-grab"
                                    title="Drag to preview"
                                  >
                                    ⋮⋮
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {/* More Drawer */}
        {moreDrawerOpen && (
          <>
            <div
              className="absolute inset-0 bg-black bg-opacity-50 z-30"
              onClick={closeMoreDrawer}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-xl z-40 max-h-[80vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">More</h2>
                <Button variant="ghost" size="sm" onClick={closeMoreDrawer}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="p-4 space-y-3">
                <div
                  className="flex items-center p-4 rounded-lg border-2 border-purple-200 bg-purple-50 cursor-pointer hover:shadow-md transition-all"
                  onClick={() => {
                    setAiComposerOpen(true);
                    closeMoreDrawer();
                  }}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">🤖</span>
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        AI Composer
                      </h3>
                      <p className="text-sm text-gray-600">
                        Chat with AI for content creation and assistance
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className="flex items-center p-4 rounded-lg border-2 border-gray-200 bg-gray-50 cursor-pointer hover:shadow-md transition-all"
                  onClick={() => {
                    setSettingsOpen(true);
                    closeMoreDrawer();
                  }}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">���️</span>
                    <div>
                      <h3 className="font-semibold text-gray-800">Settings</h3>
                      <p className="text-sm text-gray-600">
                        Configure app preferences and API settings
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* AI Composer */}
        <AIComposer
          isOpen={aiComposerOpen}
          onClose={() => setAiComposerOpen(false)}
          settings={settings}
          documents={documents}
          selectedDocument={selectedDocument}
        />

        {/* Settings Modal - Mobile Constrained */}
        {settingsOpen && (
          <div className="absolute inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-center">
            <div className="w-full max-w-sm h-[85vh]">
              <SettingsModal
                isOpen={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                settings={settings}
                onSettingsChange={setSettings}
              />
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {isGeneratingQuiz && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 mx-4 max-w-sm w-full text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-800 mb-1">
                Generating Quiz
              </h3>
              <p className="text-sm text-gray-600">
                Please wait while we create your {generatingType} quiz...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
