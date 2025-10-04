"use client";

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import gsap from "gsap";
import EmojiPicker from "emoji-picker-react";
import Confetti from "react-confetti";
import confetti from "canvas-confetti";
import GifPicker from "gif-picker-react";
import { MentionsInput, Mention } from "react-mentions";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import ThemeToggle from "./ThemeToggle";
import toast, { Toaster } from "react-hot-toast";
import VideoCall from "./VideoCall";
import IncomingCallModal from "./IncomingCallModal";

const mentionsInputStyles = `
  .mentions-input {
    width: 100%;
    
  }
  
  .mentions-input__control {
    font-size: 14px;
    min-height: 55px;
  }
  
  .mentions-input__input {
    padding: 15px 16px !important;
    border: 1px solid #e5e7eb !important;
    border-radius: 9999px !important;
    outline: none !important;
    font-size: 14px !important;
    line-height: 1.5 !important;
  }
  
  .mentions-input__highlighter {
    padding: 10px 16px !important;
    border: 1px solid transparent !important;
    border-radius: 9999px !important;
  }
  
  .mentions-input__suggestions {
    background-color: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    max-height: 200px;
    overflow: auto;
    font-size: 14px;
  }
  
  .mentions-input__suggestions__item {
    padding: 8px 12px;
    border-bottom: 1px solid #f3f4f6;
    cursor: pointer;
    font-size: 14px;
  }
  
  .mentions-input__suggestions__item--focused {
    background-color: #eff6ff;
  }
  
  .mention-suggestion {
    padding: 8px 12px;
    font-size: 14px;
  }
  
  .mention-suggestion.focused {
    background-color: #eff6ff;
  }

  .dark .mentions-input__input {
    background-color: #27272A !important;
    border: 1px solid #4b5563 !important;
    color: #fff !important;
  }

  .dark .mentions-input__highlighter {
    color: #fff !important;
  }

  .dark .mentions-input__suggestions {
    background-color: #374151;
    border: 1px solid #4b5563;
  }

  .dark .mentions-input__suggestions__item {
    color: #fff;
    border-bottom: 1px solid #4b5563;
  }

  .dark .mentions-input__suggestions__item--focused {
    background-color: #27272A;
  }

  .dark .mention-suggestion.focused {
    background-color: #4b5563;
  }

  .react-datepicker-wrapper {
    width: 100%;
  }

  .react-datepicker__input-container input {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    outline: none;
  }

  .react-datepicker__input-container input:focus {
    border-color: #3b82f6;
    ring: 2px;
    ring-color: #93c5fd;
  }
`;

if (
  typeof document !== "undefined" &&
  !document.getElementById("mentions-styles")
) {
  const styleTag = document.createElement("style");
  styleTag.id = "mentions-styles";
  styleTag.innerHTML = mentionsInputStyles;
  document.head.appendChild(styleTag);
}

const API_URL = "https://howsapp.quantafile.com";
const TENOR_KEY = "AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ";
let socket = null;

const STICKERS = [
  "👍",
  "❤️",
  "😂",
  "😮",
  "😢",
  "🔥",
  "🎉",
  "👏",
  "🙏",
  "💯",
  "🎊",
  "✨",
  "💪",
  "🤝",
  "👌",
  "💡",
  "🚀",
  "⭐",
  "💖",
  "🌟",
];

const QUICK_REACTIONS = ["❤️", "😂", "😮", "😢", "🙏", "👍"];

const EMOTION_TRIGGERS = {
  congratulations: [
    "congratulations",
    "congrats",
    "congratulation",
    "well done",
    "great job",
  ],
  celebration: ["party", "celebrate", "yay", "woohoo", "hurray", "hooray"],
  love: ["love you", "i love you", "love u", "❤️", "💕", "💖"],
  success: ["success", "achieved", "won", "victory", "passed"],
  birthday: ["happy birthday", "birthday", "bday"],
};

export default function ChatApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });

  const [contacts, setContacts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [chatType, setChatType] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [editingMessage, setEditingMessage] = useState(null);
  const [darkMode, setDarkMode] = useState(false);

  const [replyingTo, setReplyingTo] = useState(null);
  const [showMessageInfo, setShowMessageInfo] = useState(false);
  const [selectedMessageInfo, setSelectedMessageInfo] = useState(null);
  const [showReactionsInfo, setShowReactionsInfo] = useState(false);
  const [selectedReactionsInfo, setSelectedReactionsInfo] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filePreview, setFilePreview] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [animationType, setAnimationType] = useState(null);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);
  const [showUserInfoModal, setShowUserInfoModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [selectedUserInfo, setSelectedUserInfo] = useState(null);
  const [showTaskDetailModal, setShowTaskDetailModal] = useState(false);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState(null);

  const [tasks, setTasks] = useState([]);
  const [polls, setPolls] = useState([]);
  const [taskForm, setTaskForm] = useState({
    taskName: "",
    description: "",
    assignedTo: "",
    deadline: new Date(),
  });
  const [pollForm, setPollForm] = useState({
    question: "",
    options: ["", ""],
    expiresIn: 24,
  });

  const [profileForm, setProfileForm] = useState({
    username: "",
    bio: "",
    about: "",
    avatar: "",
  });
  const [usernameInput, setUsernameInput] = useState("");
  const [groupForm, setGroupForm] = useState({
    name: "",
    description: "",
    avatar: "",
    memberIds: [],
  });
  const [linkForm, setLinkForm] = useState({ title: "", url: "" });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingGroupAvatar, setUploadingGroupAvatar] = useState(false);

  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [newMessagesCount, setNewMessagesCount] = useState(0);

  const [sidebarSearchQuery, setSidebarSearchQuery] = useState("");
  const [messageSearchQuery, setMessageSearchQuery] = useState("");
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchingMessages, setSearchingMessages] = useState(false);

  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [documentForm, setDocumentForm] = useState({ description: "" });
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [documentSearchQuery, setDocumentSearchQuery] = useState("");
  const [searchingDocuments, setSearchingDocuments] = useState(false);
  const [documentSearchResults, setDocumentSearchResults] = useState([]);

  const [taskReminders, setTaskReminders] = useState([]);
  const [dismissedReminders, setDismissedReminders] = useState(new Set());
  const [myTasks, setMyTasks] = useState([]);
  const [isUserBlocked, setIsUserBlocked] = useState(false);

  // ==========================================
  // VIDEO CALL STATES - NEW
  // ==========================================
  const [inCall, setInCall] = useState(false);
  const [callData, setCallData] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [showIncomingCallModal, setShowIncomingCallModal] = useState(false);

  const messagesEndRef = useRef(null);
  const messageContainerRef = useRef(null);
  const chatInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const avatarInputRef = useRef(null);
  const groupAvatarInputRef = useRef(null);
  const documentInputRef = useRef(null);
  const sidebarRef = useRef(null);
  const socketInitialized = useRef(false);
  const taskCreationInProgress = useRef(false);
  const messageRefs = useRef({});
  const messagesTopRef = useRef(null);

  const mentionStyle = {
    control: {
      fontSize: 14,
      fontWeight: "normal",
    },
    highlighter: {
      overflow: "hidden",
      padding: "10px 16px",
      border: "1px solid transparent",
    },
    input: {
      margin: 0,
      padding: "10px 16px",
      border: "1px solid #e5e7eb",
      borderRadius: "9999px",
      outline: "none",
      fontSize: "14px",
      lineHeight: "1.5",
    },
    "&multiLine": {
      control: {
        minHeight: 42,
      },
      highlighter: {
        padding: "10px 16px",
        border: "1px solid transparent",
      },
      input: {
        padding: "10px 16px",
        border: "1px solid #e5e7eb",
        borderRadius: "9999px",
        outline: "none",
        fontSize: "14px",
        lineHeight: "1.5",
      },
    },
    suggestions: {
      list: {
        backgroundColor: "white",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
        maxHeight: "200px",
        overflow: "auto",
        fontSize: "14px",
      },
      item: {
        padding: "8px 12px",
        borderBottom: "1px solid #f3f4f6",
        fontSize: "14px",
        "&focused": {
          backgroundColor: "#eff6ff",
        },
      },
    },
  };

  const mentionStyleDark = {
    control: {
      fontSize: 14,
      fontWeight: "normal",
    },
    highlighter: {
      overflow: "hidden",
      padding: "10px 16px",
      border: "1px solid transparent",
    },
    input: {
      margin: 0,
      padding: "10px 16px",
      backgroundColor: "#374151",
      border: "1px solid #4b5563",
      borderRadius: "9999px",
      outline: "none",
      color: "#fff",
      fontSize: "14px",
      lineHeight: "1.5",
    },
    "&multiLine": {
      control: {
        minHeight: 42,
      },
      highlighter: {
        padding: "10px 16px",
        border: "1px solid transparent",
      },
      input: {
        padding: "10px 16px",
        backgroundColor: "#374151",
        border: "1px solid #4b5563",
        borderRadius: "9999px",
        outline: "none",
        color: "#fff",
        fontSize: "14px",
        lineHeight: "1.5",
      },
    },
    suggestions: {
      list: {
        backgroundColor: "#374151",
        border: "1px solid #4b5563",
        borderRadius: "8px",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
        maxHeight: "200px",
        overflow: "auto",
        fontSize: "14px",
      },
      item: {
        padding: "8px 12px",
        borderBottom: "1px solid #4b5563",
        color: "#fff",
        fontSize: "14px",
        "&focused": {
          backgroundColor: "#4b5563",
        },
      },
    },
  };

  
  useEffect(() => {
    if (!socketInitialized.current) {
      socket = io("https://howsapp.quantafile.com", {
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });
      socketInitialized.current = true;
    }

    return () => {
      if (socket && socketInitialized.current) {
        socket.disconnect();
        socketInitialized.current = false;
      }
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    const savedDarkMode = localStorage.getItem("darkMode") === "true";

    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add("dark");
    }

    if (token && user) {
      setIsAuthenticated(true);
      setCurrentUser(JSON.parse(user));
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      fetchContacts();
      fetchGroups();
      fetchUnreadCounts();
      fetchTaskReminders();

      if (socket) {
        socket.emit("userOnline", JSON.parse(user).id);
      }
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      const interval = setInterval(() => {
        fetchTaskReminders();
      }, 5 * 60 * 1000);

      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // ==========================================
  // VIDEO CALL SOCKET LISTENERS - NEW
  // ==========================================
  useEffect(() => {
    if (!socket || !isAuthenticated) return;

    const handleIncomingCall = (data) => {
      console.log("Incoming call:", data);
      setIncomingCall(data);
      setShowIncomingCallModal(true);

      // Play ringtone
      const audio = new Audio("/ringtone.mp3");
      audio.loop = true;
      audio.play().catch((e) => console.log("Audio play failed:", e));

      toast(
        (t) => (
          <div className="flex items-center space-x-3">
            <img
              src={data.caller.avatar}
              alt={data.caller.username}
              className="w-10 h-10 rounded-full"
            />
            <div>
              <p className="font-semibold">
                {data.isGroup ? data.groupName : data.caller.username}
              </p>
              <p className="text-sm text-gray-500">
                {data.callType === "video" ? "📹 Video" : "📞 Voice"} call
                incoming...
              </p>
            </div>
          </div>
        ),
        { duration: 30000 }
      );
    };

    const handleCallEnded = ({ roomId, endedBy }) => {
      console.log("Call ended:", roomId);
      setInCall(false);
      setCallData(null);
      toast.info("Call ended");
    };

    socket.on("incomingCall", handleIncomingCall);
    socket.on("callEnded", handleCallEnded);

    return () => {
      socket.off("incomingCall", handleIncomingCall);
      socket.off("callEnded", handleCallEnded);
    };
  }, [socket, isAuthenticated]);

  // Socket listeners for messaging
  useEffect(() => {
    if (!socket || !isAuthenticated) return;

    const handleReceiveMessage = (message) => {
      const isCurrentChat =
        selectedChat &&
        ((chatType === "user" &&
          message.group === null &&
          (message.sender._id === selectedChat._id ||
            message.receiver?._id === selectedChat._id)) ||
          (chatType === "group" && message.group === selectedChat._id));

      if (isCurrentChat) {
        setMessages((prev) => {
          const exists = prev.find((m) => m._id === message._id);
          if (exists) return prev;

          detectEmotion(message.content);
          setNewMessagesCount((prev) => prev + 1);

          return [...prev, message];
        });

        markMessagesAsRead([message._id]);
      } else {
        fetchUnreadCounts();
      }
    };

    const handleMessageSent = (message) => {
      setMessages((prev) => {
        const tempIndex = prev.findIndex(
          (m) => m._id && m._id.toString().startsWith("temp-")
        );
        if (tempIndex !== -1) {
          const newMessages = [...prev];
          newMessages[tempIndex] = message;
          return newMessages;
        }
        const exists = prev.find((m) => m._id === message._id);
        if (exists) return prev;

        detectEmotion(message.content);

        return [...prev, message];
      });
    };

    const handleMessageEdited = (message) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === message._id ? message : m))
      );
    };

    const handleMessageDeleted = ({ messageId }) => {
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    };

    const handleMessageReacted = (message) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === message._id ? message : m))
      );
    };

    const handleMessagePinned = ({ messageId, isPinned }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, isPinned } : m))
      );
    };

    const handleUserTyping = ({ userId, group }) => {
      if (selectedChat) {
        if (
          (chatType === "user" && userId === selectedChat._id) ||
          (chatType === "group" && group === selectedChat._id)
        ) {
          setIsTyping(true);
        }
      }
    };

    const handleUserStoppedTyping = ({ userId, group }) => {
      if (selectedChat) {
        if (
          (chatType === "user" && userId === selectedChat._id) ||
          (chatType === "group" && group === selectedChat._id)
        ) {
          setIsTyping(false);
        }
      }
    };

    const handleMessagesRead = ({ messageIds }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          messageIds.includes(msg._id) ? { ...msg, status: "read" } : msg
        )
      );
    };

    const handleUserStatusChanged = ({ userId, isOnline }) => {
      setContacts((prev) =>
        prev.map((user) => (user._id === userId ? { ...user, isOnline } : user))
      );
      if (selectedChat && chatType === "user" && selectedChat._id === userId) {
        setSelectedChat((prev) => ({ ...prev, isOnline }));
      }
    };

    const handlePollUpdated = (updatedPoll) => {
      setPolls((prev) =>
        prev.map((p) => (p._id === updatedPoll._id ? updatedPoll : p))
      );

      setMessages((prev) =>
        prev.map((msg) => {
          if (
            msg.messageType === "poll" &&
            msg.pollData?.pollId?._id === updatedPoll._id
          ) {
            return {
              ...msg,
              pollData: {
                ...msg.pollData,
                pollId: updatedPoll,
              },
            };
          }
          return msg;
        })
      );
    };

    socket.on("receiveMessage", handleReceiveMessage);
    socket.on("messageSent", handleMessageSent);
    socket.on("messageEdited", handleMessageEdited);
    socket.on("messageDeleted", handleMessageDeleted);
    socket.on("messageReacted", handleMessageReacted);
    socket.on("messagePinned", handleMessagePinned);
    socket.on("userTyping", handleUserTyping);
    socket.on("userStoppedTyping", handleUserStoppedTyping);
    socket.on("messagesRead", handleMessagesRead);
    socket.on("userStatusChanged", handleUserStatusChanged);
    socket.on("pollUpdated", handlePollUpdated);

    return () => {
      socket.off("receiveMessage", handleReceiveMessage);
      socket.off("messageSent", handleMessageSent);
      socket.off("messageEdited", handleMessageEdited);
      socket.off("messageDeleted", handleMessageDeleted);
      socket.off("messageReacted", handleMessageReacted);
      socket.off("messagePinned", handleMessagePinned);
      socket.off("userTyping", handleUserTyping);
      socket.off("userStoppedTyping", handleUserStoppedTyping);
      socket.off("messagesRead", handleMessagesRead);
      socket.off("userStatusChanged", handleUserStatusChanged);
      socket.off("pollUpdated", handlePollUpdated);
    };
  }, [selectedChat, chatType, isAuthenticated]);

  useEffect(() => {
    if (messageContainerRef.current) {
      const children = Array.from(messageContainerRef.current.children);
      if (children.length > 0) {
        gsap.fromTo(
          children[children.length - 1],
          { opacity: 0, y: 20, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: "back.out(1.5)" }
        );
      }
    }
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (showConfetti) {
      const timer = setTimeout(() => {
        setShowConfetti(false);
        setAnimationType(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showConfetti]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToMessage = (messageId) => {
    const messageElement = messageRefs.current[messageId];
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: "smooth", block: "center" });
      messageElement.style.backgroundColor = darkMode
        ? "rgba(59, 130, 246, 0.2)"
        : "rgba(59, 130, 246, 0.1)";
      setTimeout(() => {
        messageElement.style.backgroundColor = "";
      }, 2000);
    }
  };

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem("darkMode", newDarkMode);
    if (newDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleLogout = () => {
    if (confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (socket) {
        socket.emit("userOffline", currentUser.id);
        socket.disconnect();
      }
      setIsAuthenticated(false);
      setCurrentUser(null);
      setSelectedChat(null);
      setMessages([]);
      setContacts([]);
      setGroups([]);
      toast.success("Logged out successfully");
    }
  };

  const detectEmotion = (text) => {
    if (!text) return;

    const lowerText = text.toLowerCase();

    for (const [emotion, keywords] of Object.entries(EMOTION_TRIGGERS)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          triggerAnimation(emotion);
          return;
        }
      }
    }
  };

  const triggerAnimation = (type) => {
    setAnimationType(type);

    switch (type) {
      case "congratulations":
      case "celebration":
      case "success":
        setShowConfetti(true);
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
        break;

      case "birthday":
        setShowConfetti(true);
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const colors = ["#bb0000", "#ffffff", "#00bb00"];

        (function frame() {
          confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: colors,
          });
          confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: colors,
          });

          if (Date.now() < animationEnd) {
            requestAnimationFrame(frame);
          }
        })();
        break;

      case "love":
        const heart = confetti.shapeFromText({ text: "❤️", scalar: 2 });
        confetti({
          particleCount: 50,
          spread: 100,
          shapes: [heart],
          scalar: 2,
        });
        break;
    }
  };

  const fetchContacts = async () => {
    try {
      const response = await axios.get(`${API_URL}/users/contacts`);
      setContacts(response.data);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      toast.error("Failed to fetch contacts");
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await axios.get(`${API_URL}/groups`);
      setGroups(response.data);
    } catch (error) {
      console.error("Error fetching groups:", error);
      toast.error("Failed to fetch groups");
    }
  };

  const fetchUnreadCounts = async () => {
    try {
      const response = await axios.get(`${API_URL}/messages/unread/count`);
      const counts = {};

      if (response.data.userChats) {
        response.data.userChats.forEach((item) => {
          counts[item._id] = item.count;
        });
      }

      if (response.data.groupChats) {
        response.data.groupChats.forEach((item) => {
          counts[item._id] = item.count;
        });
      }

      setUnreadCounts(counts);
    } catch (error) {
      console.error("Error fetching unread counts:", error);
    }
  };

  const fetchTasks = async (groupId) => {
    try {
      const response = await axios.get(`${API_URL}/groups/${groupId}/tasks`);
      setTasks(response.data);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast.error("Failed to fetch tasks");
    }
  };

  const fetchMyTasks = async (groupId) => {
    try {
      const response = await axios.get(
        `${API_URL}/groups/${groupId}/tasks/my-tasks`
      );
      setMyTasks(response.data);
    } catch (error) {
      console.error("Error fetching my tasks:", error);
      toast.error("Failed to fetch your tasks");
    }
  };

  const fetchPolls = async (groupId) => {
    try {
      const response = await axios.get(`${API_URL}/groups/${groupId}/polls`);
      setPolls(response.data);
    } catch (error) {
      console.error("Error fetching polls:", error);
      toast.error("Failed to fetch polls");
    }
  };

  const fetchDocuments = async (groupId) => {
    try {
      const response = await axios.get(
        `${API_URL}/groups/${groupId}/documents`
      );
      setDocuments(response.data);
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast.error("Failed to fetch documents");
    }
  };

  const fetchTaskReminders = async () => {
    try {
      const response = await axios.get(`${API_URL}/tasks/reminders`);
      const reminders = response.data.filter(
        (r) => !dismissedReminders.has(r.taskId)
      );
      setTaskReminders(reminders);

      reminders.forEach((reminder) => {
        if (
          reminder.urgency === "critical" &&
          !dismissedReminders.has(reminder.taskId)
        ) {
          toast.error(reminder.message, {
            duration: 10000,
            icon: "⚠️",
          });
        } else if (
          reminder.urgency === "warning" &&
          !dismissedReminders.has(reminder.taskId)
        ) {
          toast(reminder.message, {
            duration: 8000,
            icon: "⏰",
          });
        }
      });
    } catch (error) {
      console.error("Error fetching task reminders:", error);
    }
  };

  const dismissTaskReminder = (taskId) => {
    setDismissedReminders((prev) => new Set([...prev, taskId]));
    setTaskReminders((prev) => prev.filter((r) => r.taskId !== taskId));
  };

  const loadOlderMessages = async () => {
    if (loadingOlderMessages || !hasMoreMessages || !selectedChat) return;

    setLoadingOlderMessages(true);

    try {
      const oldestMessage = messages[0];
      const beforeTimestamp = oldestMessage?.timestamp;

      const endpoint =
        chatType === "group"
          ? `${API_URL}/messages/group/${selectedChat._id}?limit=20&before=${beforeTimestamp}`
          : `${API_URL}/messages/${selectedChat._id}?limit=20&before=${beforeTimestamp}`;

      const response = await axios.get(endpoint);

      if (response.data.length === 0) {
        setHasMoreMessages(false);
      } else {
        setMessages((prev) => [...response.data, ...prev]);
      }
    } catch (error) {
      console.error("Error loading older messages:", error);
      toast.error("Failed to load older messages");
    } finally {
      setLoadingOlderMessages(false);
    }
  };

  const handleMessageScroll = (e) => {
    const { scrollTop } = e.target;

    if (scrollTop < 100 && !loadingOlderMessages) {
      loadOlderMessages();
    }

    const { scrollHeight, clientHeight } = e.target;
    if (scrollTop + clientHeight >= scrollHeight - 50) {
      setNewMessagesCount(0);
    }
  };

  const searchMessages = async () => {
    if (!messageSearchQuery.trim() || !selectedChat) return;

    setSearchingMessages(true);

    try {
      const endpoint =
        chatType === "group"
          ? `${API_URL}/messages/group/${
              selectedChat._id
            }/search?query=${encodeURIComponent(messageSearchQuery)}`
          : `${API_URL}/messages/${
              selectedChat._id
            }/search?query=${encodeURIComponent(messageSearchQuery)}`;

      const response = await axios.get(endpoint);
      setSearchResults(response.data);
    } catch (error) {
      console.error("Error searching messages:", error);
      toast.error("Failed to search messages");
    } finally {
      setSearchingMessages(false);
    }
  };

  const searchDocuments = async () => {
    if (!documentSearchQuery.trim() || !selectedChat) return;

    setSearchingDocuments(true);

    try {
      const response = await axios.get(
        `${API_URL}/groups/${
          selectedChat._id
        }/documents/search?query=${encodeURIComponent(documentSearchQuery)}`
      );
      setDocumentSearchResults(response.data);
    } catch (error) {
      console.error("Error searching documents:", error);
      toast.error("Failed to search documents");
    } finally {
      setSearchingDocuments(false);
    }
  };

  const filteredContacts = contacts.filter(
    (user) =>
      user.username.toLowerCase().includes(sidebarSearchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(sidebarSearchQuery.toLowerCase())
  );

  const filteredGroups = groups.filter((group) =>
    group.name.toLowerCase().includes(sidebarSearchQuery.toLowerCase())
  );

    const handleAuth = async (e) => {
    e.preventDefault();
    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/signup';
      const response = await axios.post(`${API_URL}${endpoint}`, formData);

      // CRITICAL FIX: Ensure user object has both _id and id
      const userData = response.data.user;
      if (!userData.id && userData._id) {
        userData.id = userData._id;
      }
      if (!userData._id && userData.id) {
        userData._id = userData.id;
      }

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(userData));
      axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;

      setCurrentUser(userData);
      setIsAuthenticated(true);

      console.log('✅ User authenticated:', userData); // Debug log

      if (socket) {
        socket.emit('userOnline', userData.id);
      }

      fetchContacts();
      fetchGroups();
      fetchUnreadCounts();
      fetchTaskReminders();

      toast.success(isLogin ? 'Welcome back!' : 'Account created successfully!');
    } catch (error) {
      console.error('Auth error:', error);
      toast.error(error.response?.data?.error || 'Authentication failed');
    }
  };


  const selectChat = async (chat, type) => {
    setSelectedChat(chat);
    setChatType(type);
    setSidebarOpen(false);
    setNewMessagesCount(0);
    setHasMoreMessages(true);
    setMessageSearchQuery("");
    setSearchResults([]);
    setShowMessageSearch(false);

    if (type === "user") {
      try {
        const blockResponse = await axios.get(
          `${API_URL}/users/is-blocked/${chat._id}`
        );
        setIsUserBlocked(blockResponse.data.isBlocked);

        if (blockResponse.data.isBlockedByThem) {
          toast.error("This user has blocked you");
        } else if (blockResponse.data.isBlockedByMe) {
          toast.info("You have blocked this user");
        }
      } catch (error) {
        console.error("Error checking block status:", error);
      }
    }

    gsap.fromTo(
      ".chat-header",
      { y: -50, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.4, ease: "power2.out" }
    );

    try {
      const endpoint =
        type === "group"
          ? `${API_URL}/messages/group/${chat._id}`
          : `${API_URL}/messages/${chat._id}`;

      const response = await axios.get(endpoint);
      setMessages(response.data);

      if (type === "group") {
        fetchTasks(chat._id);
        fetchMyTasks(chat._id);
        fetchPolls(chat._id);
        fetchDocuments(chat._id);

        const unreadMessages = response.data
          .filter(
            (msg) =>
              msg.sender._id !== currentUser.id &&
              msg.sender !== currentUser.id &&
              !msg.readBy?.some(
                (r) =>
                  r.userId._id === currentUser.id || r.userId === currentUser.id
              )
          )
          .map((msg) => msg._id);

        if (unreadMessages.length > 0) {
          markMessagesAsRead(unreadMessages);
        }
      }

      if (type === "user") {
        const unreadMessages = response.data
          .filter(
            (msg) => msg.receiver === currentUser.id && msg.status !== "read"
          )
          .map((msg) => msg._id);

        if (unreadMessages.length > 0) {
          markMessagesAsRead(unreadMessages);
        }

        setUnreadCounts((prev) => {
          const newCounts = { ...prev };
          delete newCounts[chat._id];
          return newCounts;
        });
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("Failed to load messages");
    }
  };

  const markMessagesAsRead = (messageIds) => {
    if (socket) {
      socket.emit("messageRead", { messageIds, userId: currentUser.id });
    }
  };

  const handleInputChange = (e, newValue, newPlainTextValue, mentions) => {
    const value = newValue !== undefined ? newValue : e?.target?.value || "";
    setMessageInput(value);

    if (selectedChat && socket) {
      socket.emit("typing", {
        sender: currentUser.id,
        receiver: chatType === "user" ? selectedChat._id : null,
        group: chatType === "group" ? selectedChat._id : null,
      });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("stopTyping", {
          sender: currentUser.id,
          receiver: chatType === "user" ? selectedChat._id : null,
          group: chatType === "group" ? selectedChat._id : null,
        });
      }, 1000);
    }
  };

    const sendMessage = async (e, gifUrl = null, sticker = null) => {
    if (e) e.preventDefault();
    
    if (!messageInput.trim() && !gifUrl && !sticker) return;
    if (!selectedChat || isUserBlocked) return;

    // CRITICAL FIX: Ensure currentUser.id exists
    if (!currentUser || !currentUser.id) {
      console.error('❌ Current user ID is missing');
      toast.error('Unable to send message. Please refresh the page.');
      return;
    }

    let messageType = 'text';
    let content = messageInput.trim();

    if (gifUrl) {
      messageType = 'gif';
      content = gifUrl;
    } else if (sticker) {
      messageType = 'sticker';
      content = sticker;
    } else if (/^(https?:\/\/)/.test(content)) {
      messageType = 'link';
    }

    // CRITICAL FIX: Always include sender field
    const messageData = {
      sender: currentUser.id,  // ✅ FIXED: Ensure sender is always present
      receiver: chatType === 'user' ? selectedChat._id : null,
      group: chatType === 'group' ? selectedChat._id : null,
      content,
      messageType,
      replyTo: replyingTo?._id || null,
      timestamp: new Date()
    };

    // VALIDATION: Double-check sender exists before sending
    if (!messageData.sender) {
      console.error('❌ Sender field is missing in messageData');
      toast.error('Unable to send message. Please log in again.');
      return;
    }

    console.log('📤 Sending message:', messageData); // Debug log

    if (editingMessage) {
      try {
        await axios.put(`${API_URL}/messages/${editingMessage._id}`, { content });
        setEditingMessage(null);
        setMessageInput('');
        toast.success('Message updated');
      } catch (error) {
        console.error('Edit error:', error);
        toast.error('Failed to update message');
      }
      return;
    }

    // Create temporary message for optimistic UI
    const tempMessage = {
      _id: 'temp-' + Date.now(),
      ...messageData,
      sender: { 
        _id: currentUser.id, 
        username: currentUser.username, 
        avatar: currentUser.avatar 
      },
      receiver: chatType === 'user' ? selectedChat : null,
      status: 'sent',
      reactions: [],
      timestamp: new Date()
    };

    setMessages(prev => [...prev, tempMessage]);
    setMessageInput('');
    setReplyingTo(null);
    
    // Send via Socket.IO
    socket.emit('sendMessage', messageData);
    
    detectEmotion(content);
  };


  // ==========================================
  // VIDEO CALL FUNCTIONS - NEW
  // ==========================================

  const initiateCall = (callType) => {
    if (!selectedChat) return;

    const roomId = `room-${Date.now()}-${Math.random()
      .toString(36)
      .substring(7)}`;

    const callPayload = {
      callerId: currentUser.id,
      callType,
      roomId,
      isGroup: chatType === "group",
      groupId: chatType === "group" ? selectedChat._id : null,
      receiverId: chatType === "user" ? selectedChat._id : null,
    };

    socket.emit("initiateCall", callPayload);

    setCallData({
      roomId,
      callType,
      isGroup: chatType === "group",
      groupId: chatType === "group" ? selectedChat._id : null,
      groupName: chatType === "group" ? selectedChat.name : null,
      receiverInfo: chatType === "user" ? selectedChat : null,
    });
    setInCall(true);

    toast.success(`${callType === "video" ? "Video" : "Voice"} call initiated`);
  };

  const answerCall = () => {
    if (!incomingCall) return;

    setCallData({
      roomId: incomingCall.roomId,
      callType: incomingCall.callType,
      isGroup: incomingCall.isGroup,
      groupId: incomingCall.groupId,
      groupName: incomingCall.groupName,
      receiverInfo: !incomingCall.isGroup ? incomingCall.caller : null,
    });
    setInCall(true);
    setShowIncomingCallModal(false);
    setIncomingCall(null);
  };

  const rejectCall = () => {
    if (incomingCall) {
      socket.emit("endCall", {
        roomId: incomingCall.roomId,
        userId: currentUser.id,
      });
    }
    setShowIncomingCallModal(false);
    setIncomingCall(null);
    toast.info("Call rejected");
  };

  const endCall = () => {
    if (callData) {
      socket.emit("endCall", {
        roomId: callData.roomId,
        userId: currentUser.id,
      });
    }
    setInCall(false);
    setCallData(null);
  };

  // Continue with rest of handler functions...

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setFilePreview(event.target.result);
      setPreviewFile(file);
    };
    reader.readAsDataURL(file);
  };

    const confirmFileSend = async () => {
    if (!previewFile || !selectedChat) return;

    // CRITICAL FIX: Validate currentUser exists
    if (!currentUser || !currentUser.id) {
      toast.error('Unable to send file. Please refresh the page.');
      return;
    }

    setUploadingFile(true);

    try {
      const formData = new FormData();
      formData.append('file', previewFile);

      const uploadResponse = await axios.post(`${API_URL}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // CRITICAL FIX: Always include sender field
      const messageData = {
        sender: currentUser.id,  // ✅ FIXED
        receiver: chatType === 'user' ? selectedChat._id : null,
        group: chatType === 'group' ? selectedChat._id : null,
        content: '',
        messageType: uploadResponse.data.messageType,
        fileUrl: uploadResponse.data.fileUrl,
        fileName: uploadResponse.data.fileName,
        fileSize: uploadResponse.data.fileSize,
        timestamp: new Date()
      };

      // VALIDATION: Double-check sender exists
      if (!messageData.sender) {
        toast.error('Unable to send file. Please log in again.');
        setUploadingFile(false);
        return;
      }

      console.log('📤 Sending file message:', messageData); // Debug log

      const tempMessage = {
        _id: 'temp-' + Date.now(),
        ...messageData,
        sender: { 
          _id: currentUser.id, 
          username: currentUser.username, 
          avatar: currentUser.avatar 
        },
        receiver: chatType === 'user' ? selectedChat : null,
        status: 'sent',
        reactions: []
      };

      setMessages(prev => [...prev, tempMessage]);

      socket.emit('sendMessage', messageData);

      cancelFilePreview();
      toast.success('File sent successfully!');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploadingFile(false);
    }
  };


  const cancelFilePreview = () => {
    setFilePreview(null);
    setPreviewFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingAvatar(true);

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const response = await axios.post(`${API_URL}/users/avatar`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setCurrentUser((prev) => ({ ...prev, avatar: response.data.avatar }));
      setProfileForm((prev) => ({ ...prev, avatar: response.data.avatar }));
      localStorage.setItem("user", JSON.stringify(response.data.user));

      setUploadingAvatar(false);
      toast.success("Avatar updated successfully!");
    } catch (error) {
      console.error("Avatar upload error:", error);
      toast.error("Failed to upload avatar");
      setUploadingAvatar(false);
    }
  };

  const handleGroupAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedChat || chatType !== "group") return;

    setUploadingGroupAvatar(true);

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const response = await axios.post(
        `${API_URL}/groups/${selectedChat._id}/avatar`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      setSelectedChat((prev) => ({ ...prev, avatar: response.data.avatar }));
      await fetchGroups();

      setUploadingGroupAvatar(false);
      toast.success("Group avatar updated successfully!");
    } catch (error) {
      console.error("Group avatar upload error:", error);
      toast.error("Failed to upload group avatar");
      setUploadingGroupAvatar(false);
    }
  };

  const handleEmojiClick = (emojiData) => {
    setMessageInput((prev) => prev + emojiData.emoji);
    chatInputRef.current?.focus();
  };

  const handleReaction = async (messageId, emoji) => {
    try {
      await axios.post(`${API_URL}/messages/${messageId}/react`, { emoji });
      setShowReactionPicker(null);
    } catch (error) {
      console.error("Reaction error:", error);
      toast.error("Failed to react to message");
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!confirm("Delete this message?")) return;
    try {
      await axios.delete(`${API_URL}/messages/${messageId}`);
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
      toast.success("Message deleted");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete message");
    }
  };

  const handleEditMessage = (message) => {
    setEditingMessage(message);
    setMessageInput(message.content);
    setReplyingTo(null);
    chatInputRef.current?.focus();
  };

  const handlePinMessage = async (messageId) => {
    try {
      await axios.patch(`${API_URL}/messages/${messageId}/pin`);
      toast.success("Message pinned");
    } catch (error) {
      console.error("Pin error:", error);
      toast.error("Failed to pin message");
    }
  };

  const handleReplyToMessage = (message) => {
    setReplyingTo(message);
    setEditingMessage(null);
    chatInputRef.current?.focus();
  };

  const handleShowMessageInfo = async (message) => {
    try {
      const response = await axios.get(
        `${API_URL}/messages/${message._id}/info`
      );
      setSelectedMessageInfo(response.data);
      setShowMessageInfo(true);
    } catch (error) {
      console.error("Error fetching message info:", error);
      toast.error("Failed to load message info");
    }
  };

  const handleShowReactionsInfo = (message) => {
    setSelectedReactionsInfo(message.reactions);
    setShowReactionsInfo(true);
  };

  const handleAddContact = async () => {
    try {
      await axios.post(`${API_URL}/users/add-contact`, {
        username: usernameInput,
      });
      await fetchContacts();
      setShowAddContactModal(false);
      setUsernameInput("");
      toast.success("Contact added successfully!");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to add contact");
    }
  };

  const handleCreateGroup = async () => {
    try {
      await axios.post(`${API_URL}/groups`, groupForm);
      await fetchGroups();
      setShowCreateGroupModal(false);
      setGroupForm({ name: "", description: "", avatar: "", memberIds: [] });
      toast.success("Group created successfully!");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to create group");
    }
  };

  const handleDeleteGroup = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this group? This action cannot be undone."
      )
    )
      return;

    try {
      await axios.delete(`${API_URL}/groups/${selectedChat._id}`);
      setShowGroupInfoModal(false);
      setSelectedChat(null);
      setChatType(null);
      setMessages([]);
      await fetchGroups();
      toast.success("Group deleted successfully!");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to delete group");
    }
  };

  const handleUpdateProfile = async () => {
    try {
      const response = await axios.put(`${API_URL}/users/profile`, profileForm);
      setCurrentUser(response.data);
      localStorage.setItem("user", JSON.stringify(response.data));
      setShowProfileModal(false);
      toast.success("Profile updated successfully!");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to update profile");
    }
  };

  const handleShowUserInfo = async (userId) => {
    try {
      const response = await axios.get(`${API_URL}/users/${userId}/info`);
      setSelectedUserInfo(response.data);
      setShowUserInfoModal(true);
    } catch (error) {
      toast.error("Failed to load user info");
    }
  };

  const handleUnfriendUser = async (userId) => {
    if (!confirm("Remove this contact? You can add them again later.")) return;

    try {
      await axios.delete(`${API_URL}/users/contacts/${userId}`);
      await fetchContacts();
      setShowUserInfoModal(false);

      if (selectedChat && selectedChat._id === userId) {
        setSelectedChat(null);
        setChatType(null);
        setMessages([]);
      }

      toast.success("Contact removed successfully");
    } catch (error) {
      toast.error("Failed to remove contact");
    }
  };

  const handleBlockUser = async (userId) => {
    if (!confirm("Block this user? They will not be able to message you."))
      return;

    try {
      await axios.post(`${API_URL}/users/block/${userId}`);
      await fetchContacts();
      setShowUserInfoModal(false);
      setIsUserBlocked(true);

      if (selectedChat && selectedChat._id === userId) {
        setSelectedChat(null);
        setChatType(null);
        setMessages([]);
      }

      toast.success("User blocked successfully");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to block user");
    }
  };

  const handleUnblockUser = async (userId) => {
    try {
      await axios.delete(`${API_URL}/users/block/${userId}`);
      setIsUserBlocked(false);
      toast.success("User unblocked successfully");
    } catch (error) {
      toast.error("Failed to unblock user");
    }
  };

  const handlePromoteMember = async (memberId) => {
    try {
      await axios.patch(
        `${API_URL}/groups/${selectedChat._id}/members/${memberId}/promote`
      );
      const response = await axios.get(`${API_URL}/groups/${selectedChat._id}`);
      setSelectedChat(response.data);
      await fetchGroups();
      toast.success("Member promoted to admin");
    } catch (error) {
      toast.error("Failed to promote member");
    }
  };

  const handleDemoteMember = async (memberId) => {
    try {
      await axios.patch(
        `${API_URL}/groups/${selectedChat._id}/members/${memberId}/demote`
      );
      const response = await axios.get(`${API_URL}/groups/${selectedChat._id}`);
      setSelectedChat(response.data);
      await fetchGroups();
      toast.success("Admin demoted to member");
    } catch (error) {
      toast.error("Failed to demote member");
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!confirm("Remove this member?")) return;
    try {
      await axios.delete(
        `${API_URL}/groups/${selectedChat._id}/members/${memberId}`
      );
      const response = await axios.get(`${API_URL}/groups/${selectedChat._id}`);
      setSelectedChat(response.data);
      await fetchGroups();
      toast.success("Member removed");
    } catch (error) {
      toast.error("Failed to remove member");
    }
  };

  const handleAddLink = async () => {
    try {
      await axios.post(`${API_URL}/groups/${selectedChat._id}/links`, linkForm);
      const response = await axios.get(`${API_URL}/groups/${selectedChat._id}`);
      setSelectedChat(response.data);
      setLinkForm({ title: "", url: "" });
      toast.success("Link added successfully!");
    } catch (error) {
      toast.error("Failed to add link");
    }
  };

    const handleCreateTask = async () => {
    if (taskCreationInProgress.current) return;
    taskCreationInProgress.current = true;

    // CRITICAL FIX: Validate currentUser exists
    if (!currentUser || !currentUser.id) {
      toast.error('Unable to create task. Please refresh the page.');
      taskCreationInProgress.current = false;
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/groups/${selectedChat._id}/tasks`, taskForm);
      await fetchTasks(selectedChat._id);
      await fetchMyTasks(selectedChat._id);
      
      // CRITICAL FIX: Always include sender field in task message
      const taskMessageData = {
        sender: currentUser.id,  // ✅ FIXED
        group: selectedChat._id,
        content: `📋 New Task Assigned: ${taskForm.taskName}`,
        messageType: 'task',
        taskData: {
          taskId: response.data._id,
          taskName: taskForm.taskName,
          deadline: taskForm.deadline,
          assignedTo: taskForm.assignedTo
        },
        timestamp: new Date()
      };

      // VALIDATION: Double-check sender exists
      if (!taskMessageData.sender) {
        console.error('❌ Sender missing in task message');
      } else {
        socket.emit('sendMessage', taskMessageData);
      }

      if (taskForm.assignedTo && taskForm.assignedTo !== currentUser.id) {
        const personalTaskMessage = {
          sender: currentUser.id,  // ✅ FIXED
          receiver: taskForm.assignedTo,
          content: `📋 You have been assigned a new task: "${taskForm.taskName}"\n\nDeadline: ${new Date(taskForm.deadline).toLocaleString()}\n\nDescription: ${taskForm.description || 'No description'}`,
          messageType: 'task',
          taskData: {
            taskId: response.data._id,
            taskName: taskForm.taskName,
            deadline: taskForm.deadline,
            assignedTo: taskForm.assignedTo
          },
          timestamp: new Date()
        };
        
        if (personalTaskMessage.sender) {
          socket.emit('sendMessage', personalTaskMessage);
        }
      }

      setShowTaskModal(false);
      setTaskForm({ taskName: '', description: '', assignedTo: '', deadline: new Date() });
      toast.success('Task created successfully!');
    } catch (error) {
      console.error('Task creation error:', error);
      toast.error('Failed to create task');
    } finally {
      setTimeout(() => {
        taskCreationInProgress.current = false;
      }, 1000);
    }
  };


  const handleUpdateTaskStatus = async (taskId, status) => {
    try {
      await axios.patch(
        `${API_URL}/groups/${selectedChat._id}/tasks/${taskId}`,
        { status }
      );
      await fetchTasks(selectedChat._id);
      await fetchMyTasks(selectedChat._id);
      toast.success(`Task marked as ${status}`);
    } catch (error) {
      toast.error("Failed to update task");
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm("Delete this task?")) return;
    try {
      await axios.delete(
        `${API_URL}/groups/${selectedChat._id}/tasks/${taskId}`
      );
      await fetchTasks(selectedChat._id);
      await fetchMyTasks(selectedChat._id);
      toast.success("Task deleted");
    } catch (error) {
      toast.error("Failed to delete task");
    }
  };

    const handleCreatePoll = async () => {
    // CRITICAL FIX: Validate currentUser exists
    if (!currentUser || !currentUser.id) {
      toast.error('Unable to create poll. Please refresh the page.');
      return;
    }

    try {
      const validOptions = pollForm.options.filter(opt => opt.trim() !== '');
      if (validOptions.length < 2) {
        toast.error('Please provide at least 2 options');
        return;
      }
      
      const response = await axios.post(`${API_URL}/groups/${selectedChat._id}/polls`, {
        question: pollForm.question,
        options: validOptions,
        expiresIn: pollForm.expiresIn
      });
      await fetchPolls(selectedChat._id);

      // CRITICAL FIX: Always include sender field in poll message
      const pollMessageData = {
        sender: currentUser.id,  // ✅ FIXED
        group: selectedChat._id,
        content: `📊 New Poll: ${pollForm.question}`,
        messageType: 'poll',
        pollData: {
          pollId: response.data._id
        },
        timestamp: new Date()
      };

      // VALIDATION: Double-check sender exists
      if (!pollMessageData.sender) {
        console.error('❌ Sender missing in poll message');
        toast.error('Failed to create poll message');
      } else {
        const tempMessage = {
          ...pollMessageData,
          _id: 'temp-' + Date.now(),
          sender: { 
            _id: currentUser.id, 
            username: currentUser.username, 
            avatar: currentUser.avatar 
          },
          status: 'sent',
          reactions: [],
          pollData: { pollId: response.data }
        };
        setMessages(prev => [...prev, tempMessage]);
        socket.emit('sendMessage', pollMessageData);
      }

      setShowPollModal(false);
      setPollForm({ question: '', options: ['', ''], expiresIn: 24 });
      toast.success('Poll created successfully!');
    } catch (error) {
      console.error('Poll creation error:', error);
      toast.error('Failed to create poll');
    }
  };


  const handleVotePoll = async (pollId, optionIndex) => {
    try {
      setMessages((prev) =>
        prev.map((msg) => {
          if (
            msg.messageType === "poll" &&
            msg.pollData?.pollId?._id === pollId
          ) {
            const poll = msg.pollData.pollId;
            const updatedOptions = poll.options.map((opt, idx) => {
              const filteredVotes = opt.votes.filter(
                (v) => (typeof v === "string" ? v : v._id) !== currentUser.id
              );

              if (idx === optionIndex) {
                return { ...opt, votes: [...filteredVotes, currentUser.id] };
              }
              return { ...opt, votes: filteredVotes };
            });

            return {
              ...msg,
              pollData: {
                ...msg.pollData,
                pollId: {
                  ...poll,
                  options: updatedOptions,
                },
              },
            };
          }
          return msg;
        })
      );

      setPolls((prev) =>
        prev.map((poll) => {
          if (poll._id === pollId) {
            const updatedOptions = poll.options.map((opt, idx) => {
              const filteredVotes = opt.votes.filter(
                (v) => (typeof v === "string" ? v : v._id) !== currentUser.id
              );

              if (idx === optionIndex) {
                return { ...opt, votes: [...filteredVotes, currentUser.id] };
              }
              return { ...opt, votes: filteredVotes };
            });
            return { ...poll, options: updatedOptions };
          }
          return poll;
        })
      );

      const response = await axios.post(`${API_URL}/polls/${pollId}/vote`, {
        optionIndex,
      });

      if (socket) {
        socket.emit("pollVote", {
          pollId,
          optionIndex,
          userId: currentUser.id,
          groupId: selectedChat._id,
        });
      }

      setPolls((prev) =>
        prev.map((p) => (p._id === response.data._id ? response.data : p))
      );
      setMessages((prev) =>
        prev.map((msg) => {
          if (
            msg.messageType === "poll" &&
            msg.pollData?.pollId?._id === response.data._id
          ) {
            return {
              ...msg,
              pollData: {
                ...msg.pollData,
                pollId: response.data,
              },
            };
          }
          return msg;
        })
      );
    } catch (error) {
      console.error("Failed to vote:", error);
      await fetchPolls(selectedChat._id);
      toast.error("Failed to vote. Please try again.");
    }
  };

  const handleDocumentSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast.error("File size must be less than 50MB");
      return;
    }

    setPreviewFile(file);
  };

  const handleUploadDocument = async () => {
    if (!previewFile || !selectedChat) return;

    setUploadingDocument(true);

    try {
      const formData = new FormData();
      formData.append("document", previewFile);
      formData.append("description", documentForm.description);

      const response = await axios.post(
        `${API_URL}/groups/${selectedChat._id}/documents`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      await fetchDocuments(selectedChat._id);

      const documentMessageData = {
        sender: currentUser.id,
        group: selectedChat._id,
        content: `📄 Document uploaded: ${response.data.fileName}`,
        messageType: "document",
        documentData: {
          documentId: response.data._id,
        },
        timestamp: new Date(),
      };

      socket.emit("sendMessage", documentMessageData);

      setPreviewFile(null);
      setDocumentForm({ description: "" });
      if (documentInputRef.current) {
        documentInputRef.current.value = "";
      }

      toast.success("Document uploaded successfully!");
    } catch (error) {
      console.error("Document upload error:", error);
      toast.error("Failed to upload document");
    } finally {
      setUploadingDocument(false);
    }
  };

  const handleDownloadDocument = (document) => {
    const link = window.document.createElement("a");
    link.href = `${API_URL}${document.fileUrl}`;
    link.download = document.fileName;
    link.click();
    toast.success("Download started");
  };

  const handleViewDocument = (document) => {
    window.open(`${API_URL}${document.fileUrl}`, "_blank");
  };

    const handleShareDocumentInChat = async (doc) => {
    // CRITICAL FIX: Validate currentUser exists
    if (!currentUser || !currentUser.id) {
      toast.error('Unable to share document. Please refresh the page.');
      return;
    }

    try {
      const messageData = {
        sender: currentUser.id,  // ✅ FIXED
        group: selectedChat._id,
        content: `📄 Shared document: ${doc.fileName}`,
        messageType: 'document',
        documentData: {
          documentId: doc._id
        },
        timestamp: new Date()
      };

      // VALIDATION: Double-check sender exists
      if (!messageData.sender) {
        console.error('❌ Sender missing in document share message');
        toast.error('Failed to share document');
        return;
      }

      socket.emit('sendMessage', messageData);
      toast.success('Document shared in chat');
    } catch (error) {
      console.error('Document share error:', error);
      toast.error('Failed to share document');
    }
  };


  const handleDeleteDocument = async (documentId) => {
    if (!confirm("Delete this document? This action cannot be undone.")) return;

    try {
      await axios.delete(
        `${API_URL}/groups/${selectedChat._id}/documents/${documentId}`
      );
      await fetchDocuments(selectedChat._id);
      toast.success("Document deleted successfully");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to delete document");
    }
  };

  const getDaysLeft = (deadline) => {
    const now = new Date();
    const end = new Date(deadline);
    const diffTime = end - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "Overdue";
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "1 day left";
    return `${diffDays} days left`;
  };

  const getHoursLeft = (deadline) => {
    const now = new Date();
    const end = new Date(deadline);
    const diffTime = end - now;
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));

    if (diffHours < 0) return "Overdue";
    if (diffHours === 0) return "Less than 1 hour";
    if (diffHours === 1) return "1 hour left";
    return `${diffHours} hours left`;
  };

  const formatLastSeen = (lastSeen, isOnline) => {
    if (isOnline) return "Online";

    const date = new Date(lastSeen);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;

    return date.toLocaleDateString();
  };

  const getMessageStatus = (message) => {
    if (
      message.sender._id !== currentUser.id &&
      message.sender !== currentUser.id
    )
      return null;

    if (message.status === "read") {
      return <span className="text-blue-400 text-xs ml-1">✓✓</span>;
    } else if (message.status === "delivered") {
      return <span className="text-gray-400 text-xs ml-1">✓✓</span>;
    } else {
      return <span className="text-gray-400 text-xs ml-1">✓</span>;
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getMentionableUsers = () => {
    if (chatType === "group" && selectedChat && selectedChat.members) {
      return selectedChat.members.map((member) => ({
        id: member.userId._id,
        display: member.userId.username,
      }));
    }
    return [];
  };

  const renderMentionedContent = (content) => {
    if (!content) return "";
    const mentionRegex = /@\[([^\]]+)\]\([^)]+\)/g;
    return content.replace(mentionRegex, (match, username) => {
      return `<span class="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1 rounded font-semibold">@${username}</span>`;
    });
  };

  const handleTaskClick = (taskData) => {
    setSelectedTaskDetail(taskData);
    setShowTaskDetailModal(true);
  };

  const getReplyPreviewContent = (message) => {
    if (!message) return "Message";

    if (message.messageType === "image") return "📷 Photo";
    if (message.messageType === "video") return "🎥 Video";
    if (message.messageType === "pdf") return "📄 Document";
    if (message.messageType === "gif") return "🎬 GIF";
    if (message.messageType === "sticker") return "⭐ Sticker";
    if (message.messageType === "task") return "📋 Task";
    if (message.messageType === "poll") return "📊 Poll";
    if (message.messageType === "document") return "📄 Document";

    return message.content || "Message";
  };

  // ==========================================
  // RENDER: VIDEO CALL COMPONENT - NEW
  // ==========================================
  if (inCall && callData) {
    return (
      <VideoCall
        socket={socket}
        currentUser={currentUser}
        roomId={callData.roomId}
        callType={callData.callType}
        isGroup={callData.isGroup}
        groupName={callData.groupName}
        receiverInfo={callData.receiverInfo}
        onEndCall={endCall}
        darkMode={darkMode}
      />
    );
  }


  const backgroundImage = {
    backgroundImage: darkMode
      ? "url('/bgbgs.png')"
      : "url('/bgbgs.png')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",

  }
  // Auth Screen
  if (!isAuthenticated) {
    return (
      <div style={backgroundImage} className="min-h-screen   flex items-center justify-center p-4">
        <Toaster position="top-center" reverseOrder={false} />
        <div className="bg-white rounded-3xl  p-10 w-full max-w-md border border-gray-100">
          <div className="text-center mb-8">
           <div className="text-6xl md:text-8xl mb-6">
                  {/* Light mode logo */}
                  <img
                    src="/logolight.png"
                    alt="Logo Light"
                    className="mx-auto w-32 h-32 lg:w-20 lg:h-20 dark:hidden"
                  />

                  {/* Dark mode logo */}
                  <img
                    src="/logodark.png"
                    alt="Logo Dark"
                    className="mx-auto w-32 h-32 md:w-20 md:h-20 hidden dark:block"
                  />
                </div>
            <h1 className="text-3xl small font-bold text-black mb-2">
              {isLogin ? "Howsapp!" : "Create Account"}
            </h1>
            <p className="text-gray-500 flex justify-center items-center gap-2 text-sm">
              <img
                    src="/secure.png"
                    alt="Logo Dark"
                    className=" w-6 h-6 md:w-6 md:h-6 "
                  />
              Encrypted Chat Messenger</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div>
                <input
                  type="text"
                  placeholder="Username"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition"
                  required
                />
              </div>
            )}

            <div>
              <input
                type="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition"
                required
              />
            </div>

            <div>
              <input
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-black cursor-pointer text-white py-3 rounded-xl font-semibold hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200"
            >
              {isLogin ? "Sign In" : "Sign Up"}
            </button>
          </form>

          <p className="text-center mt-6 text-gray-600 text-sm">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-blue-600 cursor-pointer font-semibold hover:underline"
            >
              {isLogin ? "Sign Up" : "Sign In"}
            </button>
          </p>
        </div>
      </div>
    );
  }

  // Main Chat Interface
  return (
    <div className={`chat-container h-screen ${darkMode ? "dark " : ""}`}>
      <Toaster position="top-right" reverseOrder={false} />
      {showConfetti && <Confetti />}

      {/* Incoming Call Modal - NEW */}
      {showIncomingCallModal && incomingCall && (
        <IncomingCallModal
          incomingCall={incomingCall}
          onAnswer={answerCall}
          onReject={rejectCall}
          darkMode={darkMode}
        />
      )}

      {/* Task Reminder Notifications */}
      {taskReminders.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
          {taskReminders.slice(0, 3).map((reminder) => (
            <div
              key={reminder.taskId}
              className={`p-4 rounded-xl shadow-2xl border-2 ${
                reminder.urgency === "critical"
                  ? "bg-red-50 dark:bg-red-900/20 border-red-500"
                  : "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500"
              } backdrop-blur-lg animate-bounce`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">
                    {reminder.urgency === "critical" ? "⚠️" : "⏰"}
                  </span>
                  <div>
                    <p
                      className={`font-bold text-sm ${
                        reminder.urgency === "critical"
                          ? "text-red-700 dark:text-red-300"
                          : "text-yellow-700 dark:text-yellow-300"
                      }`}
                    >
                      Task Deadline Approaching!
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {reminder.groupName}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => dismissTaskReminder(reminder.taskId)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm font-semibold text-gray-800 dark:text-white mb-1">
                {reminder.taskName}
              </p>
              <p
                className={`text-xs font-bold ${
                  reminder.urgency === "critical"
                    ? "text-red-600 dark:text-red-400"
                    : "text-yellow-600 dark:text-yellow-400"
                }`}
              >
                {getHoursLeft(reminder.deadline)}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="h-full bg-blue-50 dark:bg-black flex flex-col md:flex-row p-2 md:p-4 gap-2 md:gap-4 transition-colors duration-300 relative">
        {selectedChat && (
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden fixed top-4 left-4 z-50 p-3 bg-white dark:bg-[#101010] rounded-full shadow-lg"
          >
            <svg
              className="w-6 h-6 text-gray-800 dark:text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        )}

        {/* Sidebar */}
        <div
          ref={sidebarRef}
          className={`
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} 
            md:translate-x-0 
            fixed md:relative 
            inset-y-0 left-0 
            w-80 md:w-96 
            bg-white dark:bg-[#101010]
            rounded-none md:rounded-3xl 
            shadow-xl 
            flex flex-col 
            overflow-hidden 
            transition-transform duration-300 
            z-40
          `}
        >
          <div className="p-4 md:p-6 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center space-x-3 mb-4">
              <div className="relative">
                <img
                  src={currentUser.avatar}
                  alt="Avatar"
                  className="w-12 h-12 md:w-14 md:h-14 rounded-full ring-2 ring-blue-100 dark:ring-blue-900 cursor-pointer"
                  onClick={() => {
                    setProfileForm({
                      username: currentUser.username,
                      bio: currentUser.bio,
                      about: currentUser.about,
                      avatar: currentUser.avatar,
                    });
                    setShowProfileModal(true);
                  }}
                />
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute bottom-0 right-0 bg-blue-500 text-white rounded-full p-2 hover:bg-blue-600 transition shadow-lg"
                  title="Change avatar"
                >
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </button>
                <input
                  type="file"
                  ref={avatarInputRef}
                  onChange={handleAvatarUpload}
                  accept="image/*"
                  className="hidden"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-black small dark:text-white text-base md:text-lg truncate">
                  {currentUser.username}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  @{currentUser.username}
                </p>
              </div>
              <ThemeToggle
                darkMode={darkMode}
                toggleDarkMode={toggleDarkMode}
              />
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-red-100 cursor-pointer dark:hover:bg-red-900 rounded-full transition text-red-600 dark:text-red-400"
                title="Logout"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </button>
            </div>

            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setShowAddContactModal(true)}
                className="flex-1 px-3 newq py-2 cursor-pointer bg-blue-500 text-white rounded-xl text-xs md:text-sm font-medium hover:bg-blue-600 transition"
              >
                Add Contact
              </button>
              <button
                onClick={() => setShowCreateGroupModal(true)}
                className="flex-1 px-3 newq cursor-pointer py-2 bg-green-500 text-white rounded-xl text-xs md:text-sm font-medium hover:bg-green-600 transition"
              >
                New Group
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Search contacts & groups..."
                value={sidebarSearchQuery}
                onChange={(e) => setSidebarSearchQuery(e.target.value)}
                className="w-full px-4 py-2 pl-10 rounded-xl border border-gray-200 dark:border-gray-800 focus:border-blue-400 dark:focus:border-blue-500 outline-none bg-white dark:bg-zinc-900 text-gray-800 dark:text-white text-sm"
              />
              <svg
                className="w-5 h-5 absolute left-3 top-2.5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-3 md:p-4">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                Contacts
              </h3>
              {filteredContacts.length === 0 && (
                <p className="text-sm text-gray-500 newq dark:text-gray-400 text-center py-4">
                  {sidebarSearchQuery
                    ? "No contacts found"
                    : "No contacts yet. Add one!"}
                </p>
              )}
              {filteredContacts.map((user) => (
                <div
                  key={user._id}
                  className={`p-3 mb-2 rounded-xl cursor-pointer hover:bg-blue-50 dark:hover:bg-zinc-800 transition ${
                    selectedChat?._id === user._id && chatType === "user"
                      ? "bg-blue-50 dark:bg-zinc-900 border-l-4 border-l-blue-500"
                      : ""
                  }`}
                >
                  <div
                    className="flex items-center space-x-3"
                    onClick={() => selectChat(user, "user")}
                  >
                    <div className="relative">
                      <img
                        src={user.avatar}
                        alt={user.username}
                        className="w-10 h-10 md:w-12 md:h-12 rounded-full"
                      />
                      {user.isOnline && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <h3 className="font-semibold small text-black dark:text-white truncate text-sm md:text-base">
                          {user.username}
                        </h3>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShowUserInfo(user._id);
                          }}
                          className="text-blue-500 hover:text-blue-600"
                          title="User info"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {user.bio}
                      </p>
                    </div>
                    {unreadCounts[user._id] && (
                      <div className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 md:w-6 md:h-6 flex items-center justify-center font-bold">
                        {unreadCounts[user._id]}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 md:p-4 border-t border-gray-100 dark:border-gray-700">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                Groups
              </h3>
              {filteredGroups.length === 0 && (
                <p className="text-sm text-gray-500 newq dark:text-gray-400 text-center py-4">
                  {sidebarSearchQuery
                    ? "No groups found"
                    : "No groups yet. Create one!"}
                </p>
              )}
              {filteredGroups.map((group) => (
                <div
                  key={group._id}
                  onClick={() => selectChat(group, "group")}
                  className={`p-3 mb-2 rounded-xl cursor-pointer hover:bg-green-50 dark:hover:bg-zinc-800 transition ${
                    selectedChat?._id === group._id && chatType === "group"
                      ? "bg-green-50 dark:bg-zinc-900 border-l-4 border-l-green-500"
                      : ""
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <img
                      src={group.avatar}
                      alt={group.name}
                      className="w-10 h-10 md:w-12 md:h-12 rounded-full"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold small text-black dark:text-white truncate text-sm md:text-base">
                        {group.name}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {group.members.length} members
                      </p>
                    </div>
                    {unreadCounts[group._id] && (
                      <div className="bg-green-500 text-white text-xs rounded-full w-5 h-5 md:w-6 md:h-6 flex items-center justify-center font-bold">
                        {unreadCounts[group._id]}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {sidebarOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black/70 dark:bg-black/95 z-30"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Chat Area */}
        <div className="flex-1 bg-white dark:bg-[#101010] rounded-3xl shadow-xl flex flex-col overflow-hidden transition-colors duration-300">
          {selectedChat ? (
            <>
              {/* Chat Header with Video Call Buttons - NEW */}
              <div className="chat-header bg-zinc-100 dark:bg-black p-3 md:p-5 flex items-center justify-between text-white">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="relative">
                    <img
                      src={selectedChat.avatar}
                      alt={selectedChat.username || selectedChat.name}
                      className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-white cursor-pointer"
                      onClick={() =>
                        chatType === "user"
                          ? handleShowUserInfo(selectedChat._id)
                          : null
                      }
                    />
                    {chatType === "group" &&
                      selectedChat.members?.find(
                        (m) => m.userId._id === currentUser.id
                      )?.role === "admin" && (
                        <button
                          onClick={() => groupAvatarInputRef.current?.click()}
                          className="absolute bottom-0 right-0 bg-white text-blue-500 rounded-full p-1 hover:bg-blue-50 transition shadow-lg"
                          title="Change group avatar"
                        >
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                        </button>
                      )}
                    <input
                      type="file"
                      ref={groupAvatarInputRef}
                      onChange={handleGroupAvatarUpload}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base small dark:text-white tracking-wide text-black md:text-lg truncate">
                      {selectedChat.username || selectedChat.name}
                    </h3>
                    <p className="text-xs dark:text-white text-black truncate">
                      {chatType === "user"
                        ? isTyping
                          ? "typing..."
                          : formatLastSeen(
                              selectedChat.lastSeen,
                              selectedChat.isOnline
                            )
                        : `${selectedChat.members?.length} members`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {/* VIDEO CALL BUTTONS - NEW */}
                  {!isUserBlocked && (
                    <>
                      <button
                        onClick={() => initiateCall("audio")}
                        className="p-2 bg-black cursor-pointer rounded-full transition hover:bg-green-600"
                        title="Voice Call"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => initiateCall("video")}
                        className="p-2 bg-black cursor-pointer rounded-full transition hover:bg-blue-600"
                        title="Video Call"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => setShowMessageSearch(!showMessageSearch)}
                    className="p-2 bg-black cursor-pointer rounded-full transition"
                    title="Search messages"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </button>

                  {chatType === "group" && (
                    <>
                      <button
                        onClick={() => setShowTaskModal(true)}
                        className="p-2 bg-black cursor-pointer rounded-full transition"
                        title="Tasks"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => setShowPollModal(true)}
                        className="p-2 bg-black cursor-pointer rounded-full transition"
                        title="Create Poll"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => setShowDocumentModal(true)}
                        className="p-2 bg-black cursor-pointer rounded-full transition"
                        title="Documents"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => setShowGroupInfoModal(true)}
                        className="p-2 bg-black cursor-pointer rounded-full transition"
                        title="Group info"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {showMessageSearch && (
                <div className="p-3 bg-gray-50 dark:bg-zinc-900 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Search messages..."
                      value={messageSearchQuery}
                      onChange={(e) => setMessageSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && searchMessages()}
                      className="flex-1 px-4 py-2 rounded-2xl border border-gray-200 dark:border-gray-900 focus:border-blue-400 dark:focus:border-blue-500 outline-none bg-white dark:bg-[#0c0c0c] text-gray-800 dark:text-white text-sm"
                    />
                    <button
                      onClick={searchMessages}
                      disabled={searchingMessages}
                      className="px-4 py-2 bg-[#9381ff] text-white rounded-2xl hover:bg-[#9381ff]/50 cursor-pointer transition disabled:bg-gray-400"
                    >
                      {searchingMessages ? "Searching..." : "Search"}
                    </button>
                  </div>
                  {searchResults.length > 0 && (
                    <div className="mt-2 max-h-40 overflow-y-auto bg-white dark:bg-gray-700 rounded-lg p-2">
                      {searchResults.map((msg) => (
                        <div
                          key={msg._id}
                          onClick={() => {
                            scrollToMessage(msg._id);
                            setShowMessageSearch(false);
                          }}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded cursor-pointer text-sm"
                        >
                          <p className="font-semibold text-gray-800 dark:text-white">
                            {msg.sender.username}
                          </p>
                          <p className="text-gray-600 dark:text-gray-300 truncate">
                            {msg.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Messages */}
              <div
                className="flex-1 overflow-y-auto p-3 md:p-6 bg-white dark:bg-[#101010]"
                onScroll={handleMessageScroll}
              >
                {loadingOlderMessages && (
                  <div className="text-center py-2">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Loading older messages...
                    </p>
                  </div>
                )}

                {newMessagesCount > 0 && (
                  <div className="sticky top-0 z-10 flex justify-center mb-4">
                    <button
                      onClick={() => {
                        scrollToBottom();
                        setNewMessagesCount(0);
                      }}
                      className="bg-blue-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 hover:bg-blue-600 transition"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 14l-7 7m0 0l-7-7m7 7V3"
                        />
                      </svg>
                      {newMessagesCount} new message
                      {newMessagesCount > 1 ? "s" : ""}
                    </button>
                  </div>
                )}

                <div
                  ref={messageContainerRef}
                  className="space-y-3 md:space-y-4"
                >
                  <div ref={messagesTopRef} />
                  {messages.map((message, index) => {
                    const isSender =
                      message.sender._id === currentUser.id ||
                      message.sender === currentUser.id;

                    return (
                      <div
                        key={message._id || index}
                        ref={(el) => (messageRefs.current[message._id] = el)}
                        className={`flex ${
                          isSender ? "justify-end" : "justify-start"
                        } group`}
                      >
                        <div
                          className={`max-w-[85%] md:max-w-lg relative ${
                            isSender ? "order-2" : "order-1"
                          }`}
                        >
                          {message.isPinned && (
                            <div className="text-xs text-yellow-600 dark:text-yellow-400 mb-1 flex items-center gap-1">
                              📌 Pinned
                            </div>
                          )}

                          {message.replyTo && (
                            <div
                              onClick={() =>
                                scrollToMessage(message.replyTo._id)
                              }
                              className={`mb-1 p-2 rounded-lg border-l-4 text-xs cursor-pointer hover:bg-opacity-80 transition ${
                                isSender
                                  ? "bg-blue-50 dark:bg-blue-900/20 border-blue-400"
                                  : "bg-gray-100 dark:bg-gray-700 border-gray-400"
                              }`}
                            >
                              <p className="font-semibold text-gray-700 dark:text-gray-300">
                                {message.replyTo.sender?.username || "Unknown"}
                              </p>
                              <p className="text-gray-600 dark:text-gray-400 truncate">
                                {getReplyPreviewContent(message.replyTo)}
                              </p>
                            </div>
                          )}

                          <div
                            className={`rounded-3xl px-3 py-2 md:px-4 md:py-3 ${
                              isSender
                                ? "bg-zinc-100 text-black dark:bg-[#0c0c0c] dark:text-white dark:border dark:border-zinc-800"
                                : "bg-gray-100 dark:bg-[#0c0c0c] text-gray-800 dark:text-white dark:border dark:border-zinc-800"
                            }`}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setShowReactionPicker(message._id);
                            }}
                          >
                            {chatType === "group" && !isSender && (
                              <div className="flex items-center space-x-2 mb-1">
                                <p className="text-xs font-semibold opacity-75">
                                  {message.sender.username}
                                </p>
                              </div>
                            )}

                            {message.messageType === "task" &&
                              message.taskData && (
                                <div
                                  className={`p-3 rounded-lg cursor-pointer hover:opacity-90 transition ${
                                    isSender
                                      ? "bg-white/20"
                                      : "bg-blue-50 dark:bg-blue-900/20"
                                  }`}
                                  onClick={() =>
                                    handleTaskClick(message.taskData)
                                  }
                                >
                                  <div className="flex items-center space-x-2 mb-2">
                                    <span className="text-2xl">📋</span>
                                    <div className="flex-1">
                                      <p className="font-semibold">
                                        {message.taskData.taskName}
                                      </p>
                                      {message.taskData.deadline && (
                                        <p className="text-xs opacity-75">
                                          Due:{" "}
                                          {new Date(
                                            message.taskData.deadline
                                          ).toLocaleDateString()}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  {message.taskData.assignedTo && (
                                    <div className="flex items-center space-x-2 text-xs">
                                      <img
                                        src={message.taskData.assignedTo.avatar}
                                        alt={
                                          message.taskData.assignedTo.username
                                        }
                                        className="w-5 h-5 rounded-full"
                                      />
                                      <span>
                                        Assigned to:{" "}
                                        {message.taskData.assignedTo.username}
                                      </span>
                                    </div>
                                  )}
                                  <p className="text-xs mt-2 opacity-60">
                                    Click to view details
                                  </p>
                                </div>
                              )}

                            {message.messageType === "poll" &&
                              message.pollData &&
                              message.pollData.pollId && (
                                <div
                                  className={`p-4 rounded-lg bg-white dark:bg-gray-700`}
                                >
                                  <div className="flex items-center space-x-2 mb-3">
                                    <span className="text-2xl">📊</span>
                                    <p className="font-semibold flex-1 text-gray-800 dark:text-white">
                                      {message.pollData.pollId.question}
                                    </p>
                                  </div>
                                  <div className="space-y-3 mt-2">
                                    {message.pollData.pollId.options &&
                                      message.pollData.pollId.options.map(
                                        (option, idx) => {
                                          const totalVotes =
                                            message.pollData.pollId.options.reduce(
                                              (sum, opt) =>
                                                sum + opt.votes.length,
                                              0
                                            );
                                          const percentage =
                                            totalVotes > 0
                                              ? (
                                                  (option.votes.length /
                                                    totalVotes) *
                                                  100
                                                ).toFixed(0)
                                              : 0;
                                          const userVoted = option.votes.some(
                                            (v) =>
                                              v._id === currentUser.id ||
                                              v === currentUser.id
                                          );

                                          return (
                                            <button
                                              key={idx}
                                              onClick={() =>
                                                chatType === "group" &&
                                                handleVotePoll(
                                                  message.pollData.pollId._id,
                                                  idx
                                                )
                                              }
                                              className={`w-full text-left p-3 rounded-lg border transition-all ${
                                                userVoted
                                                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 shadow-md"
                                                  : "border-gray-200 dark:border-gray-600 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                                              } text-sm`}
                                            >
                                              <div className="flex justify-between mb-2 items-center">
                                                <span className="font-medium text-gray-800 dark:text-white">
                                                  {option.text}
                                                </span>
                                                <div className="flex items-center space-x-2">
                                                  {userVoted && (
                                                    <span className="text-indigo-600 dark:text-indigo-400">
                                                      ✓
                                                    </span>
                                                  )}
                                                  <span className="text-gray-600 dark:text-gray-300 font-semibold">
                                                    {option.votes.length} (
                                                    {percentage}%)
                                                  </span>
                                                </div>
                                              </div>
                                              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
                                                <div
                                                  className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2.5 rounded-full transition-all duration-500"
                                                  style={{
                                                    width: `${percentage}%`,
                                                  }}
                                                ></div>
                                              </div>
                                            </button>
                                          );
                                        }
                                      )}
                                  </div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                                    Total votes:{" "}
                                    {message.pollData.pollId.options.reduce(
                                      (sum, opt) => sum + opt.votes.length,
                                      0
                                    )}
                                  </p>
                                </div>
                              )}

                            {message.messageType === "document" &&
                              message.documentData && (
                                <div
                                  className={`p-3 rounded-lg cursor-pointer hover:opacity-90 transition ${
                                    isSender
                                      ? "bg-white/20"
                                      : "bg-purple-50 dark:bg-purple-900/20"
                                  }`}
                                  onClick={async () => {
                                    try {
                                      const response = await axios.get(
                                        `${API_URL}/documents/${message.documentData.documentId}`
                                      );
                                      handleViewDocument(response.data);
                                    } catch (error) {
                                      toast.error("Failed to load document");
                                    }
                                  }}
                                >
                                  <div className="flex items-center space-x-3">
                                    <span className="text-3xl">📄</span>
                                    <div className="flex-1">
                                      <p className="font-semibold text-gray-800 dark:text-white">
                                        Document Shared
                                      </p>
                                      <p className="text-xs opacity-75">
                                        Click to view
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}

                            {message.messageType === "image" && (
                              <img
                                src={`${API_URL}${message.fileUrl}`}
                                alt="Shared image"
                                className="rounded-xl max-w-full cursor-pointer hover:opacity-90 transition"
                                onClick={() => {
                                  setSelectedImage(
                                    `${API_URL}${message.fileUrl}`
                                  );
                                  setShowImageModal(true);
                                }}
                              />
                            )}

                            {message.messageType === "pdf" && (
                              <a
                                href={`${API_URL}${message.fileUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center space-x-3 p-2 md:p-3 rounded-lg ${
                                  isSender
                                    ? "bg-white/20"
                                    : "bg-gray-50 dark:bg-gray-600"
                                }`}
                              >
                                <div className="text-2xl md:text-3xl">📄</div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate text-sm md:text-base">
                                    {message.fileName}
                                  </p>
                                  <p
                                    className={`text-xs ${
                                      isSender
                                        ? "text-blue-100"
                                        : "text-gray-500 dark:text-gray-400"
                                    }`}
                                  >
                                    {formatFileSize(message.fileSize)}
                                  </p>
                                </div>
                              </a>
                            )}

                            {message.messageType === "video" && (
                              <video
                                src={`${API_URL}${message.fileUrl}`}
                                controls
                                className="rounded-xl max-w-full"
                              />
                            )}

                            {message.messageType === "gif" && (
                              <img
                                src={message.content}
                                alt="GIF"
                                className="rounded-xl max-w-full"
                              />
                            )}

                            {message.messageType === "sticker" && (
                              <div className="text-6xl">{message.content}</div>
                            )}

                            {(message.messageType === "text" ||
                              message.messageType === "emoji" ||
                              message.messageType === "link") &&
                              message.content && (
                                <>
                                  <p
                                    className="break-words text-sm md:text-base whitespace-pre-wrap"
                                    dangerouslySetInnerHTML={{
                                      __html: renderMentionedContent(
                                        message.content
                                      ),
                                    }}
                                  />
                                  {message.isEdited && (
                                    <span className="text-xs opacity-60 italic ml-2">
                                      (edited)
                                    </span>
                                  )}

                                  {message.linkPreview && (
                                    <div
                                      className={`mt-2 rounded-lg p-2 border ${
                                        isSender
                                          ? "bg-white/10 border-white/20"
                                          : "bg-gray-50 dark:bg-gray-600 border-gray-200 dark:border-gray-500"
                                      }`}
                                    >
                                      {message.linkPreview.image && (
                                        <img
                                          src={message.linkPreview.image}
                                          alt="Link preview"
                                          className="w-full h-32 object-cover rounded mb-2"
                                        />
                                      )}
                                      <p className="text-xs font-semibold truncate">
                                        {message.linkPreview.title}
                                      </p>
                                      <p className="text-xs opacity-75 truncate">
                                        {message.linkPreview.description}
                                      </p>
                                    </div>
                                  )}
                                </>
                              )}

                            {message.reactions &&
                              message.reactions.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {Object.entries(
                                    message.reactions.reduce((acc, r) => {
                                      acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                                      return acc;
                                    }, {})
                                  ).map(([emoji, count]) => (
                                    <button
                                      key={emoji}
                                      onClick={() =>
                                        handleShowReactionsInfo(message)
                                      }
                                      className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 cursor-pointer hover:scale-110 transition ${
                                        isSender
                                          ? "bg-white/20 hover:bg-white/30"
                                          : "bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
                                      }`}
                                    >
                                      {emoji}{" "}
                                      <span className="font-semibold">
                                        {count}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              )}
                          </div>

                          <div
                            className={`absolute top-0 ${
                              isSender ? "right-full mr-2" : "left-full ml-2"
                            } opacity-0 group-hover:opacity-100 transition-opacity flex gap-1`}
                          >
                            <button
                              onClick={() => handleReplyToMessage(message)}
                              className="p-2 bg-white dark:bg-gray-700 rounded-full shadow-lg hover:bg-gray-100 dark:hover:bg-gray-600"
                              title="Reply"
                            >
                              <svg
                                className="w-4 h-4 text-gray-600 dark:text-gray-300"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                                />
                              </svg>
                            </button>
                            {isSender &&
                              message.messageType !== "task" &&
                              message.messageType !== "poll" &&
                              message.messageType !== "document" && (
                                <>
                                  <button
                                    onClick={() =>
                                      handlePinMessage(message._id)
                                    }
                                    className="p-2 bg-white dark:bg-gray-900 rounded-full shadow-lg hover:bg-gray-100 dark:hover:bg-gray-600"
                                    title="Pin"
                                  >
                                    📌
                                  </button>
                                  {message.messageType === "text" && (
                                    <button
                                      onClick={() => handleEditMessage(message)}
                                      className="p-2 bg-white dark:bg-gray-900 rounded-full shadow-lg hover:bg-gray-100 dark:hover:bg-gray-600"
                                      title="Edit"
                                    >
                                      <svg
                                        className="w-4 h-4 text-gray-600 dark:text-gray-300"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                        />
                                      </svg>
                                    </button>
                                  )}
                                  <button
                                    onClick={() =>
                                      handleDeleteMessage(message._id)
                                    }
                                    className="p-2 bg-white dark:bg-gray-900 rounded-full shadow-lg hover:bg-red-50 dark:hover:bg-red-900"
                                    title="Delete"
                                  >
                                    <svg
                                      className="w-4 h-4 text-red-600"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                      />
                                    </svg>
                                  </button>
                                </>
                              )}
                            {isSender && (
                              <button
                                onClick={() => handleShowMessageInfo(message)}
                                className="p-2 bg-white dark:bg-gray-900 rounded-full shadow-lg hover:bg-gray-100 dark:hover:bg-gray-600"
                                title="Message Info"
                              >
                                <svg
                                  className="w-4 h-4 text-gray-600 dark:text-gray-300"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                              </button>
                            )}
                          </div>

                          {showReactionPicker === message._id && (
                            <div className="absolute bottom-full mb-2 left-0 bg-white dark:bg-gray-700 rounded-full shadow-2xl p-2 flex gap-1 z-10 border-2 border-gray-200 dark:border-gray-600">
                              {QUICK_REACTIONS.map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() =>
                                    handleReaction(message._id, emoji)
                                  }
                                  className="text-2xl hover:scale-125 transition-transform p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600"
                                >
                                  {emoji}
                                </button>
                              ))}
                              <button
                                onClick={() => setShowReactionPicker(null)}
                                className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2"
                              >
                                ✕
                              </button>
                            </div>
                          )}

                          <div
                            className={`flex items-center space-x-1 mt-1 px-1 ${
                              isSender ? "justify-end" : "justify-start"
                            }`}
                          >
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              {new Date(message.timestamp).toLocaleTimeString(
                                [],
                                { hour: "2-digit", minute: "2-digit" }
                              )}
                            </span>
                            {getMessageStatus(message)}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-gray-200 dark:bg-gray-700 rounded-3xl px-4 py-3 flex items-center space-x-1">
                        <div
                          className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        ></div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* File Preview Modal */}
              {filePreview && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                  <div className="bg-white dark:bg-[#101010] rounded-3xl p-6 max-w-2xl w-full">
                    {previewFile?.type.startsWith("image/") ? (
                      <img
                        src={filePreview}
                        alt="Preview"
                        className="max-h-96 w-full object-contain rounded-lg mb-4"
                      />
                    ) : previewFile?.type.startsWith("video/") ? (
                      <video
                        src={filePreview}
                        controls
                        className="max-h-96 w-full rounded-lg mb-4"
                      />
                    ) : (
                      <div className="p-8 bg-gray-100 dark:bg-gray-700 rounded-lg mb-4 text-center">
                        <div className="text-6xl mb-4">📄</div>
                        <p className="font-medium text-gray-800 dark:text-white">
                          {previewFile?.name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {formatFileSize(previewFile?.size)}
                        </p>
                      </div>
                    )}
                    <div className="flex gap-3">
                      <button
                        onClick={confirmFileSend}
                        disabled={uploadingFile}
                        className="flex-1 px-6 py-3 cursor-pointer bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition disabled:bg-gray-300"
                      >
                        {uploadingFile ? "Sending..." : "Send"}
                      </button>
                      <button
                        onClick={cancelFilePreview}
                        className="flex-1 px-6 py-3 cursor-pointer bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-500 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Input Area */}
              <div className="bg-white dark:bg-[#101010] p-3 md:p-4 border-t border-gray-100 dark:border-gray-700 relative">
                {replyingTo && (
                  <div className="mb-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-500 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                        Replying to {replyingTo.sender?.username || "Unknown"}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {getReplyPreviewContent(replyingTo)}
                      </p>
                    </div>
                    <button
                      onClick={() => setReplyingTo(null)}
                      className="text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {editingMessage && (
                  <div className="mb-2 p-2 bg-amber-50 dark:bg-amber-900 rounded-lg text-xs text-amber-700 dark:text-amber-300 flex items-center justify-between">
                    <span>Editing message...</span>
                    <button
                      onClick={() => {
                        setEditingMessage(null);
                        setMessageInput("");
                      }}
                      className="text-amber-900 dark:text-amber-200 hover:text-amber-700"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                <form
                  onSubmit={sendMessage}
                  className="flex items-center space-x-2"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    accept="image/*,application/pdf,video/*"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 md:p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition text-gray-600 dark:text-gray-300"
                    title="Attach file"
                  >
                    <svg
                      className="w-4 h-4 md:w-5 md:h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                      />
                    </svg>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-2 md:p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition text-xl md:text-2xl"
                    title="Emoji"
                  >
                    😊
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowGifPicker(!showGifPicker)}
                    className="p-2 md:p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition text-gray-600 dark:text-gray-300 text-xs md:text-sm font-bold"
                    title="GIF"
                  >
                    GIF
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowStickerPicker(!showStickerPicker)}
                    className="p-2 md:p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition text-xl"
                    title="Sticker"
                  >
                    ⭐
                  </button>

                  {chatType === "group" ? (
                    <div className="flex-1">
                      <MentionsInput
                        value={messageInput}
                        onChange={handleInputChange}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage(e);
                          }
                        }}
                        placeholder={
                          editingMessage
                            ? "Edit message..."
                            : replyingTo
                            ? "Type a reply..."
                            : "Type a message..."
                        }
                        className="mentions-input "
                        style={darkMode ? mentionStyleDark : mentionStyle}
                        a11ySuggestionsListLabel="Suggested users to mention"
                        singleLine={true}
                      >
                        <Mention
                          trigger="@"
                          data={getMentionableUsers()}
                          displayTransform={(id, display) => `@${display}`}
                          markup="@[__display__](__id__)"
                          renderSuggestion={(
                            suggestion,
                            search,
                            highlightedDisplay,
                            index,
                            focused
                          ) => (
                            <div
                              className={`mention-suggestion ${
                                focused ? "focused" : ""
                              }`}
                            >
                              {highlightedDisplay}
                            </div>
                          )}
                          style={{
                            backgroundColor: darkMode ? "#3b82f6" : "#dbeafe",
                            color: darkMode ? "#fff" : "#1e40af",
                            fontWeight: "bold",
                            padding: "2px 4px",
                            borderRadius: "4px",
                          }}
                        />
                      </MentionsInput>
                    </div>
                  ) : (
                    <input
                      ref={chatInputRef}
                      type="text"
                      value={messageInput}
                      onChange={handleInputChange}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage(e);
                        }
                      }}
                      placeholder={
                        editingMessage
                          ? "Edit message..."
                          : replyingTo
                          ? "Type a reply..."
                          : "Type a message..."
                      }
                      className="flex-1 px-4 py-4 rounded-full border border-gray-200 dark:border-gray-600 focus:border-blue-400 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 outline-none transition bg-gray-50 dark:bg-zinc-800 text-gray-800 dark:text-white text-sm"
                    />
                  )}

                  <button
                    type="submit"
                    className="px-4 py-2 md:px-6 md:py-3 bg-[#21b0fe] text-white rounded-full font-medium hover:shadow-lg transform hover:scale-105 transition-all duration-200 text-sm md:text-base"
                  >
                    {editingMessage ? "Update" : replyingTo ? "Reply" : "Send"}
                  </button>
                </form>

                {showEmojiPicker && (
                  <div className="absolute bottom-20 left-4 md:left-20 z-50 shadow-2xl">
                    <EmojiPicker
                      onEmojiClick={handleEmojiClick}
                      theme={darkMode ? "dark" : "light"}
                    />
                  </div>
                )}

                {showGifPicker && (
                  <div className="absolute bottom-20 left-4 md:left-20 z-50 shadow-2xl">
                    <GifPicker
                      tenorApiKey={TENOR_KEY}
                      onGifClick={(gif) => {
                        sendMessage(null, gif.url);
                        setShowGifPicker(false);
                      }}
                      theme={darkMode ? "dark" : "light"}
                    />
                  </div>
                )}

                {showStickerPicker && (
                  <div className="absolute bottom-20 left-4 md:left-20 z-50 bg-white dark:bg-[#101010] rounded-lg shadow-2xl p-4 w-80">
                    <div className="grid grid-cols-5 gap-2">
                      {STICKERS.map((sticker, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            sendMessage(null, null, sticker);
                            setShowStickerPicker(false);
                          }}
                          className="text-4xl hover:scale-125 transition-transform p-2"
                        >
                          {sticker}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="text-center">
                <div className="text-6xl md:text-8xl mb-6">
                  {/* Light mode logo */}
                  <img
                    src="/logolight.png"
                    alt="Logo Light"
                    className="mx-auto w-32 h-32 md:w-48 md:h-48 dark:hidden"
                  />

                  {/* Dark mode logo */}
                  <img
                    src="/logodark.png"
                    alt="Logo Dark"
                    className="mx-auto w-32 h-32 md:w-48 md:h-48 hidden dark:block"
                  />
                </div>

                <h2 className="text-2xl md:text-3xl small font-bold text-black dark:text-gray-300 mb-3">
                 Howsapp!
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base">
                  Select a conversation to start chatting
                </p>
                <div className="mt-4 flex justify-center  items-center gap-2 text-sm text-zinc-700 dark:text-gray-500">
                  <img
                    src="/secure.png"
                    alt="Logo Dark"
                    className=" w-6 h-6 md:w-6 md:h-6 "
                  />
                  End-to-end encrypted
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/70 dark:bg-black/95 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#101010] rounded-3xl p-6 md:p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4 text-gray-800 small dark:text-white">
              Edit Profile
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={profileForm.username}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, username: e.target.value })
                  }
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-zinc-800 focus:border-blue-400 dark:focus:border-blue-500 outline-none bg-white dark:bg-zinc-800 text-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Bio
                </label>
                <input
                  type="text"
                  value={profileForm.bio}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, bio: e.target.value })
                  }
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-zinc-800 focus:border-blue-400 dark:focus:border-blue-500 outline-none bg-white dark:bg-zinc-800 text-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  About
                </label>
                <textarea
                  value={profileForm.about}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, about: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-zinc-800 focus:border-blue-400 dark:focus:border-blue-500 outline-none bg-white dark:bg-zinc-800 text-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Your Username
                </label>
                <div className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-zinc-800 font-mono text-lg text-center text-gray-800 dark:text-white">
                  @{currentUser.username}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleUpdateProfile}
                className="flex-1 px-4 py-2 cursor-pointer bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition"
              >
                Save
              </button>
              <button
                onClick={() => setShowProfileModal(false)}
                className="flex-1 px-4 py-2 cursor-pointer bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-500 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Contact Modal */}
      {showAddContactModal && (
        <div className="fixed inset-0 bg-black/70 dark:bg-black/95 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#101010] rounded-3xl p-6 md:p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4 text-black small dark:text-white">
              Add Contact
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Enter the @username of the person you want to add
            </p>
            <input
              type="text"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              placeholder="@username"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 focus:border-blue-400 dark:focus:border-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-800 dark:text-white mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={handleAddContact}
                className="flex-1 px-4 py-2 cursor-pointer bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition"
              >
                Add Contact
              </button>
              <button
                onClick={() => setShowAddContactModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 cursor-pointer dark:bg-gray-600 text-gray-800 dark:text-white rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-500 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Info Modal */}
      {showUserInfoModal && selectedUserInfo && (
        <div className="fixed inset-0 bg-black/70 dark:bg-black/95 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#101010] rounded-3xl p-6 md:p-8 w-full max-w-md">
            <div className="text-center mb-6">
              <img
                src={selectedUserInfo.avatar}
                alt={selectedUserInfo.username}
                className="w-24 h-24 rounded-full mx-auto mb-4 ring-4 ring-blue-100 dark:ring-blue-900"
              />
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                {selectedUserInfo.username}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                @{selectedUserInfo.username}
              </p>
            </div>
            <div className="space-y-3">
              <div className="bg-gray-50 dark:bg-zinc-800 p-3 rounded-lg">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Bio
                </label>
                <p className="text-gray-800 dark:text-white">
                  {selectedUserInfo.bio}
                </p>
              </div>
              {selectedUserInfo.about && (
                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    About
                  </label>
                  <p className="text-gray-800 dark:text-white">
                    {selectedUserInfo.about}
                  </p>
                </div>
              )}
              <div className="bg-gray-50 dark:bg-zinc-800 p-3 rounded-lg">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Status
                </label>
                <p className="text-gray-800 dark:text-white">
                  {formatLastSeen(
                    selectedUserInfo.lastSeen,
                    selectedUserInfo.isOnline
                  )}
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              {isUserBlocked ? (
                <button
                  onClick={() => {
                    handleUnblockUser(selectedUserInfo._id);
                    setShowUserInfoModal(false);
                  }}
                  className="w-full px-4 py-2 cursor-pointer bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition"
                >
                  Unblock User
                </button>
              ) : (
                <>
                <div className="flex gap-4 items-center">
                  <button
                    onClick={() => handleUnfriendUser(selectedUserInfo._id)}
                    className="w-full px-4 py-2 cursor-pointer bg-[#9381ff] text-white rounded-xl font-medium hover:bg-[#9381ff]/50 transition"
                  >
                    Remove
                  </button>
                  <button
                    onClick={() => handleBlockUser(selectedUserInfo._id)}
                    className="w-full px-4 py-2 cursor-pointer bg-[#ff0000] text-white rounded-xl font-medium hover:bg-red-600 transition"
                  >
                    Block
                  </button>
                </div>
                  
                </>
              )}
              <button
                onClick={() => setShowUserInfoModal(false)}
                className="w-full px-4 py-2 cursor-pointer bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 bg-black/70 dark:bg-black/95 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#101010] rounded-3xl p-6 md:p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4 text-black small dark:text-white">
              Create Group
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Group Name
                </label>
                <input
                  type="text"
                  value={groupForm.name}
                  onChange={(e) =>
                    setGroupForm({ ...groupForm, name: e.target.value })
                  }
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 focus:border-blue-400 dark:focus:border-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={groupForm.description}
                  onChange={(e) =>
                    setGroupForm({ ...groupForm, description: e.target.value })
                  }
                  rows={2}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 focus:border-blue-400 dark:focus:border-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Members
                </label>
                <div className="max-h-48 overflow-y-auto space-y-2 border border-gray-200 dark:border-gray-600 rounded-xl p-3">
                  {contacts.map((contact) => (
                    <label
                      key={contact._id}
                      className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-lg"
                    >
                      <input
                        type="checkbox"
                        checked={groupForm.memberIds.includes(contact._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setGroupForm({
                              ...groupForm,
                              memberIds: [...groupForm.memberIds, contact._id],
                            });
                          } else {
                            setGroupForm({
                              ...groupForm,
                              memberIds: groupForm.memberIds.filter(
                                (id) => id !== contact._id
                              ),
                            });
                          }
                        }}
                        className="w-4 h-4 text-blue-500 rounded"
                      />
                      <img
                        src={contact.avatar}
                        alt={contact.username}
                        className="w-8 h-8 rounded-full"
                      />
                      <span className="text-gray-800 dark:text-white">
                        {contact.username}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCreateGroup}
                className="flex-1 px-4 py-2 cursor-pointer bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition"
              >
                Create
              </button>
              <button
                onClick={() => setShowCreateGroupModal(false)}
                className="flex-1 px-4 py-2 cursor-pointer bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-500 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/70 dark:bg-black/95   flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#101010] rounded-3xl p-6 md:p-8 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold text-gray-800 small dark:text-white">
                📋 Tasks
              </h2>
              <button
                onClick={() => setShowTaskModal(false)}
                className="text-gray-400 cursor-pointer hover:text-gray-600 dark:hover:text-gray-200"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Create Task Form */}
              <div className="bg-blue-50 dark:bg-transparent dark:border dark:border-zinc-900 rounded-2xl p-6">
                <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-4">
                  Create New Task
                </h3>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Task name"
                    value={taskForm.taskName}
                    onChange={(e) =>
                      setTaskForm({ ...taskForm, taskName: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-2xl border border-gray-200 dark:border-zinc-800 focus:border-blue-400 dark:focus:border-blue-500 outline-none bg-white dark:bg-zinc-900 text-gray-800 dark:text-white"
                  />
                  <textarea
                    placeholder="Description (optional)"
                    value={taskForm.description}
                    onChange={(e) =>
                      setTaskForm({ ...taskForm, description: e.target.value })
                    }
                    rows={3}
                    className="w-full px-4 py-2 rounded-2xl border border-gray-200 dark:border-zinc-800 focus:border-blue-400 dark:focus:border-blue-500 outline-none bg-white dark:bg-zinc-900 text-gray-800 dark:text-white"
                  />
                  <select
                    value={taskForm.assignedTo}
                    onChange={(e) =>
                      setTaskForm({ ...taskForm, assignedTo: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-2xl border border-gray-200 dark:border-zinc-800 focus:border-blue-400 dark:focus:border-blue-500 outline-none bg-white dark:bg-zinc-900 text-gray-800 dark:text-white"
                  >
                    <option value="">Select assignee</option>
                    {selectedChat?.members?.map((member) => (
                      <option key={member.userId._id} value={member.userId._id}>
                        {member.userId.username}
                      </option>
                    ))}
                  </select>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Deadline
                    </label>
                    <DatePicker
                      selected={taskForm.deadline}
                      onChange={(date) =>
                        setTaskForm({ ...taskForm, deadline: date })
                      }
                      showTimeSelect
                      timeFormat="HH:mm"
                      timeIntervals={15}
                      dateFormat="MMMM d, yyyy h:mm aa"
                      minDate={new Date()}
                      className="w-full px-4 py-2 rounded-2xl   dark:border-zinc-800 focus:border-blue-400 dark:focus:border-blue-500 outline-none bg-white dark:bg-zinc-900 text-gray-800 dark:text-white"
                    />
                  </div>
                  <button
                    onClick={handleCreateTask}
                    className="w-full px-4 py-3 cursor-pointer bg-blue-500 text-white rounded-2xl font-medium hover:bg-blue-600 transition"
                  >
                    Create Task
                  </button>
                </div>
              </div>

              {/* Right: My Tasks */}
              <div className="bg-green-50 dark:bg-transparent dark:border dark:border-zinc-900 rounded-2xl p-6">
                <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-4">
                  My Assigned Tasks
                </h3>
                {myTasks.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📝</div>
                    <p className="text-gray-500 dark:text-gray-400">
                      No tasks assigned to you yet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[500px] overflow-y-auto">
                    {myTasks.map((task) => (
                      <div
                        key={task._id}
                        className="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-md border-l-4 border-blue-500"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-800 dark:text-white text-lg">
                              {task.taskName}
                            </h4>
                            {task.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {task.description}
                              </p>
                            )}
                          </div>
                          <select
                            value={task.status}
                            onChange={(e) =>
                              handleUpdateTaskStatus(task._id, e.target.value)
                            }
                            className={`text-xs px-3 py-1 rounded-full font-medium cursor-pointer ${
                              task.status === "completed"
                                ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                : task.status === "in-progress"
                                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                                : "bg-gray-200 text-gray-700 dark:bg-zinc-800 dark:text-gray-300"
                            }`}
                          >
                            <option value="pending">Pending</option>
                            <option value="in-progress">In Progress</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>

                        <div className="mt-3 space-y-2">
                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                            <svg
                              className="w-4 h-4 mr-2"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                            <span className="font-medium">Deadline:</span>
                            <span className="ml-2">
                              {new Date(task.deadline).toLocaleString()}
                            </span>
                          </div>

                          <div
                            className={`flex items-center text-sm font-bold ${
                              getDaysLeft(task.deadline) === "Overdue"
                                ? "text-red-600 dark:text-red-400"
                                : getHoursLeft(task.deadline).includes("hour")
                                ? "text-orange-600 dark:text-orange-400"
                                : "text-blue-600 dark:text-blue-400"
                            }`}
                          >
                            <svg
                              className="w-4 h-4 mr-2"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            {getHoursLeft(task.deadline)}
                          </div>

                          {task.assignedBy && (
                            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                              <img
                                src={task.assignedBy.avatar}
                                alt={task.assignedBy.username}
                                className="w-5 h-5 rounded-full mr-2"
                              />
                              <span>
                                Assigned by:{" "}
                                <span className="font-medium">
                                  {task.assignedBy.username}
                                </span>
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Poll Modal */}
      {showPollModal && (
        <div className="fixed inset-0 bg-black/70 dark:bg-black/95 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#101010] rounded-3xl p-6 md:p-8 w-full max-w-md">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-gray-800 small dark:text-white">
                📊 Create Poll
              </h2>
              <button
                onClick={() => setShowPollModal(false)}
                className="text-gray-400 cursor-pointer hover:text-gray-600 dark:hover:text-gray-200"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Question
                </label>
                <input
                  type="text"
                  value={pollForm.question}
                  onChange={(e) =>
                    setPollForm({ ...pollForm, question: e.target.value })
                  }
                  placeholder="What's your question?"
                  className="w-full px-4 py-2 rounded-2xl border border-gray-200 dark:border-zinc-800 focus:border-blue-400 dark:focus:border-blue-500 outline-none bg-white dark:bg-zinc-900 text-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Options
                </label>
                {pollForm.options.map((option, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...pollForm.options];
                        newOptions[index] = e.target.value;
                        setPollForm({ ...pollForm, options: newOptions });
                      }}
                      placeholder={`Option ${index + 1}`}
                      className="flex-1 px-4 py-2 rounded-2xl border border-gray-200 dark:border-zinc-800 focus:border-blue-400 dark:focus:border-blue-500 outline-none bg-white dark:bg-zinc-900 text-gray-800 dark:text-white"
                    />
                    {pollForm.options.length > 2 && (
                      <button
                        onClick={() => {
                          const newOptions = pollForm.options.filter(
                            (_, i) => i !== index
                          );
                          setPollForm({ ...pollForm, options: newOptions });
                        }}
                        className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() =>
                    setPollForm({
                      ...pollForm,
                      options: [...pollForm.options, ""],
                    })
                  }
                  className="w-full px-4 cursor-pointer py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-500 dark:hover:text-blue-400 transition"
                >
                  + Add Option
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Expires In (hours)
                </label>
                <input
                  type="number"
                  value={pollForm.expiresIn}
                  onChange={(e) =>
                    setPollForm({
                      ...pollForm,
                      expiresIn: parseInt(e.target.value),
                    })
                  }
                  min="1"
                  className="w-full px-4 py-2 rounded-2xl border border-gray-200 dark:border-zinc-800 focus:border-blue-400 dark:focus:border-blue-500 outline-none bg-white dark:bg-zinc-900 text-gray-800 dark:text-white"
                />
              </div>

              <button
                onClick={handleCreatePoll}
                className="w-full px-4 py-2 cursor-pointer bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-medium hover:shadow-lg transition"
              >
                Create Poll
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {showTaskDetailModal && selectedTaskDetail && (
        <div className="fixed inset-0 bg-black/70 dark:bg-black/95 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#101010] rounded-3xl p-6 md:p-8 w-full max-w-lg">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center">
                <span className="text-3xl mr-3">📋</span>
                Task Details
              </h2>
              <button
                onClick={() => setShowTaskDetailModal(false)}
                className="text-gray-400 cursor-pointer hover:text-gray-600 dark:hover:text-gray-200"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50  dark:bg-[#9381ff] p-4 rounded-2xl">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Task Name
                </label>
                <p className="text-lg font-bold text-gray-800 dark:text-white">
                  {selectedTaskDetail.taskName || "N/A"}
                </p>
              </div>

              {selectedTaskDetail.description && (
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <p className="text-gray-800 dark:text-white whitespace-pre-wrap">
                    {selectedTaskDetail.description}
                  </p>
                </div>
              )}

              {selectedTaskDetail.assignedTo && (
                <div className="bg-green-50 dark:bg-zinc-900 p-4 rounded-2xl">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Assigned To
                  </label>
                  <div className="flex items-center space-x-3">
                    <img
                      src={selectedTaskDetail.assignedTo.avatar}
                      alt={selectedTaskDetail.assignedTo.username}
                      className="w-10 h-10 rounded-full"
                    />
                    <span className="font-medium text-gray-800 dark:text-white">
                      {selectedTaskDetail.assignedTo.username}
                    </span>
                  </div>
                </div>
              )}

              {selectedTaskDetail.deadline && (
                <div className="bg-amber-50 dark:bg-zinc-900 p-4 rounded-2xl">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Deadline
                  </label>
                  <p className="text-lg font-semibold text-gray-800 dark:text-white">
                    {new Date(selectedTaskDetail.deadline).toLocaleString(
                      "en-US",
                      {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </p>
                  <p className="text-sm text-amber-600 dark:text-amber-400 mt-1 font-bold">
                    {getDaysLeft(selectedTaskDetail.deadline)}
                  </p>
                </div>
              )}
            </div>

            {/* <button
              onClick={() => setShowTaskDetailModal(false)}
              className="w-full mt-6 px-4 cursor-pointer py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-medium hover:shadow-lg transition"
            >
              Close
            </button> */}
          </div>
        </div>
      )}

      {/* Document Modal */}
      {showDocumentModal && (
        <div className="fixed inset-0 bg-black/70 dark:bg-black/95 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#101010] rounded-3xl p-6 md:p-8 w-full max-w-6xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold text-gray-800 small dark:text-white">
                📄 Documents
              </h2>
              <button
                onClick={() => {
                  setShowDocumentModal(false);
                  setDocumentSearchQuery("");
                  setDocumentSearchResults([]);
                }}
                className="text-gray-400 cursor-pointer hover:text-gray-600 dark:hover:text-gray-200"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 overflow-hidden">
              {/* Left: Upload Document Form */}
              <div className="bg-purple-50 dark:bg-transparent dark:border dark:border-zinc-900 rounded-2xl p-6">
                <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-4">
                  Upload Document
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Select File (Max 50MB)
                    </label>
                    <input
                      type="file"
                      ref={documentInputRef}
                      onChange={handleDocumentSelect}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:cursor-pointer dark:file:bg-blue-900 dark:file:text-blue-300"
                    />
                  </div>

                  {previewFile && (
                    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center space-x-3">
                        <div className="text-4xl">📄</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 dark:text-white truncate">
                            {previewFile.name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {formatFileSize(previewFile.size)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description (Optional)
                    </label>
                    <textarea
                      placeholder="Add a description for this document..."
                      value={documentForm.description}
                      onChange={(e) =>
                        setDocumentForm({
                          ...documentForm,
                          description: e.target.value,
                        })
                      }
                      rows={3}
                      className="w-full px-4 py-2 rounded-2xl border border-gray-200 dark:border-zinc-800 focus:border-purple-400 dark:focus:border-purple-500 outline-none bg-white dark:bg-zinc-900 text-gray-800 dark:text-white"
                    />
                  </div>

                  <button
                    onClick={handleUploadDocument}
                    disabled={!previewFile || uploadingDocument}
                    className="w-full px-4 py-3 cursor-pointer bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {uploadingDocument ? "Uploading..." : "Upload Document"}
                  </button>
                </div>
              </div>

              {/* Right: Documents List with Search */}
              <div className="bg-gray-50 dark:bg-transparent rounded-2xl p-6 flex flex-col">
                <div className="mb-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Search documents..."
                      value={documentSearchQuery}
                      onChange={(e) => setDocumentSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && searchDocuments()}
                      className="flex-1 px-4 py-2 rounded-2xl border border-gray-200 dark:border-zinc-800 focus:border-purple-400 dark:focus:border-purple-500 outline-none bg-white dark:bg-zinc-900 text-gray-800 dark:text-white text-sm"
                    />
                    {/* <button
                      onClick={searchDocuments}
                      disabled={searchingDocuments}
                      className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition disabled:bg-gray-400"
                    >
                      {searchingDocuments ? "..." : "🔍"}
                    </button> */}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3">
                  {(documentSearchQuery ? documentSearchResults : documents)
                    .length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">📂</div>
                      <p className="text-gray-500 dark:text-gray-400">
                        {documentSearchQuery
                          ? "No documents found"
                          : "No documents uploaded yet"}
                      </p>
                    </div>
                  ) : (
                    (documentSearchQuery
                      ? documentSearchResults
                      : documents
                    ).map((doc) => (
                      <div
                        key={doc._id}
                        className="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-md hover:shadow-lg transition"
                      >
                        <div className="flex items-start space-x-3">
                          <div className="text-3xl">📄</div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-800 dark:text-white truncate">
                              {doc.fileName}
                            </h4>
                            {doc.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {doc.description}
                              </p>
                            )}
                            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                              <span>{formatFileSize(doc.fileSize)}</span>
                              <span>•</span>
                              <div className="flex items-center space-x-1">
                                <img
                                  src={doc.uploadedBy.avatar}
                                  alt={doc.uploadedBy.username}
                                  className="w-4 h-4 rounded-full"
                                />
                                <span>{doc.uploadedBy.username}</span>
                              </div>
                              <span>•</span>
                              <span>
                                {new Date(doc.uploadedAt).toLocaleDateString()}
                              </span>
                            </div>

                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={() => handleViewDocument(doc)}
                                className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-medium hover:bg-blue-200 dark:hover:bg-blue-800 transition"
                              >
                                View
                              </button>
                              <button
                                onClick={() => handleDownloadDocument(doc)}
                                className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg text-xs font-medium hover:bg-green-200 dark:hover:bg-green-800 transition"
                              >
                                Download
                              </button>
                              <button
                                onClick={() => {
                                  handleShareDocumentInChat(doc);
                                  setShowDocumentModal(false);
                                }}
                                className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-lg text-xs font-medium hover:bg-purple-200 dark:hover:bg-purple-800 transition"
                              >
                                Share
                              </button>
                              {(doc.uploadedBy._id === currentUser.id ||
                                selectedChat?.members?.find(
                                  (m) => m.userId._id === currentUser.id
                                )?.role === "admin") && (
                                <button
                                  onClick={() => handleDeleteDocument(doc._id)}
                                  className="px-3 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg text-xs font-medium hover:bg-red-200 dark:hover:bg-red-800 transition"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Group Info Modal */}
      {showGroupInfoModal && selectedChat && chatType === "group" && (
        <div className="fixed inset-0 bg-black/70 dark:bg-black/95 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#101010] rounded-3xl p-6 md:p-8 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-gray-800 small dark:text-white">
                Group Info
              </h2>
              <button
                onClick={() => setShowGroupInfoModal(false)}
                className="text-gray-400 cursor-pointer hover:text-gray-600 dark:hover:text-gray-200"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="text-center mb-6">
              <img
                src={selectedChat.avatar}
                alt={selectedChat.name}
                className="w-24 h-24 rounded-full mx-auto mb-4 ring-4 ring-green-100 dark:ring-green-900"
              />
              <h3 className="text-3xl font-bold small text-gray-800 dark:text-white">
                {selectedChat.name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {selectedChat.description}
              </p>
            </div>

            <div className="mb-6">
              <h4 className="font-semibold text-gray-800 dark:text-white mb-3">
                Members ({selectedChat.members?.length})
              </h4>
              <div className="space-y-2 grid lg:grid-cols-2 gap-4 max-h-60 overflow-y-auto">
                {selectedChat.members?.map((member) => {
                  const isAdmin = member.role === "admin";
                  const isCurrentUserAdmin =
                    selectedChat.members?.find(
                      (m) => m.userId._id === currentUser.id
                    )?.role === "admin";

                  return (
                    <div
                      key={member.userId._id}
                      className="flex items-center justify-between h-16 px-4 bg-gray-50 dark:bg-zinc-800 rounded-2xl"
                    >
                      <div className="flex items-center space-x-3">
                        <img
                          src={member.userId.avatar}
                          alt={member.userId.username}
                          className="w-10 h-10 rounded-full"
                        />
                        <div>
                          <p className="font-medium text-gray-800 dark:text-white">
                            {member.userId.username}
                          </p>
                          {isAdmin && (
                            <span className="text-xs text-green-600 dark:text-green-400">
                              Admin
                            </span>
                          )}
                        </div>
                      </div>
                      {isCurrentUserAdmin &&
                        member.userId._id !== currentUser.id && (
                          <div className="flex gap-2">
                            {!isAdmin ? (
                              <button
                                onClick={() =>
                                  handlePromoteMember(member.userId._id)
                                }
                                className="text-xs cursor-pointer px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                              >
                                Promote
                              </button>
                            ) : (
                              selectedChat.admin.toString() !==
                                member.userId._id && (
                                <button
                                  onClick={() =>
                                    handleDemoteMember(member.userId._id)
                                  }
                                  className="text-xs px-3 cursor-pointer py-1 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                                >
                                  Demote
                                </button>
                              )
                            )}
                            <button
                              onClick={() =>
                                handleRemoveMember(member.userId._id)
                              }
                              className="text-xs px-3 py-1 cursor-pointer bg-red-500 text-white rounded-lg hover:bg-red-600"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* <div className="mb-6">
              <h4 className="font-semibold text-gray-800 dark:text-white mb-3">
                Important Links
              </h4>
              {selectedChat.importantLinks &&
              selectedChat.importantLinks.length > 0 ? (
                <div className="space-y-2 mb-3">
                  {selectedChat.importantLinks.map((link) => (
                    <div
                      key={link._id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex-1">
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline font-medium"
                        >
                          {link.title}
                        </a>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {link.url}
                        </p>
                      </div>
                      {selectedChat.members?.find(
                        (m) => m.userId._id === currentUser.id
                      )?.role === "admin" && (
                        <button
                          onClick={() =>
                            axios
                              .delete(
                                `${API_URL}/groups/${selectedChat._id}/links/${link._id}`
                              )
                              .then(() => {
                                selectChat(selectedChat, "group");
                              })
                          }
                          className="text-red-500 hover:text-red-600 ml-2"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  No links added yet
                </p>
              )}

              {selectedChat.members?.find(
                (m) => m.userId._id === currentUser.id
              )?.role === "admin" && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Link title"
                    value={linkForm.title}
                    onChange={(e) =>
                      setLinkForm({ ...linkForm, title: e.target.value })
                    }
                    className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 focus:border-blue-400 dark:focus:border-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                  />
                  <input
                    type="url"
                    placeholder="URL"
                    value={linkForm.url}
                    onChange={(e) =>
                      setLinkForm({ ...linkForm, url: e.target.value })
                    }
                    className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 focus:border-blue-400 dark:focus:border-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                  />
                  <button
                    onClick={handleAddLink}
                    className="px-4 py-2 bg-blue-500 cursor-pointer text-white text-sm rounded-lg hover:bg-blue-600"
                  >
                    Add
                  </button>
                </div>
              )}
            </div> */}

            {selectedChat.createdBy._id === currentUser.id && (
              <button
                onClick={handleDeleteGroup}
                className="w-full px-4 py-2 bg-red-500 cursor-pointer text-white rounded-xl font-medium hover:bg-red-600 transition"
              >
                Delete Group
              </button>
            )}
          </div>
        </div>
      )}

      {/* Reactions Info Modal */}
      {showReactionsInfo && selectedReactionsInfo && (
        <div
          className="fixed inset-0 bg-black/70 dark:bg-black/95 flex items-center justify-center z-50 p-4"
          onClick={() => setShowReactionsInfo(false)}
        >
          <div
            className="bg-white dark:bg-[#101010] rounded-3xl p-6 md:p-8 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-black small dark:text-white">
                Reactions
              </h2>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {selectedReactionsInfo.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No reactions yet
                </p>
              ) : (
                selectedReactionsInfo.map((reaction, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <img
                        src={reaction.userId.avatar}
                        alt={reaction.userId.username}
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <p className="font-medium text-black small dark:text-white">
                          {reaction.userId.username}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(reaction.timestamp).toLocaleString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-3xl">{reaction.emoji}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Message Info Modal */}
      {showMessageInfo && selectedMessageInfo && (
        <div
          className="fixed inset-0 bg-black/70 dark:bg-black/95 flex items-center justify-center z-50 p-4"
          onClick={() => setShowMessageInfo(false)}
        >
          <div
            className="bg-white dark:bg-[#101010] rounded-3xl p-6 md:p-8 w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-black small dark:text-white">
                Message Info
              </h2>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <svg
                    className="w-5 h-5 text-blue-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Sent
                  </label>
                </div>
                <p className="text-gray-800 dark:text-white font-semibold">
                  {new Date(selectedMessageInfo.timestamp).toLocaleString(
                    "en-US",
                    {
                      weekday: "short",
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    }
                  )}
                </p>
              </div>

              {selectedMessageInfo.deliveredTo &&
                selectedMessageInfo.deliveredTo.length > 0 && (
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-3">
                      <svg
                        className="w-5 h-5 text-green-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Delivered to {selectedMessageInfo.deliveredTo.length}{" "}
                        {selectedMessageInfo.deliveredTo.length === 1
                          ? "person"
                          : "people"}
                      </label>
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {selectedMessageInfo.deliveredTo.map(
                        (delivery, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 bg-white dark:bg-[#101010] rounded-lg"
                          >
                            <div className="flex items-center space-x-2">
                              <img
                                src={delivery.userId.avatar}
                                alt={delivery.userId.username}
                                className="w-8 h-8 rounded-full"
                              />
                              <span className="text-gray-800 dark:text-white font-medium text-sm">
                                {delivery.userId.username}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(delivery.timestamp).toLocaleTimeString(
                                [],
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

              {selectedMessageInfo.readBy &&
                selectedMessageInfo.readBy.length > 0 && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-3">
                      <svg
                        className="w-5 h-5 text-blue-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                        />
                      </svg>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Read by {selectedMessageInfo.readBy.length}{" "}
                        {selectedMessageInfo.readBy.length === 1
                          ? "person"
                          : "people"}
                      </label>
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {selectedMessageInfo.readBy.map((read, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-white dark:bg-[#101010] rounded-lg"
                        >
                          <div className="flex items-center space-x-2">
                            <img
                              src={read.userId.avatar}
                              alt={read.userId.username}
                              className="w-8 h-8 rounded-full"
                            />
                            <span className="text-gray-800 dark:text-white font-medium text-sm">
                              {read.userId.username}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(read.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              <div className="flex justify-center">
                <span
                  className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${
                    selectedMessageInfo.status === "read"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                      : selectedMessageInfo.status === "delivered"
                      ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                      : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                  }`}
                >
                  Status:{" "}
                  {selectedMessageInfo.status.charAt(0).toUpperCase() +
                    selectedMessageInfo.status.slice(1)}
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowMessageInfo(false)}
              className="w-full mt-6 px-4 cursor-pointer py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-medium hover:shadow-lg transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && selectedImage && (
        <div
          className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4"
          onClick={() => setShowImageModal(false)}
        >
          <button
            onClick={() => setShowImageModal(false)}
            className="absolute top-4 right-4 text-white text-3xl hover:text-gray-300"
          >
            ✕
          </button>
          <img
            src={selectedImage}
            alt="Full size"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
