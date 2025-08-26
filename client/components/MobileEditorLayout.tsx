import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Grid
} from 'lucide-react';
import { Button } from './ui/button';
import SettingsModal, { AppSettings } from './SettingsModal';
import { getLLMService } from '../services/llmService';
import { useQuiz } from '../contexts/QuizContext';

interface Document {
  id: string;
  name: string;
  content: string;
  createdAt: Date;
}

const initialDocuments: Document[] = [
  {
    id: '1',
    name: 'English 2',
    content: 'Welcome to English 2! Start writing your notes here...',
    createdAt: new Date('2024-01-15')
  },
  {
    id: '2',
    name: 'English 3',
    content: 'Welcome to English 3! This is your study space.',
    createdAt: new Date('2024-01-16')
  },
  {
    id: '3',
    name: 'English 4',
    content: `# English 4

Companies often **hedge** against currency fluctuations to protect their profits [hedge is an investment that is made to reduce the risk of adverse price movements in an asset]

Investors often **hedge** their bets by buying different types of assets [To reduce or protect against the risk of loss, especially in finance.]

A **hedge** fund is a private, unregistered investment fund. Hedge funds pool money from investors and invest in securities or other types of assets with the goal of getting positive returns.

He **hedged** when asked about his future plans. [avoid giving a direct answer]

Her **dogged** efforts to learn the piano finally paid off when she performed at the concert. [is persistent, determined, and doesn't give up easily, even when facing difficulties]

He was caught **doctoring** the financial records to hide his mistakes [To alter or falsify something (often secretly or dishonestly) to deceive others]

She **doctored** the old chair to make it usable again. [repair]

It's illegal to **falsify** your resume by lying about your qualifications [alter or create something false in order to deceive others, often to hide the truth or gain an unfair advantage]

A company conducting **due diligence** before acquiring another business to check its finances and legal liabilities. [careful, thorough, and systematic effort or research done to gather information, assess risks, or verify facts before making a decision]

The company took on significant **liability** after the accident, as they had to pay for damages. [Legal or financial responsibility for something, especially for`,
    createdAt: new Date('2024-01-17')
  }
];

export default function MobileEditorLayout() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>('3');
  const [selectedText, setSelectedText] = useState('');
  const [documentsDrawerOpen, setDocumentsDrawerOpen] = useState(false);
  const [quizDrawerOpen, setQuizDrawerOpen] = useState(false);
  const [searchDrawerOpen, setSearchDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{doc: Document, matches: string[]}[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [generatingType, setGeneratingType] = useState<string>('');
  const [settings, setSettings] = useState<AppSettings>({
    general: {
      languageLevel: 'cet4'
    },
    llm: {
      apiKey: 'AIzaSyCNDJgpRcdDiEVSNomjIMTW1yNWjX7K6P0',
      provider: 'gemini',
      model: 'gemini-2.0-flash-exp'
    }
  });
  const { createQuiz, getQuizzesByDocument, getAllQuizzes } = useQuiz();
  const [isEditingContent, setIsEditingContent] = useState(false);

  const selectedDocument = documents.find(doc => doc.id === selectedDocumentId);
  const documentQuizzes = selectedDocument ? getQuizzesByDocument(selectedDocument.id) : [];
  const allQuizzes = getAllQuizzes();

  // Function to extract title from markdown content
  const extractTitleFromContent = (content: string): string => {
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('# ')) {
        return trimmed.substring(2).trim();
      }
    }
    return '';
  };

  // Function to get display name for document
  const getDocumentDisplayName = (doc: Document): string => {
    const titleFromContent = extractTitleFromContent(doc.content);
    return titleFromContent || doc.name;
  };

  // Update document name when content changes
  useEffect(() => {
    if (selectedDocument) {
      const titleFromContent = extractTitleFromContent(selectedDocument.content);
      if (titleFromContent && titleFromContent !== selectedDocument.name) {
        setDocuments(prev =>
          prev.map(doc =>
            doc.id === selectedDocument.id
              ? { ...doc, name: titleFromContent }
              : doc
          )
        );
      }
    }
  }, [selectedDocument?.content]);

  const handleQuizToolClick = async (toolId: string) => {
    if (!selectedText) {
      alert('Please select some text first to generate a quiz!');
      return;
    }

    if (!settings.llm.apiKey) {
      alert('Please configure your LLM API key in settings first!');
      setSettingsOpen(true);
      return;
    }

    setIsGeneratingQuiz(true);
    setGeneratingType(toolId);
    setQuizDrawerOpen(false);

    try {
      const llmService = getLLMService(settings);

      switch (toolId) {
        case 'flashcard': {
          const flashcards = await llmService.generateFlashCards(selectedText);
          createQuiz('flashcard', `Flashcards - ${getDocumentDisplayName(selectedDocument!)}`, selectedText, flashcards, selectedDocument!.id);
          navigate('/quiz/flashcard');
          break;
        }
        case 'multiple-choice': {
          const questions = await llmService.generateMultipleChoice(selectedText);
          createQuiz('multiple-choice', `Multiple Choice - ${getDocumentDisplayName(selectedDocument!)}`, selectedText, questions, selectedDocument!.id);
          navigate('/quiz/multiple-choice');
          break;
        }
        case 'short-writing': {
          const tasks = await llmService.generateWritingTasks(selectedText);
          createQuiz('short-writing', `Writing Tasks - ${getDocumentDisplayName(selectedDocument!)}`, selectedText, tasks, selectedDocument!.id);
          navigate('/quiz/short-writing');
          break;
        }
      }
    } catch (error) {
      console.error('Error generating quiz:', error);
      alert(`Failed to generate quiz: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGeneratingQuiz(false);
      setGeneratingType('');
    }
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString()) {
      setSelectedText(selection.toString());
    }
  };

  const handleAddDocument = () => {
    const newId = (Math.max(...documents.map(d => parseInt(d.id))) + 1).toString();
    const newDocument: Document = {
      id: newId,
      name: 'New Document',
      content: '# New Document\n\nStart writing your content here...',
      createdAt: new Date()
    };

    setDocuments(prev => [...prev, newDocument]);
    setSelectedDocumentId(newId);
    setDocumentsDrawerOpen(false);
  };

  const handleDeleteDocument = (docId: string) => {
    if (documents.length <= 1) {
      alert('You must have at least one document.');
      return;
    }
    
    if (confirm('Are you sure you want to delete this document?')) {
      setDocuments(prev => prev.filter(doc => doc.id !== docId));
      
      if (selectedDocumentId === docId) {
        const remainingDocs = documents.filter(doc => doc.id !== docId);
        setSelectedDocumentId(remainingDocs[0]?.id || '');
      }
    }
  };

  const handleDocumentSelect = (docId: string) => {
    setSelectedDocumentId(docId);
    setSelectedText('');
    setDocumentsDrawerOpen(false);
    setSearchDrawerOpen(false);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const results: {doc: Document, matches: string[]}[] = [];
    documents.forEach(doc => {
      const content = doc.content.toLowerCase();
      const searchTerm = query.toLowerCase();

      if (content.includes(searchTerm) || getDocumentDisplayName(doc).toLowerCase().includes(searchTerm)) {
        const lines = doc.content.split('\n');
        const matches = lines
          .filter(line => line.toLowerCase().includes(searchTerm))
          .slice(0, 3); // Limit to 3 matches per document

        results.push({ doc, matches });
      }
    });

    setSearchResults(results);
  };

  const highlightSearchTerm = (text: string, query: string) => {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-300">$1</mark>');
  };

  const handleContentChange = (newContent: string) => {
    if (selectedDocument) {
      setDocuments(prev => 
        prev.map(doc => 
          doc.id === selectedDocument.id 
            ? { ...doc, content: newContent }
            : doc
        )
      );
    }
  };

  const renderMobileMarkdownContent = (content: string) => {
    return content
      .split('\n')
      .map((line, index) => {
        if (line.startsWith('# ')) {
          return <h1 key={index} className="text-2xl font-bold mb-6 mt-8 text-gray-900">{line.substring(2)}</h1>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={index} className="text-xl font-semibold mb-4 mt-6 text-gray-900">{line.substring(3)}</h2>;
        }
        if (line.trim() === '') {
          return <div key={index} className="mb-4"></div>;
        }

        // Handle mobile-optimized markdown formatting
        const processedLine = line
          .replace(/\*\*(.*?)\*\*/g, '<span class="bg-yellow-200 px-1 py-0.5 rounded font-medium text-gray-900">$1</span>')
          .replace(/\[([^\]]+)\]/g, '<span class="text-purple-600 text-sm block mt-1 leading-relaxed">[$1]</span>');

        return (
          <p
            key={index}
            className="mb-4 leading-relaxed text-gray-800 text-base"
            dangerouslySetInnerHTML={{ __html: processedLine }}
          />
        );
      });
  };

  return (
    <div className="h-screen flex flex-col bg-white relative overflow-hidden">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 relative z-20">
        <Button
          variant="ghost"
          size="sm"
          className="p-2"
          onClick={() => setDocumentsDrawerOpen(true)}
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </Button>
        
        <h1 className="text-lg font-medium text-gray-900 truncate mx-4">
          {selectedDocument ? getDocumentDisplayName(selectedDocument) : 'Documents'}
        </h1>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            className="p-2"
          >
            <Bookmark className="w-5 h-5 text-gray-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="p-2"
            onClick={() => setSettingsOpen(true)}
          >
            <MoreVertical className="w-5 h-5 text-gray-600" />
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 bg-white">
        {selectedDocument ? (
          isEditingContent ? (
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
              onDoubleClick={() => setIsEditingContent(true)}
            >
              {renderMobileMarkdownContent(selectedDocument.content)}
            </div>
          )
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">Select a document to start</p>
              <Button onClick={() => setDocumentsDrawerOpen(true)}>
                View Documents
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="flex items-center justify-around px-4 py-3 bg-white border-t border-gray-200 relative z-20">
        <Button
          variant="ghost"
          size="sm"
          className="flex flex-col items-center space-y-1 p-2"
          onClick={() => setSearchDrawerOpen(true)}
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
          onClick={() => setQuizDrawerOpen(true)}
        >
          <PenTool className="w-5 h-5 text-gray-600" />
          <span className="text-xs text-gray-600">Quiz</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="flex flex-col items-center space-y-1 p-2"
        >
          <Grid className="w-5 h-5 text-gray-600" />
          <span className="text-xs text-gray-600">More</span>
        </Button>
      </div>

      {/* Documents Drawer */}
      {documentsDrawerOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-30"
            onClick={() => setDocumentsDrawerOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-xl z-40 max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Documents</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDocumentsDrawerOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="overflow-y-auto max-h-[60vh] p-4">
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className={`flex items-center justify-between p-4 rounded-lg cursor-pointer transition-colors ${
                      selectedDocumentId === doc.id 
                        ? 'bg-blue-50 border border-blue-200' 
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                    onClick={() => handleDocumentSelect(doc.id)}
                  >
                    <div className="flex items-center flex-1 min-w-0">
                      <FileText className={`w-5 h-5 mr-3 flex-shrink-0 ${
                        selectedDocumentId === doc.id ? 'text-blue-500' : 'text-gray-500'
                      }`} />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-gray-900 truncate">{getDocumentDisplayName(doc)}</div>
                        <div className="text-sm text-gray-500">{doc.createdAt.toLocaleDateString()}</div>
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

      {/* Quiz Tools Drawer */}
      {quizDrawerOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-30"
            onClick={() => setQuizDrawerOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-xl z-40 max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Quiz Tools</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setQuizDrawerOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="overflow-y-auto max-h-[60vh] p-4">
              {selectedText ? (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                  <div className="font-medium text-blue-800 mb-1">Selected text:</div>
                  <div className="text-blue-700 text-sm">"{selectedText.substring(0, 100)}{selectedText.length > 100 ? '...' : '"'}</div>
                </div>
              ) : (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg mb-4">
                  <div className="text-gray-600 text-sm">Select text in the document to generate quizzes</div>
                </div>
              )}

              <div className="space-y-3">
                <div 
                  className={`p-4 rounded-lg border-2 border-blue-200 bg-blue-50 cursor-pointer hover:shadow-md transition-all ${
                    isGeneratingQuiz && generatingType === 'flashcard' ? 'opacity-50 pointer-events-none' : ''
                  }`}
                  onClick={() => handleQuizToolClick('flashcard')}
                >
                  <div className="flex items-center space-x-3">
                    {isGeneratingQuiz && generatingType === 'flashcard' ? (
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    ) : (
                      <span className="text-2xl">🎴</span>
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        {isGeneratingQuiz && generatingType === 'flashcard' ? 'Generating...' : 'Flash Cards'}
                      </h3>
                      <p className="text-sm text-gray-600">Create flashcards from selected text</p>
                    </div>
                  </div>
                </div>
                
                <div 
                  className={`p-4 rounded-lg border-2 border-green-200 bg-green-50 cursor-pointer hover:shadow-md transition-all ${
                    isGeneratingQuiz && generatingType === 'multiple-choice' ? 'opacity-50 pointer-events-none' : ''
                  }`}
                  onClick={() => handleQuizToolClick('multiple-choice')}
                >
                  <div className="flex items-center space-x-3">
                    {isGeneratingQuiz && generatingType === 'multiple-choice' ? (
                      <Loader2 className="w-6 h-6 animate-spin text-green-600" />
                    ) : (
                      <span className="text-2xl">📝</span>
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        {isGeneratingQuiz && generatingType === 'multiple-choice' ? 'Generating...' : 'Multiple Choice'}
                      </h3>
                      <p className="text-sm text-gray-600">Generate multiple choice questions</p>
                    </div>
                  </div>
                </div>
                
                <div 
                  className={`p-4 rounded-lg border-2 border-purple-200 bg-purple-50 cursor-pointer hover:shadow-md transition-all ${
                    isGeneratingQuiz && generatingType === 'short-writing' ? 'opacity-50 pointer-events-none' : ''
                  }`}
                  onClick={() => handleQuizToolClick('short-writing')}
                >
                  <div className="flex items-center space-x-3">
                    {isGeneratingQuiz && generatingType === 'short-writing' ? (
                      <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                    ) : (
                      <span className="text-2xl">✍️</span>
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        {isGeneratingQuiz && generatingType === 'short-writing' ? 'Generating...' : 'Short Writing'}
                      </h3>
                      <p className="text-sm text-gray-600">Create writing prompts and exercises</p>
                    </div>
                  </div>
                </div>
              </div>

              {documentQuizzes.length > 0 && (
                <>
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <h3 className="font-semibold text-gray-800 mb-3">Recent Quizzes</h3>
                    <div className="space-y-2">
                      {documentQuizzes.slice(0, 3).map((quiz) => {
                        const getQuizIcon = (type: string) => {
                          switch (type) {
                            case 'flashcard': return '🎴';
                            case 'multiple-choice': return '📝';
                            case 'short-writing': return '✍️';
                            default: return '📄';
                          }
                        };

                        return (
                          <div
                            key={quiz.id}
                            className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => {
                              navigate(`/quiz/${quiz.type}`);
                              setQuizDrawerOpen(false);
                            }}
                          >
                            <div className="flex items-center space-x-3">
                              <span className="text-lg">{getQuizIcon(quiz.type)}</span>
                              <div>
                                <div className="font-medium text-gray-800 text-sm truncate">{quiz.title}</div>
                                <div className="text-xs text-gray-500">{quiz.createdAt.toLocaleDateString()}</div>
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

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSettingsChange={setSettings}
      />

      {/* Loading Overlay */}
      {isGeneratingQuiz && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 mx-4 max-w-sm w-full text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-800 mb-1">Generating Quiz</h3>
            <p className="text-sm text-gray-600">Please wait while we create your {generatingType} quiz...</p>
          </div>
        </div>
      )}
    </div>
  );
}
