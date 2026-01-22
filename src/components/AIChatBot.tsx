import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Bot } from 'lucide-react';

interface Message {
    id: string;
    sender: 'user' | 'ai';
    text: string;
    timestamp: Date;
}

export function AIChatBot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            sender: 'ai',
            text: '안녕하세요! 저는 당신의 AI 경영 컨설턴트입니다. 매출 분석이나 원가 절감 방안에 대해 무엇이든 물어보세요.',
            timestamp: new Date(),
        },
    ]);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = () => {
        if (!input.trim()) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            sender: 'user',
            text: input,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMsg]);
        setInput('');

        // Mock AI Response
        setTimeout(() => {
            let aiResponseText = "죄송합니다. 현재 데이터를 분석 중이라 정확한 답변을 드리기 어렵습니다.";

            if (input.includes("인건비")) {
                aiResponseText = "인건비 비중이 전월 대비 5% 상승했습니다. 특히 주말 저녁 시간대 아르바이트 근무 시간이 과다 책정되어 있는지 스케줄 점검을 추천드립니다.";
            } else if (input.includes("매출")) {
                aiResponseText = "매출 추이는 긍정적입니다. 다만 객단가(1인당 평균 결제액)를 높이기 위해 세트 메뉴 구성을 다양화하는 전략이 필요해 보입니다.";
            } else if (input.includes("원가") || input.includes("식자재")) {
                aiResponseText = "현재 '소고기 등심'과 '계란'의 매입 단가가 시장 평균보다 높습니다. 대체 공급업체를 알아보거나 대량 구매 할인을 협상해보세요.";
            } else {
                aiResponseText = "흥미로운 질문이네요! 현재 보유한 데이터를 바탕으로 분석해보면, 고정비 절감보다는 변동비(식자재 로스) 관리가 더 시급한 과제입니다.";
            }

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                sender: 'ai',
                text: aiResponseText,
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, aiMsg]);
        }, 1000);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSend();
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {isOpen && (
                <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-80 md:w-96 h-[500px] flex flex-col mb-4 overflow-hidden animate-fade-in-up">
                    {/* Header */}
                    <div className="bg-slate-900 p-4 flex items-center justify-between text-white">
                        <div className="flex items-center gap-2">
                            <div className="bg-orange-500 p-1.5 rounded-lg">
                                <Bot size={18} />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm">AI 경영 컨설턴트</h3>
                                <p className="text-[10px] text-slate-300">Online • Data-driven Insight</p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-2xl p-3 text-sm ${msg.sender === 'user'
                                            ? 'bg-orange-500 text-white rounded-tr-none'
                                            : 'bg-white text-slate-700 shadow-sm border border-slate-100 rounded-tl-none'
                                        }`}
                                >
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-3 bg-white border-t border-slate-100">
                        <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyPress}
                                placeholder="궁금한 점을 물어보세요..."
                                className="flex-1 bg-transparent text-sm focus:outline-none text-slate-700"
                            />
                            <button
                                onClick={handleSend}
                                className="p-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                            >
                                <Send size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-4 rounded-full shadow-lg transition-all duration-300 flex items-center gap-2 ${isOpen ? 'bg-slate-700 text-white rotate-0' : 'bg-orange-500 hover:bg-orange-600 text-white hover:scale-110'
                    }`}
            >
                {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
                {!isOpen && <span className="font-bold pr-2">AI 상담</span>}
            </button>
        </div>
    );
}
