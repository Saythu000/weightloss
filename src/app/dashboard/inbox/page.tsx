'use client';

import React, { useState, useEffect, useRef } from 'react';

interface ChatItem {
  id: string;
  jid: string;
  isLid?: boolean;
  name: string;
  phone: string;
  state: string;
  status: string;
  lastMsg: string;
  time: string;
  avatar: string;
  aiActive: boolean;
  leadScore?: number;
  dealValue?: string;
  bmi?: number;
  allergies?: string;
}

interface MessageItem {
  sender: 'patient' | 'agent' | 'bot';
  text: string;
  time: string;
  isAudio?: boolean;
  audioUrl?: string;
  transcription?: string;
  isMedia?: boolean;
  mediaName?: string;
}

export default function WhatsAppInboxPage() {
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [chatFilter, setChatFilter] = useState<'all' | 'unread' | 'favorites'>('all');
  const [showContactInfo, setShowContactInfo] = useState(true);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  // Edit Contact Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [savingContact, setSavingContact] = useState(false);

  // Delete Contact Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingContact, setDeletingContact] = useState(false);

  // File Media Attachment State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Audio Voice Note Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Fetch live WhatsApp chat sessions from /api/bot/chats
  const fetchChats = async () => {
    try {
      const res = await fetch('/api/bot/chats');
      const data = await res.json();
      if (data.success && data.chats) {
        setChats(data.chats);
        if (!activeId && data.chats.length > 0) {
          setActiveId(data.chats[0].id || data.chats[0].jid);
        }
      }
    } catch (e) {
      console.error('Failed to fetch chat sessions:', e);
    } finally {
      setLoadingChats(false);
    }
  };

  useEffect(() => {
    fetchChats();
  }, []);

  const activeChat = chats.find((c) => c.id === activeId || c.jid === activeId) || {
    id: 'default',
    jid: 'default',
    name: 'Kalyan Kumar',
    phone: '+919390834107',
    state: 'Enterprise Lead',
    status: 'Voice Qualified',
    lastMsg: 'Hi team, checking on our custom LLM fine-tuning proposal & API latency benchmarking...',
    time: '10:42 AM',
    avatar: 'KK',
    aiActive: true,
    leadScore: 94,
    dealValue: '$45,000',
    bmi: 94,
    allergies: 'Salesforce CRM, WhatsApp API',
  };

  // Fetch real-time messages for active session from /api/bot/chat/messages
  useEffect(() => {
    if (!activeChat || !activeChat.jid) return;

    const fetchMessages = async () => {
      setLoadingMessages(true);
      try {
        const res = await fetch(`/api/bot/chat/messages?jid=${encodeURIComponent(activeChat.jid)}`);
        const data = await res.json();
        if (data.success && data.messages) {
          setMessages(data.messages);
        }
      } catch (e) {
        console.error('Failed to fetch messages:', e);
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchMessages();
  }, [activeChat.jid]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Open Edit Contact Modal
  const handleOpenEditModal = () => {
    setEditName(activeChat.name.startsWith('+') ? '' : activeChat.name);
    setEditPhone(activeChat.phone);
    setShowEditModal(true);
  };

  // Save Contact Name & Phone POST /api/bot/contacts/save
  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      alert('Please enter a contact name.');
      return;
    }

    setSavingContact(true);
    try {
      const res = await fetch('/api/bot/contacts/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jid: activeChat.jid,
          phone: editPhone,
          name: editName,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowEditModal(false);
        fetchChats();
      } else {
        alert(data.error || 'Failed to update contact name');
      }
    } catch (err) {
      console.error(err);
      alert('Network error updating contact');
    } finally {
      setSavingContact(false);
    }
  };

  // Delete Contact / Session POST /api/bot/contacts/delete
  const handleDeleteContact = async () => {
    setDeletingContact(true);
    try {
      const res = await fetch('/api/bot/contacts/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jid: activeChat.jid,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowDeleteModal(false);
        setActiveId('');
        fetchChats();
      } else {
        alert(data.error || 'Failed to delete contact session');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting contact');
    } finally {
      setDeletingContact(false);
    }
  };

  // Toggle AI Sales Bot Handover
  const handleToggleAi = async () => {
    try {
      const newStatus = !activeChat.aiActive;
      setChats((prev) =>
        prev.map((c) => (c.id === activeChat.id ? { ...c, aiActive: newStatus } : c))
      );
      await fetch('/api/bot/chat/toggle-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jid: activeChat.jid, aiActive: newStatus }),
      });
    } catch (e) {
      console.error('Failed to toggle AI handover:', e);
    }
  };

  // Handle File Media Select
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Send WhatsApp Text or Media Message
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !selectedFile) return;

    setSending(true);
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    try {
      if (selectedFile) {
        const fileToUpload = selectedFile;
        const captionText = inputText.trim();
        setSelectedFile(null);
        setInputText('');

        const newMediaMsg: MessageItem = {
          sender: 'agent',
          text: captionText ? `${captionText} (Attachment: ${fileToUpload.name})` : `Attachment: ${fileToUpload.name}`,
          time: timeStr,
          isMedia: true,
          mediaName: fileToUpload.name,
        };
        setMessages((prev) => [...prev, newMediaMsg]);

        const formData = new FormData();
        formData.append('jid', activeChat.jid);
        formData.append('file', fileToUpload);
        formData.append('caption', captionText);
        formData.append('isPtt', 'false');

        await fetch('/api/bot/chat/send-media', {
          method: 'POST',
          body: formData,
        });
      } else {
        const newMsgText = inputText;
        setInputText('');

        const newMsg: MessageItem = {
          sender: 'agent',
          text: newMsgText,
          time: timeStr,
        };
        setMessages((prev) => [...prev, newMsg]);

        await fetch('/api/bot/chat/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jid: activeChat.jid,
            text: newMsgText,
          }),
        });
      }
      fetchChats();
    } catch (err) {
      console.error('Failed to dispatch message:', err);
    } finally {
      setSending(false);
    }
  };

  // Start Browser Microphone Voice Note Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp4' });
        const audioUrl = URL.createObjectURL(audioBlob);

        const sampleTranscriptions = [
          'Hi Kalyan, we benchmarked the AI Voice Agent response latency at 112ms over WebSockets with 99.4% intent accuracy.',
          'Hello, we are interested in fine-tuning a custom Llama-3 model on our enterprise CRM knowledge base for 500 sales reps.',
          'Confirmed! Our sales pipeline integration is live and scheduling demo calls via WhatsApp automated workflow.',
        ];
        const randomTranscript = sampleTranscriptions[Math.floor(Math.random() * sampleTranscriptions.length)];

        const voiceMsg: MessageItem = {
          sender: 'agent',
          text: `🎤 Voice Note (00:${recordingSeconds < 10 ? '0' : ''}${recordingSeconds})`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isAudio: true,
          audioUrl,
          transcription: randomTranscript,
        };

        setMessages((prev) => [...prev, voiceMsg]);

        try {
          const formData = new FormData();
          formData.append('jid', activeChat.jid);
          formData.append('file', audioBlob, 'voicenote.mp4');
          formData.append('isPtt', 'true');
          formData.append('transcription', randomTranscript);

          await fetch('/api/bot/chat/send-media', {
            method: 'POST',
            body: formData,
          });
        } catch (e) {
          console.error('Failed to dispatch voice note media:', e);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (e) {
      console.error('Microphone access error:', e);
      alert('Unable to access microphone. Please check browser permissions.');
    }
  };

  // Stop Browser Microphone Voice Note Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  const filteredChats = chats.filter((c) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = !term || c.name.toLowerCase().includes(term) || c.phone.toLowerCase().includes(term);
    if (!matchesSearch) return false;
    if (chatFilter === 'unread') return c.status.toLowerCase().includes('inquiry') || c.status.toLowerCase().includes('new');
    if (chatFilter === 'favorites') return c.aiActive;
    return true;
  });

  return (
    <main id="section-chat" className="flex-1 h-full overflow-hidden flex bg-white border border-zinc-200 text-zinc-900 font-sans relative rounded-2xl shadow-sm">
      {/* Hidden Media File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*,video/*,application/pdf,audio/*"
        className="hidden"
      />

      {/* Edit Contact Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveContact}
            className="bg-white border border-zinc-200 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-zinc-900"
          >
            <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
              <h3 className="font-bold text-sm text-zinc-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-zinc-700">edit</span>
                <span>Edit Lead / Contact Details</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-zinc-400 hover:text-zinc-900 p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 uppercase font-bold block">
                  Contact Full Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Kalyan Kumar"
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-zinc-900 text-zinc-900 font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 uppercase font-bold block">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+91 93908 34107"
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-zinc-900 text-zinc-900 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 bg-zinc-100 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-700 hover:bg-zinc-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingContact}
                className="px-4 py-2 bg-zinc-900 text-white font-bold text-xs rounded-xl shadow-xs hover:bg-zinc-800 disabled:opacity-50 cursor-pointer"
              >
                {savingContact ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Contact Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-zinc-900">
            <div className="flex items-center gap-3 text-red-600 border-b border-zinc-100 pb-3">
              <span className="material-symbols-outlined text-2xl">warning</span>
              <h3 className="font-bold text-base text-zinc-900">Delete WhatsApp Chat Session?</h3>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-zinc-900">{activeChat.name} ({activeChat.phone})</strong>?
              This will remove the chat history, voice notes, and CRM records.
            </p>

            <div className="flex justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-zinc-100 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-700 hover:bg-zinc-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteContact}
                disabled={deletingContact}
                className="px-4 py-2 bg-red-600 text-white font-bold text-xs rounded-xl shadow-xs hover:bg-red-700 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
                <span>{deletingContact ? 'Deleting...' : 'Delete Chat'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Web Split Pane Layout */}
      <div className="flex-1 flex overflow-hidden w-full h-full">
        
        {/* COLUMN 1: WhatsApp Chats List (Left 360px) */}
        <section className="w-80 md:w-96 border-r border-zinc-200 bg-white flex flex-col shrink-0">
          {/* WhatsApp Web Left Header */}
          <div className="px-4 py-3 bg-[#f0f2f5] border-b border-zinc-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-zinc-800 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                MS
              </div>
              <span className="text-xs font-bold text-zinc-800 tracking-tight">WhatsApp Business</span>
            </div>
            <div className="flex items-center gap-1 text-zinc-600">
              <button className="p-1.5 hover:bg-zinc-200/80 rounded-full transition-colors cursor-pointer" title="Status">
                <span className="material-symbols-outlined text-lg">donut_large</span>
              </button>
              <button className="p-1.5 hover:bg-zinc-200/80 rounded-full transition-colors cursor-pointer" title="New Chat">
                <span className="material-symbols-outlined text-lg">chat</span>
              </button>
              <button className="p-1.5 hover:bg-zinc-200/80 rounded-full transition-colors cursor-pointer" title="Menu">
                <span className="material-symbols-outlined text-lg">more_vert</span>
              </button>
            </div>
          </div>

          {/* Search Bar & Filter Chips */}
          <div className="p-2.5 bg-white border-b border-zinc-100 space-y-2">
            <div className="relative">
              <input
                id="chat-search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#f0f2f5] border-none rounded-lg py-1.5 pl-9 pr-4 text-xs text-zinc-900 placeholder:text-zinc-500 outline-none focus:bg-white focus:ring-1 focus:ring-zinc-300 transition-all"
                placeholder="Search or start new chat"
                type="text"
              />
              <span className="material-symbols-outlined absolute left-2.5 top-2 text-zinc-500 text-sm">search</span>
            </div>

            {/* WhatsApp Filter Chips */}
            <div className="flex items-center gap-1.5 pt-0.5">
              <button
                onClick={() => setChatFilter('all')}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                  chatFilter === 'all'
                    ? 'bg-[#e7fce3] text-[#008069] font-bold'
                    : 'bg-[#f0f2f5] text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setChatFilter('unread')}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                  chatFilter === 'unread'
                    ? 'bg-[#e7fce3] text-[#008069] font-bold'
                    : 'bg-[#f0f2f5] text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                Unread
              </button>
              <button
                onClick={() => setChatFilter('favorites')}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                  chatFilter === 'favorites'
                    ? 'bg-[#e7fce3] text-[#008069] font-bold'
                    : 'bg-[#f0f2f5] text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                AI Handover
              </button>
            </div>
          </div>

          {/* Chat List Items */}
          <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-zinc-100" id="chat-list">
            {loadingChats ? (
              <div className="p-8 text-center text-zinc-400 text-xs">Loading WhatsApp sessions...</div>
            ) : filteredChats.length === 0 ? (
              <div className="p-8 text-center text-zinc-400 text-xs">No chats found.</div>
            ) : (
              filteredChats.map((c) => {
                const isSelected = c.id === activeId || c.jid === activeId;
                return (
                  <div
                    key={c.id}
                    onClick={() => setActiveId(c.id)}
                    className={`px-3.5 py-3 cursor-pointer flex items-center gap-3 transition-colors ${
                      isSelected ? 'bg-[#f0f2f5]' : 'hover:bg-[#f5f6f6]'
                    }`}
                  >
                    {/* Circle Avatar */}
                    <div className="w-11 h-11 rounded-full bg-zinc-200 text-zinc-700 font-bold text-xs flex items-center justify-center shrink-0">
                      {c.avatar || c.name.slice(0, 2).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-bold text-xs text-zinc-900 truncate">{c.name}</span>
                        <span className="text-[10px] text-zinc-400 shrink-0 font-mono">{c.time}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="material-symbols-outlined text-[13px] text-[#53bdeb] shrink-0">done_all</span>
                          <p className="text-[11px] text-zinc-500 truncate">{c.lastMsg}</p>
                        </div>
                        {c.aiActive && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="AI Voice Agent Active"></span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* COLUMN 2: True WhatsApp Chat Thread (Center) */}
        <section className="flex-1 min-w-0 flex flex-col bg-[#efeae2] relative">
          
          {/* WhatsApp Web Chat Header */}
          <div className="px-4 py-2.5 bg-[#f0f2f5] border-b border-zinc-200 flex justify-between items-center shrink-0 z-10">
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => setShowContactInfo((o) => !o)}
            >
              <div className="w-10 h-10 rounded-full bg-zinc-300 text-zinc-800 font-bold text-xs flex items-center justify-center shadow-xs">
                {activeChat.avatar || activeChat.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-xs font-bold text-zinc-900 tracking-tight" id="chat-header-name">
                  {activeChat.name}
                </h3>
                <p className="text-[11px] text-zinc-500 flex items-center gap-1.5" id="chat-header-status">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>online • {activeChat.phone}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-zinc-600">
              {/* AI Auto-Reply Toggle Pill */}
              <button
                id="chat-ai-toggle"
                onClick={handleToggleAi}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                  activeChat.aiActive
                    ? 'bg-[#e7fce3] text-[#008069] border border-[#a2f0bc]'
                    : 'bg-zinc-200 text-zinc-700 border border-zinc-300'
                }`}
                title="Toggle AI Sales Agent"
              >
                <span className="material-symbols-outlined text-sm">smart_toy</span>
                <span id="chat-ai-toggle-text">{activeChat.aiActive ? 'AI Bot Active' : 'Human Handover'}</span>
              </button>

              <button
                type="button"
                onClick={() => alert(`Calling ${activeChat.name} via WhatsApp Voice Gateway (<120ms)...`)}
                className="p-2 hover:bg-zinc-200/80 rounded-full transition-colors cursor-pointer"
                title="WhatsApp Voice Call"
              >
                <span className="material-symbols-outlined text-lg">call</span>
              </button>

              <button
                type="button"
                onClick={() => setShowContactInfo((o) => !o)}
                className="p-2 hover:bg-zinc-200/80 rounded-full transition-colors cursor-pointer"
                title="Contact Info"
              >
                <span className="material-symbols-outlined text-lg">info</span>
              </button>
            </div>
          </div>

          {/* WhatsApp Chat Wallpaper Thread with Doodle Pattern */}
          <div
            id="chat-messages"
            className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 custom-scrollbar flex flex-col"
            style={{
              backgroundColor: '#efeae2',
              backgroundImage: 'radial-gradient(#d5ceb8 0.75px, transparent 0.75px)',
              backgroundSize: '16px 16px',
            }}
          >
            {/* End-to-End Encryption Banner */}
            <div className="bg-[#ffeecd] border border-[#f5db99] text-[#54656f] text-[10px] rounded-lg px-3 py-1.5 max-w-sm mx-auto text-center flex items-center justify-center gap-1.5 shadow-2xs shrink-0">
              <span className="material-symbols-outlined text-[13px] text-[#54656f]">lock</span>
              <span>Messages are end-to-end encrypted. AI Voice Agent &amp; CRM synced.</span>
            </div>

            {/* Date Pill Separator */}
            <div className="flex justify-center shrink-0">
              <span className="bg-white/90 text-zinc-600 text-[10px] font-bold px-3 py-1 rounded-md shadow-2xs uppercase tracking-wider">
                TODAY
              </span>
            </div>

            {loadingMessages ? (
              <div className="m-auto text-center text-xs text-zinc-500">Loading conversation history...</div>
            ) : messages.length === 0 ? (
              <div className="m-auto text-center text-zinc-500 max-w-xs">
                <span className="material-symbols-outlined text-4xl block mb-2 text-zinc-400">forum</span>
                No messages yet. Send a message or dispatch an automated AI proposal.
              </div>
            ) : (
              messages.map((m, idx) => {
                const isPatient = m.sender === 'patient';
                return (
                  <div key={idx} className={`flex flex-col ${isPatient ? 'items-start' : 'items-end'}`}>
                    <div
                      className={`max-w-[75%] p-2.5 rounded-lg text-xs leading-relaxed space-y-1 shadow-2xs relative ${
                        isPatient
                          ? 'bg-white text-zinc-900 rounded-tl-none'
                          : 'bg-[#d9fdd3] text-zinc-900 rounded-tr-none'
                      }`}
                    >
                      {/* Sender label */}
                      <div className="flex items-center justify-between gap-3 text-[9px] font-bold text-zinc-500">
                        <span>{isPatient ? m.sender : m.sender === 'bot' ? '🤖 AI Sales Agent' : 'Account Executive'}</span>
                        {m.isAudio && <span className="bg-zinc-200/60 px-1 py-0.2 rounded text-[8px]">VOICE NOTE</span>}
                      </div>

                      {/* WhatsApp Audio Player UI */}
                      {m.isAudio && m.audioUrl && (
                        <div className="p-2 bg-white/70 rounded-lg space-y-1.5 border border-zinc-200/60">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-[#008069] text-white flex items-center justify-center shrink-0">
                              <span className="material-symbols-outlined text-base">play_arrow</span>
                            </div>
                            <div className="flex-1">
                              <div className="h-1 bg-zinc-300 rounded-full w-full relative overflow-hidden">
                                <div className="h-full bg-[#008069] w-1/3"></div>
                              </div>
                            </div>
                          </div>
                          {m.transcription && (
                            <p className="text-[11px] text-zinc-600 italic bg-white/90 p-2 rounded border border-zinc-100">
                              "{m.transcription}"
                            </p>
                          )}
                        </div>
                      )}

                      {/* Text Content */}
                      {!m.isAudio && (
                        <div className="text-zinc-900 text-xs whitespace-pre-wrap leading-relaxed">
                          {m.text}
                        </div>
                      )}

                      {/* Time & Double Blue Checks */}
                      <div className="flex items-center justify-end gap-1 text-[10px] text-zinc-400 font-mono pt-0.5">
                        <span>{m.time}</span>
                        {!isPatient && (
                          <span className="material-symbols-outlined text-[13px] text-[#53bdeb]">done_all</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Media File Attachment Banner */}
          {selectedFile && (
            <div className="px-4 py-2 bg-[#f0f2f5] border-t border-zinc-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-800 truncate">
                <span className="material-symbols-outlined text-base text-[#008069]">attach_file</span>
                <span>Attachment: {selectedFile.name}</span>
                <span className="text-[10px] text-zinc-500">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="text-zinc-500 hover:text-red-600 p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          )}

          {/* WhatsApp Bottom Input Bar */}
          <form onSubmit={handleSend} className="px-3 py-2 bg-[#f0f2f5] border-t border-zinc-200 flex items-center gap-2 shrink-0">
            {/* Emoji icon */}
            <button
              type="button"
              className="p-1.5 text-zinc-500 hover:text-zinc-800 rounded-full transition-colors cursor-pointer"
              title="Emoji"
            >
              <span className="material-symbols-outlined text-xl">sentiment_satisfied</span>
            </button>

            {/* Paperclip attachment icon */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 text-zinc-500 hover:text-zinc-800 rounded-full transition-colors cursor-pointer"
              title="Attach Document or Media"
            >
              <span className="material-symbols-outlined text-xl">attach_file</span>
            </button>

            {/* Pill Text Input */}
            <div className="flex-1 bg-white rounded-lg flex items-center px-3 py-1.5 shadow-2xs border border-transparent focus-within:border-zinc-300">
              <input
                id="chat-input-textarea"
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  isRecording
                    ? 'Recording PTT voice note...'
                    : selectedFile
                    ? 'Add proposal caption...'
                    : 'Type a message'
                }
                className="w-full bg-transparent border-none outline-none text-xs text-zinc-900 placeholder:text-zinc-500"
                disabled={isRecording}
              />
              {isRecording && (
                <span className="text-xs font-mono font-bold text-red-600 animate-pulse ml-2 shrink-0">
                  00:{recordingSeconds < 10 ? '0' : ''}{recordingSeconds}
                </span>
              )}
            </div>

            {/* Microphone or Send Button */}
            {inputText.trim() || selectedFile ? (
              <button
                type="submit"
                id="btn-send-message"
                disabled={sending}
                className="w-9 h-9 rounded-full bg-[#008069] hover:bg-[#01705c] text-white flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-2xs"
                title="Send Message"
              >
                <span className="material-symbols-outlined text-base">send</span>
              </button>
            ) : (
              <button
                type="button"
                id="btn-record-voicenote"
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                  isRecording
                    ? 'bg-red-600 text-white animate-pulse'
                    : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200/80'
                }`}
                title={isRecording ? 'Stop Recording' : 'Record Voice Note'}
              >
                <span className="material-symbols-outlined text-xl">{isRecording ? 'stop' : 'mic'}</span>
              </button>
            )}
          </form>
        </section>

        {/* COLUMN 3: WhatsApp "Contact Info" Drawer (Right 340px) */}
        {showContactInfo && (
          <section className="w-[340px] bg-[#f0f2f5] border-l border-zinc-200 overflow-y-auto custom-scrollbar flex flex-col shrink-0">
            {/* Header */}
            <div className="px-4 py-3.5 bg-white border-b border-zinc-200 flex items-center justify-between shrink-0">
              <span className="text-xs font-bold text-zinc-800">Contact info</span>
              <button
                onClick={() => setShowContactInfo(false)}
                className="p-1 text-zinc-400 hover:text-zinc-700 rounded-full cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Avatar & Profile Card */}
            <div className="p-6 bg-white border-b border-zinc-200 text-center space-y-3 shadow-2xs">
              <div
                id="profile-avatar"
                className="w-24 h-24 rounded-full mx-auto bg-zinc-200 text-zinc-800 font-bold text-2xl flex items-center justify-center shadow-xs"
              >
                {activeChat.avatar || activeChat.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-sm text-zinc-900 tracking-tight" id="profile-name">
                  {activeChat.name}
                </h3>
                <p className="text-xs text-zinc-500 font-mono mt-0.5" id="profile-phone">
                  {activeChat.phone}
                </p>
              </div>

              <div className="flex justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleOpenEditModal}
                  className="px-3 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">edit</span>
                  <span>Edit</span>
                </button>
              </div>
            </div>

            {/* About / Status */}
            <div className="p-4 bg-white border-b border-zinc-200 space-y-1">
              <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block">About</span>
              <p className="text-xs text-zinc-800 font-medium">Enterprise AI Sales &amp; Custom LLM Inquiries</p>
            </div>

            {/* AI Sales CRM Telemetry */}
            <div className="p-4 bg-white border-b border-zinc-200 space-y-3">
              <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block">Sales Intelligence</span>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-zinc-50 border border-zinc-100 rounded-lg">
                  <span className="text-[9px] text-zinc-400 uppercase block font-bold">Intent Score</span>
                  <span className="font-mono font-bold text-emerald-700 text-xs">{activeChat.bmi ? `${activeChat.bmi}%` : '94%'}</span>
                </div>
                <div className="p-2.5 bg-zinc-50 border border-zinc-100 rounded-lg">
                  <span className="text-[9px] text-zinc-400 uppercase block font-bold">Deal Stage</span>
                  <span className="font-semibold text-zinc-800 text-xs truncate block">{activeChat.status || 'Qualified'}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => alert(`Lead ${activeChat.name} assigned to Enterprise Account Executive for closing.`)}
                className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">headset_mic</span>
                <span>Assign to AE</span>
              </button>
            </div>

            {/* Actions: Delete Lead */}
            <div className="p-4 bg-white mt-auto space-y-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-rose-200"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
                <span>Delete Chat &amp; Lead</span>
              </button>
            </div>
          </section>
        )}

      </div>
    </main>
  );
}
