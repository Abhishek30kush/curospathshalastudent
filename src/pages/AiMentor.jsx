import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function AiMentor() {
  const navigate = useNavigate();
  const location = useLocation();
  const [messages, setMessages] = useState([
    { id: '1', role: 'assistant', text: 'Hello Scholar! I am your CUROS AI Mentor. Ask me a doubt, or ask me to generate a personalized study plan for your weak topics!' }
  ]);
  const [input, setInput] = useState('');
  const chatEndRef = useRef(null);

  // Auto-scroll to bottom of chat window
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (location.state?.initialQuestion) {
      const qText = location.state.initialQuestion;
      const solText = location.state.solution;
      
      const userMessage = { 
        id: Date.now().toString(), 
        role: 'user', 
        text: `Can you explain this question?\n\n"${qText}"${solText ? `\n\nSolution provided: ${solText}` : ''}` 
      };
      
      setMessages(prev => [
        ...prev, 
        userMessage
      ]);
      
      // Auto reply after 1s
      setTimeout(() => {
        const aiMessage = { 
          id: (Date.now() + 1).toString(), 
          role: 'assistant', 
          text: `I would be happy to explain this doubt for you! 

Based on the question: "${qText}"
${solText ? `And the provided solution: "${solText}"` : ''}

[AI EXPLANATION DEMO]: In production, the AI model (like Gemini) would parse the question and break it down step-by-step. To unlock full real-time explanations, please connect a Firebase Cloud Function with an LLM backend API.`
        };
        setMessages(prev => [...prev, aiMessage]);
      }, 1000);
    }
  }, [location.state]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { id: Date.now().toString(), role: 'user', text: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    // Demo Mode Response
    setTimeout(() => {
      const aiMessage = { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant', 
        text: "I'm currently running in Demo Mode. To fully unlock my powers (Doubt Solving, Study Planner, Rank Predictor), the admin needs to deploy Firebase Cloud Functions connected to an AI API!"
      };
      setMessages(prev => [...prev, aiMessage]);
    }, 1000);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', gap: '16px' }}>
        <button 
          onClick={() => navigate('/')} 
          style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}
        >
          &larr; Back
        </button>
        <h1 className="section-title" style={{ margin: 0 }}>CUROS AI Mentor</h1>
      </div>

      <div className="chat-window">
        {/* Chat Bubbles Container */}
        <div className="chat-scroller">
          {messages.map(msg => (
            <div 
              key={msg.id} 
              className={`chat-bubble ${msg.role === 'user' ? 'bubble-user' : 'bubble-ai'}`}
            >
              <p style={{ margin: 0 }}>{msg.text}</p>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <form className="chat-input-bar" onSubmit={handleSend}>
          <input 
            type="text" 
            className="chat-textbox" 
            placeholder="Ask a doubt or request a study plan..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" className="chat-send-btn">
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
