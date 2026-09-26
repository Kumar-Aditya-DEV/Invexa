import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useStockSense } from '../../context/StockSenseContext';
import { queryInvexaAI, ChatMessage } from '../../services/aiChatService';
import {
  X,
  Send,
  Minimize2,
  Maximize2,
  RotateCcw,
  User,
  ArrowRight,
  Package,
  Truck,
  Building2,
  AlertTriangle,
  Layers,
  CheckCircle2,
  DollarSign,
  ArrowLeftRight,
  ArrowDownLeft,
  ChevronRight,
  Move,
  GripHorizontal,
  Sparkles
} from 'lucide-react';

interface QuickPrompt {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  query: string;
}

const QUICK_PROMPTS: QuickPrompt[] = [
  { label: 'Low Stock Alerts', icon: AlertTriangle, query: 'Which items are low on stock?' },
  { label: 'Pending Deliveries', icon: Truck, query: 'Show pending deliveries and shipments' },
  { label: 'Inbound Receipts', icon: ArrowDownLeft, query: 'What receipts are waiting at dock?' },
  { label: 'Warehouse Capacity', icon: Building2, query: 'Give me a warehouse capacity overview' },
  { label: 'Inventory Valuation', icon: DollarSign, query: 'What is our total stock valuation?' },
  { label: 'Transfer Guidance', icon: ArrowLeftRight, query: 'How do I create a stock transfer?' }
];

export const InvexaAICopilot: React.FC = () => {
  const {
    products,
    warehouses,
    locations,
    receipts,
    deliveries,
    transfers,
    reorderingRules,
    getKPIs,
    setActiveView,
    setSelectedProductId
  } = useStockSense();

  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasUnreadAlert, setHasUnreadAlert] = useState(true);

  // Movable / Draggable State
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({
    startX: 0,
    startY: 0,
    posX: 0,
    posY: 0
  });

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const kpis = getKPIs();

  const initialGreeting: ChatMessage = {
    id: 'welcome-1',
    sender: 'assistant',
    text: `**Welcome to INVEXA AI Copilot**\n\nI am your intelligent warehouse & inventory assistant, synced with **${products.length} active SKUs** across **${warehouses.length} facilities**.\n\nAsk me anything about stock balances, pending deliveries, dock receipts, or warehouse capacities.`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    actionButtons: [
      { label: 'Check Low Stock', view: 'stock' },
      { label: 'Pending Orders', view: 'deliveries' },
      { label: 'Facilities Matrix', view: 'warehouses' }
    ]
  };

  const [messages, setMessages] = useState<ChatMessage[]>([initialGreeting]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
      setHasUnreadAlert(false);
    }
  }, [isOpen, messages, isTyping]);

  // Handle Dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    // Don't drag if clicking buttons inside the header
    if ((e.target as HTMLElement).closest('button')) return;
    if (isExpanded) return; // Don't drag if fullscreen expanded

    const rect = chatContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const currentX = position ? position.x : rect.left;
    const currentY = position ? position.y : rect.top;

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: currentX,
      posY: currentY
    };

    setIsDragging(true);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;

    let newX = dragStartRef.current.posX + dx;
    let newY = dragStartRef.current.posY + dy;

    // Constrain to viewport boundaries
    const chatWidth = chatContainerRef.current?.offsetWidth || 450;
    const chatHeight = chatContainerRef.current?.offsetHeight || 600;

    newX = Math.max(10, Math.min(window.innerWidth - chatWidth - 10, newX));
    newY = Math.max(10, Math.min(window.innerHeight - chatHeight - 10, newY));

    setPosition({ x: newX, y: newY });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleResetPosition = () => {
    setPosition(null);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputValue).trim();
    if (!query || isTyping) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    const contextPayload = {
      products,
      warehouses,
      locations,
      receipts,
      deliveries,
      transfers,
      reorderingRules,
      kpis
    };

    try {
      await new Promise(res => setTimeout(res, 350));
      const aiResponse = await queryInvexaAI(query, messages, contextPayload);
      setMessages(prev => [...prev, aiResponse]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: 'An error occurred while querying the inventory database. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleResetChat = () => {
    setMessages([initialGreeting]);
  };

  const handleActionClick = (view: string, productId?: string) => {
    if (productId) {
      setSelectedProductId(productId);
    }
    setActiveView(view);
    if (window.innerWidth < 768) {
      setIsOpen(false);
    }
  };

  // Clean Markdown formatter without raw asterisks
  const renderFormattedText = (text: string) => {
    return text.split('\n').map((line, idx) => {
      // Bold replace
      let formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>');
      // Italic replace
      formatted = formatted.replace(/\*(.*?)\*/g, '<em class="text-slate-700 italic">$1</em>');
      // Inline code replace
      formatted = formatted.replace(/`(.*?)`/g, '<code class="px-1.5 py-0.5 rounded bg-slate-100 text-blue-700 font-mono text-[11px] font-semibold">$1</code>');

      if (line.startsWith('• ') || line.startsWith('- ')) {
        return (
          <div key={idx} className="flex items-start gap-2 ml-1 my-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
            <span
              className="text-xs text-slate-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: formatted.replace(/^[•-]\s*/, '') }}
            />
          </div>
        );
      }

      if (!line.trim()) {
        return <div key={idx} className="h-1.5" />;
      }

      return (
        <p
          key={idx}
          className="text-xs text-slate-700 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: formatted }}
        />
      );
    });
  };

  return (
    <>
      {/* Floating Launcher Button */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <button
            onClick={() => setIsOpen(true)}
            className="group relative flex items-center gap-3 pl-2.5 pr-4 py-2.5 bg-white text-slate-800 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 border border-slate-200 hover:border-blue-500"
          >
            {/* INVEXA Logo */}
            <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center p-1 shrink-0">
              <img src="/invexa_logo.png" alt="INVEXA" className="w-full h-full object-contain" />
            </div>

            <div className="flex flex-col text-left">
              <span className="text-xs font-bold text-slate-900 tracking-wide flex items-center gap-1.5">
                INVEXA AI
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Inventory Copilot</span>
            </div>

            <span className="ml-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-mono font-bold border border-blue-100">
              Live DB
            </span>
          </button>
        </div>
      )}

      {/* Movable & Draggable AI Chat Panel */}
      {isOpen && (
        <div
          ref={chatContainerRef}
          style={
            position && !isExpanded
              ? {
                  position: 'fixed',
                  left: `${position.x}px`,
                  top: `${position.y}px`,
                  right: 'auto',
                  bottom: 'auto'
                }
              : {}
          }
          className={`fixed z-50 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden select-text ${
            isExpanded
              ? 'bottom-4 right-4 top-4 left-4 md:left-auto md:w-[700px] md:h-[calc(100vh-2rem)]'
              : position
              ? 'w-[92vw] sm:w-[420px] md:w-[460px] h-[600px] max-h-[85vh]'
              : 'bottom-6 right-6 w-[92vw] sm:w-[420px] md:w-[460px] h-[600px] max-h-[85vh]'
          }`}
        >
          {/* Draggable Header */}
          <div
            onMouseDown={handleMouseDown}
            className={`px-4 py-3 bg-white border-b border-slate-200 text-slate-900 flex items-center justify-between select-none ${
              !isExpanded ? 'cursor-grab active:cursor-grabbing hover:bg-slate-50/70' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              {/* INVEXA Logo */}
              <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center p-1 shrink-0 shadow-2xs">
                <img src="/invexa_logo.png" alt="INVEXA" className="w-full h-full object-contain" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-xs text-slate-900">INVEXA AI Copilot</h3>
                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 text-[9px] font-bold border border-emerald-200">
                    Live ERP
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">Contextual Inventory & Database Assistant</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {!isExpanded && (
                <div title="Drag header to move chat" className="p-1 text-slate-300 hidden sm:block">
                  <GripHorizontal className="w-4 h-4" />
                </div>
              )}
              {position && !isExpanded && (
                <button
                  type="button"
                  onClick={handleResetPosition}
                  title="Snap to Default Position"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors text-[10px] font-semibold"
                >
                  Reset Pos
                </button>
              )}
              <button
                type="button"
                onClick={handleResetChat}
                title="Reset Conversation"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? 'Restore Size' : 'Expand View'}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors hidden sm:block"
              >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close Copilot"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Action Prompt Chips (No Emojis, Clean Lucide Icons) */}
          <div className="px-3 py-2 bg-slate-50/80 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {QUICK_PROMPTS.map((prompt, idx) => {
              const PromptIcon = prompt.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(prompt.query)}
                  className="shrink-0 px-2.5 py-1 rounded-xl bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-[11px] font-semibold border border-slate-200 hover:border-blue-300 transition-all shadow-2xs flex items-center gap-1.5"
                >
                  <PromptIcon className="w-3 h-3 text-slate-500 shrink-0" />
                  <span>{prompt.label}</span>
                </button>
              );
            })}
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F8FAFC]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'assistant' && (
                  <div className="w-7 h-7 rounded-xl bg-white border border-slate-200 p-0.5 flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                    <img src="/invexa_logo.png" alt="INVEXA" className="w-full h-full object-contain" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 shadow-2xs space-y-2.5 ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-xs'
                      : 'bg-white border border-slate-200/90 text-slate-800 rounded-tl-xs'
                  }`}
                >
                  {/* Message Content */}
                  <div>
                    {msg.sender === 'user' ? (
                      <p className="text-xs font-medium leading-relaxed">{msg.text}</p>
                    ) : (
                      renderFormattedText(msg.text)
                    )}
                  </div>

                  {/* Embedded Rich Data Cards */}
                  {msg.dataCard && (
                    <div className="mt-2 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden shadow-2xs">
                      <div className="px-3 py-1.5 bg-slate-100/90 border-b border-slate-200 text-[11px] font-bold text-slate-700 flex items-center justify-between">
                        <span>{msg.dataCard.title}</span>
                      </div>
                      <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto bg-white">
                        {msg.dataCard.items?.map((item, i) => (
                          <div key={i} className="p-2.5 flex items-center justify-between gap-2 hover:bg-slate-50/80 transition-colors">
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold text-slate-900 truncate">{item.title}</div>
                              {item.subtitle && (
                                <div className="text-[10px] text-slate-500 truncate">{item.subtitle}</div>
                              )}
                            </div>
                            <div className="flex flex-col items-end shrink-0 gap-0.5">
                              {item.badge && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${item.badgeColor || 'bg-slate-100 text-slate-700'}`}>
                                  {item.badge}
                                </span>
                              )}
                              {item.value && (
                                <span className="text-[10px] font-mono text-slate-500">{item.value}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Direct Action Deep Link Buttons (No Emojis) */}
                  {msg.actionButtons && msg.actionButtons.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
                      {msg.actionButtons.map((btn, bIdx) => (
                        <button
                          key={bIdx}
                          type="button"
                          onClick={() => handleActionClick(btn.view, btn.productId)}
                          className="px-2.5 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold border border-blue-200 hover:border-blue-300 transition-all flex items-center gap-1 shadow-2xs"
                        >
                          <span>{btn.label}</span>
                          <ChevronRight className="w-3 h-3 text-blue-500" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Timestamp */}
                  <div
                    className={`text-[9px] text-right font-mono ${
                      msg.sender === 'user' ? 'text-blue-100' : 'text-slate-400'
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>

                {msg.sender === 'user' && (
                  <div className="w-7 h-7 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-7 h-7 rounded-xl bg-white border border-slate-200 p-0.5 flex items-center justify-center shrink-0 shadow-2xs">
                  <img src="/invexa_logo.png" alt="INVEXA" className="w-full h-full object-contain" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs p-3 shadow-2xs flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '300ms' }} />
                  <span className="text-[11px] text-slate-400 ml-1 font-medium">Querying database...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input Area */}
          <div className="p-3 bg-white border-t border-slate-200 space-y-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about SKUs, stock levels, orders, or facilities..."
                className="flex-1 px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800 placeholder-slate-400 transition-colors"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isTyping}
                className={`p-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all ${
                  !inputValue.trim() || isTyping ? 'opacity-40 cursor-not-allowed' : 'shadow-md hover:scale-105 active:scale-95'
                }`}
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Live Context Active (Database Connected)
              </span>
              <span>Press Enter ↵ to Send</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
