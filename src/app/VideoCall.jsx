'use client';

import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import toast from 'react-hot-toast';

const VideoCall = ({ 
  socket, 
  currentUser, 
  roomId, 
  callType, 
  isGroup,
  groupName,
  receiverInfo,
  onEndCall,
  darkMode 
}) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [screenStream, setScreenStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === 'audio');
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [raisedHands, setRaisedHands] = useState([]);
  const [meetingMinutes, setMeetingMinutes] = useState([]);
  const [showMinutes, setShowMinutes] = useState(false);
  const [minutesPIP, setMinutesPIP] = useState(false);
  const [newMinute, setNewMinute] = useState('');
  const [editingMinute, setEditingMinute] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const [gridView, setGridView] = useState(true);
  const [pinnedUser, setPinnedUser] = useState(null);
  const [showParticipants, setShowParticipants] = useState(false);
  const [sharingUser, setSharingUser] = useState(null);

  const localVideoRef = useRef(null);
  const peerConnections = useRef(new Map());
  const screenPeerConnections = useRef(new Map());
  const remoteVideoRefs = useRef(new Map());
  const screenShareRef = useRef(null);
  const callStartTime = useRef(Date.now());
  const minutesContainerRef = useRef(null);

  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ]
  };

  // ==========================================
  // INITIALIZE CALL - FIXED
  // ==========================================
  useEffect(() => {
    initializeCall();
    
    return () => {
      cleanup();
    };
  }, []);

  const initializeCall = async () => {
    try {
      // Request permissions explicitly
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: callType === 'video' ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } : false
      };

      console.log('Requesting media with constraints:', constraints);
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      console.log('Got local stream:', stream);
      console.log('Audio tracks:', stream.getAudioTracks());
      console.log('Video tracks:', stream.getVideoTracks());
      
      setLocalStream(stream);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true; // Mute local to prevent echo
        
        // Ensure video plays
        try {
          await localVideoRef.current.play();
        } catch (playError) {
          console.error('Error playing local video:', playError);
        }
      }

      socket.emit('joinCallRoom', { roomId, userId: currentUser.id });

      toast.success('Connected to call');
    } catch (error) {
      console.error('Error accessing media devices:', error);
      
      if (error.name === 'NotAllowedError') {
        toast.error('Camera/Microphone permission denied. Please allow access and refresh.');
      } else if (error.name === 'NotFoundError') {
        toast.error('No camera/microphone found');
      } else {
        toast.error('Failed to access camera/microphone: ' + error.message);
      }
    }
  };

  // ==========================================
  // CALL DURATION TIMER
  // ==========================================
  useEffect(() => {
    const interval = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - callStartTime.current) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // ==========================================
  // SOCKET LISTENERS
  // ==========================================
  useEffect(() => {
    if (!socket) return;

    socket.on('userJoinedCall', handleUserJoined);
    socket.on('userLeftCall', handleUserLeft);
    socket.on('webrtcOffer', handleWebRTCOffer);
    socket.on('webrtcAnswer', handleWebRTCAnswer);
    socket.on('iceCandidate', handleICECandidate);
    socket.on('userToggledAudio', handleRemoteAudioToggle);
    socket.on('userToggledVideo', handleRemoteVideoToggle);
    socket.on('userStartedScreenShare', handleUserStartedScreenShare);
    socket.on('userStoppedScreenShare', handleUserStoppedScreenShare);
    socket.on('screenShareOffer', handleScreenShareOffer);
    socket.on('screenShareAnswer', handleScreenShareAnswer);
    socket.on('screenShareIceCandidate', handleScreenShareICECandidate);
    socket.on('userRaisedHand', handleUserRaisedHand);
    socket.on('allHandsLowered', handleAllHandsLowered);
    socket.on('meetingMinuteAdded', handleMeetingMinuteAdded);
    socket.on('meetingMinuteUpdated', handleMeetingMinuteUpdated);
    socket.on('meetingMinuteDeleted', handleMeetingMinuteDeleted);
    socket.on('currentParticipants', handleCurrentParticipants);

    return () => {
      socket.off('userJoinedCall', handleUserJoined);
      socket.off('userLeftCall', handleUserLeft);
      socket.off('webrtcOffer', handleWebRTCOffer);
      socket.off('webrtcAnswer', handleWebRTCAnswer);
      socket.off('iceCandidate', handleICECandidate);
      socket.off('userToggledAudio', handleRemoteAudioToggle);
      socket.off('userToggledVideo', handleRemoteVideoToggle);
      socket.off('userStartedScreenShare', handleUserStartedScreenShare);
      socket.off('userStoppedScreenShare', handleUserStoppedScreenShare);
      socket.off('screenShareOffer', handleScreenShareOffer);
      socket.off('screenShareAnswer', handleScreenShareAnswer);
      socket.off('screenShareIceCandidate', handleScreenShareICECandidate);
      socket.off('userRaisedHand', handleUserRaisedHand);
      socket.off('allHandsLowered', handleAllHandsLowered);
      socket.off('meetingMinuteAdded', handleMeetingMinuteAdded);
      socket.off('meetingMinuteUpdated', handleMeetingMinuteUpdated);
      socket.off('meetingMinuteDeleted', handleMeetingMinuteDeleted);
      socket.off('currentParticipants', handleCurrentParticipants);
    };
  }, [socket]);

  useEffect(() => {
    if (showMinutes && !minutesPIP) {
      gsap.fromTo('.minutes-panel',
        { x: 400, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }
      );
    }
  }, [showMinutes, minutesPIP]);

  useEffect(() => {
    const cards = document.querySelectorAll('.participant-card');
    gsap.fromTo(cards,
      { scale: 0.8, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.3, stagger: 0.1, ease: 'back.out(1.7)' }
    );
  }, [participants, remoteStreams]);

  // ==========================================
  // CREATE PEER CONNECTION - FIXED
  // ==========================================
  const createPeerConnection = async (socketId, userId, isInitiator) => {
    if (peerConnections.current.has(socketId)) {
      console.log('Peer connection already exists for', socketId);
      return peerConnections.current.get(socketId);
    }

    console.log('Creating peer connection for', socketId, 'isInitiator:', isInitiator);

    const peerConnection = new RTCPeerConnection(iceServers);
    peerConnections.current.set(socketId, peerConnection);

    // Add local stream tracks
    if (localStream) {
      localStream.getTracks().forEach(track => {
        console.log('Adding local track:', track.kind, track.label);
        peerConnection.addTrack(track, localStream);
      });
    }

    // Handle incoming tracks - FIXED
    peerConnection.ontrack = (event) => {
      console.log('Received remote track:', event.track.kind, 'from', userId);
      const [remoteStream] = event.streams;
      
      console.log('Remote stream tracks:', remoteStream.getTracks());
      
      setRemoteStreams(prev => {
        const newMap = new Map(prev);
        newMap.set(userId, remoteStream);
        return newMap;
      });

      // Ensure video element plays - FIXED
      setTimeout(() => {
        const videoElement = remoteVideoRefs.current.get(userId);
        if (videoElement) {
          videoElement.srcObject = remoteStream;
          videoElement.muted = false; // IMPORTANT: Unmute remote videos
          videoElement.volume = 1.0; // Set volume to max
          
          // Try to play
          videoElement.play().catch(err => {
            console.error('Error playing remote video:', err);
            // User interaction required, show a button
            toast.error('Click on the video to enable audio');
          });
        }
      }, 100);
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('Sending ICE candidate');
        socket.emit('iceCandidate', {
          roomId,
          candidate: event.candidate,
          targetSocketId: socketId
        });
      }
    };

    peerConnection.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', peerConnection.iceConnectionState);
      if (peerConnection.iceConnectionState === 'failed') {
        console.error('ICE connection failed, attempting restart');
        peerConnection.restartIce();
      }
    };

    peerConnection.onconnectionstatechange = () => {
      console.log('Connection state:', peerConnection.connectionState);
    };

    if (isInitiator) {
      try {
        const offer = await peerConnection.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: callType === 'video'
        });
        await peerConnection.setLocalDescription(offer);
        
        console.log('Sending offer to', socketId);
        socket.emit('webrtcOffer', {
          roomId,
          offer,
          targetSocketId: socketId
        });
      } catch (error) {
        console.error('Error creating offer:', error);
      }
    }

    return peerConnection;
  };

  const handleCurrentParticipants = async ({ participants: existingParticipants, meetingMinutes: existingMinutes }) => {
    console.log('Current participants:', existingParticipants);
    setParticipants(existingParticipants);
    setMeetingMinutes(existingMinutes);

    existingParticipants.forEach(participant => {
      if (participant.userId !== currentUser.id && participant.socketId) {
        createPeerConnection(participant.socketId, participant.userId, true);
      }
    });
  };

  const handleUserJoined = ({ userId, socketId, username, avatar }) => {
    console.log('User joined:', username, socketId);
    setParticipants(prev => {
      if (prev.some(p => p.userId === userId)) return prev;
      return [...prev, { userId, username, avatar, socketId }];
    });

    createPeerConnection(socketId, userId, true);
    
    toast.success(`${username} joined the call`);
  };

  const handleUserLeft = ({ userId }) => {
    console.log('User left:', userId);
    setParticipants(prev => prev.filter(p => p.userId !== userId));
    setRemoteStreams(prev => {
      const newMap = new Map(prev);
      newMap.delete(userId);
      return newMap;
    });

    // Close peer connections for this user
    peerConnections.current.forEach((pc, socketId) => {
      // We can't easily determine which socketId belongs to userId
      // So we'll close all and let them reconnect
    });

    const participant = participants.find(p => p.userId === userId);
    if (participant) {
      toast.info(`${participant.username} left the call`);
    }
  };

  const handleWebRTCOffer = async ({ offer, senderSocketId }) => {
    try {
      console.log('Received offer from', senderSocketId);
      const peerConnection = await createPeerConnection(senderSocketId, null, false);
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      
      console.log('Sending answer to', senderSocketId);
      socket.emit('webrtcAnswer', {
        roomId,
        answer,
        targetSocketId: senderSocketId
      });
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  };

  const handleWebRTCAnswer = async ({ answer, senderSocketId }) => {
    try {
      console.log('Received answer from', senderSocketId);
      const peerConnection = peerConnections.current.get(senderSocketId);
      if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      }
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  };

  const handleICECandidate = async ({ candidate, senderSocketId }) => {
    try {
      const peerConnection = peerConnections.current.get(senderSocketId);
      if (peerConnection && peerConnection.remoteDescription) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  };

  // ==========================================
  // TOGGLE AUDIO - FIXED
  // ==========================================
  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        socket.emit('toggleAudio', { roomId, userId: currentUser.id, isMuted: !audioTrack.enabled });
        
        toast.success(audioTrack.enabled ? '🎤 Microphone on' : '🔇 Microphone muted');
      } else {
        toast.error('No audio track found');
      }
    }
  };

  // ==========================================
  // TOGGLE VIDEO - FIXED
  // ==========================================
  const toggleVideo = async () => {
    if (callType === 'audio') {
      toast.error('Video not available in audio call');
      return;
    }

    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
        socket.emit('toggleVideo', { roomId, userId: currentUser.id, isVideoOff: !videoTrack.enabled });
        
        toast.success(videoTrack.enabled ? '📹 Camera on' : '📹 Camera off');
      } else {
        // Try to add video track if not available
        try {
          const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
          const videoTrack = videoStream.getVideoTracks()[0];
          localStream.addTrack(videoTrack);
          
          // Add to all peer connections
          peerConnections.current.forEach(pc => {
            pc.addTrack(videoTrack, localStream);
          });
          
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStream;
          }
          
          setIsVideoOff(false);
          toast.success('📹 Camera on');
        } catch (error) {
          console.error('Error enabling video:', error);
          toast.error('Failed to enable camera');
        }
      }
    }
  };

  const handleRemoteAudioToggle = ({ userId, isMuted }) => {
    setParticipants(prev => prev.map(p => 
      p.userId === userId ? { ...p, isMuted } : p
    ));
  };

  const handleRemoteVideoToggle = ({ userId, isVideoOff }) => {
    setParticipants(prev => prev.map(p => 
      p.userId === userId ? { ...p, isVideoOff } : p
    ));
  };

  // ==========================================
  // SCREEN SHARE - FIXED
  // ==========================================
  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          displaySurface: 'monitor'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });

      console.log('Got screen share stream:', stream);

      setScreenStream(stream);
      setIsSharingScreen(true);
      setSharingUser(currentUser.id);

      if (screenShareRef.current) {
        screenShareRef.current.srcObject = stream;
        screenShareRef.current.muted = false; // Unmute to hear system audio
        try {
          await screenShareRef.current.play();
        } catch (playError) {
          console.error('Error playing screen share:', playError);
        }
      }

      socket.emit('startScreenShare', { roomId, userId: currentUser.id });

      // Create screen share peer connections for each participant
      participants.forEach(participant => {
        if (participant.socketId) {
          createScreenSharePeerConnection(participant.socketId, stream);
        }
      });

      // Handle when user stops sharing via browser UI
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };

      toast.success('🖥️ Screen sharing started');
    } catch (error) {
      console.error('Error starting screen share:', error);
      if (error.name === 'NotAllowedError') {
        toast.error('Screen sharing permission denied');
      } else {
        toast.error('Failed to start screen sharing');
      }
    }
  };

  const createScreenSharePeerConnection = async (socketId, stream) => {
    try {
      const peerConnection = new RTCPeerConnection(iceServers);
      screenPeerConnections.current.set(socketId, peerConnection);

      stream.getTracks().forEach(track => {
        console.log('Adding screen share track:', track.kind);
        peerConnection.addTrack(track, stream);
      });

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('screenShareIceCandidate', {
            roomId,
            candidate: event.candidate,
            targetSocketId: socketId
          });
        }
      };

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      
      console.log('Sending screen share offer to', socketId);
      socket.emit('screenShareOffer', {
        roomId,
        offer,
        targetSocketId: socketId
      });
    } catch (error) {
      console.error('Error creating screen share peer connection:', error);
    }
  };

  const stopScreenShare = () => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
      setIsSharingScreen(false);
      setSharingUser(null);

      screenPeerConnections.current.forEach(pc => pc.close());
      screenPeerConnections.current.clear();

      if (screenShareRef.current) {
        screenShareRef.current.srcObject = null;
      }

      socket.emit('stopScreenShare', { roomId, userId: currentUser.id });
      
      toast.success('🖥️ Screen sharing stopped');
    }
  };

  const handleUserStartedScreenShare = ({ userId, socketId }) => {
    console.log('User started screen share:', userId);
    setSharingUser(userId);
    const participant = participants.find(p => p.userId === userId);
    if (participant) {
      toast.info(`${participant.username} started screen sharing`);
    }
  };

  const handleUserStoppedScreenShare = ({ userId }) => {
    console.log('User stopped screen share:', userId);
    if (sharingUser === userId) {
      setSharingUser(null);
      if (screenShareRef.current) {
        screenShareRef.current.srcObject = null;
      }
      setScreenStream(null);
    }
  };

  const handleScreenShareOffer = async ({ offer, senderSocketId }) => {
    try {
      console.log('Received screen share offer from', senderSocketId);
      const peerConnection = new RTCPeerConnection(iceServers);
      screenPeerConnections.current.set(senderSocketId, peerConnection);

      peerConnection.ontrack = (event) => {
        console.log('Received screen share track:', event.track.kind);
        const [stream] = event.streams;
        setScreenStream(stream);
        
        if (screenShareRef.current) {
          screenShareRef.current.srcObject = stream;
          screenShareRef.current.muted = false; // Unmute to hear audio
          screenShareRef.current.play().catch(err => {
            console.error('Error playing screen share:', err);
          });
        }
      };

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('screenShareIceCandidate', {
            roomId,
            candidate: event.candidate,
            targetSocketId: senderSocketId
          });
        }
      };

      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      console.log('Sending screen share answer to', senderSocketId);
      socket.emit('screenShareAnswer', {
        roomId,
        answer,
        targetSocketId: senderSocketId
      });
    } catch (error) {
      console.error('Error handling screen share offer:', error);
    }
  };

  const handleScreenShareAnswer = async ({ answer, senderSocketId }) => {
    try {
      const peerConnection = screenPeerConnections.current.get(senderSocketId);
      if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      }
    } catch (error) {
      console.error('Error handling screen share answer:', error);
    }
  };

  const handleScreenShareICECandidate = async ({ candidate, senderSocketId }) => {
    try {
      const peerConnection = screenPeerConnections.current.get(senderSocketId);
      if (peerConnection && peerConnection.remoteDescription) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error('Error adding screen share ICE candidate:', error);
    }
  };

  const toggleHandRaise = () => {
    const newState = !isHandRaised;
    setIsHandRaised(newState);
    socket.emit('raiseHand', { roomId, userId: currentUser.id, isRaised: newState });
    
    if (newState) {
      setRaisedHands(prev => [...prev, currentUser.id]);
      toast.success('Hand raised');
    } else {
      setRaisedHands(prev => prev.filter(id => id !== currentUser.id));
      toast.info('Hand lowered');
    }
  };

  const handleUserRaisedHand = ({ userId, isRaised, username }) => {
    if (isRaised) {
      setRaisedHands(prev => [...prev, userId]);
      toast(`${username} raised their hand`, { icon: '✋' });
    } else {
      setRaisedHands(prev => prev.filter(id => id !== userId));
    }
  };

  const handleAllHandsLowered = () => {
    setRaisedHands([]);
    setIsHandRaised(false);
    toast.info('All hands lowered');
  };

  const lowerAllHands = () => {
    socket.emit('lowerAllHands', { roomId });
    setRaisedHands([]);
    setIsHandRaised(false);
  };

  const addMeetingMinute = () => {
    if (!newMinute.trim()) return;

    socket.emit('addMeetingMinute', {
      roomId,
      userId: currentUser.id,
      content: newMinute,
      timestamp: new Date()
    });

    setNewMinute('');
    toast.success('Note added');
  };

  const handleMeetingMinuteAdded = (minute) => {
    setMeetingMinutes(prev => [...prev, minute]);
    
    if (minutesContainerRef.current) {
      setTimeout(() => {
        minutesContainerRef.current.scrollTop = minutesContainerRef.current.scrollHeight;
      }, 100);
    }
  };

  const updateMeetingMinute = (minuteId, content) => {
    socket.emit('updateMeetingMinute', { roomId, minuteId, content });
    setEditingMinute(null);
  };

  const handleMeetingMinuteUpdated = ({ minuteId, content }) => {
    setMeetingMinutes(prev => prev.map(m => 
      m.id === minuteId ? { ...m, content, updatedAt: new Date() } : m
    ));
  };

  const deleteMeetingMinute = (minuteId) => {
    if (confirm('Delete this note?')) {
      socket.emit('deleteMeetingMinute', { roomId, minuteId });
    }
  };

  const handleMeetingMinuteDeleted = ({ minuteId }) => {
    setMeetingMinutes(prev => prev.filter(m => m.id !== minuteId));
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const cleanup = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
    }

    peerConnections.current.forEach(pc => pc.close());
    screenPeerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
    screenPeerConnections.current.clear();

    socket.emit('leaveCall', { roomId, userId: currentUser.id });
  };

  const handleEndCall = () => {
    cleanup();
    onEndCall();
  };

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <div className={`fixed inset-0 z-[100] ${darkMode ? 'dark' : ''} bg-gray-900`}>
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-white">
              <h2 className="text-xl md:text-2xl font-bold">
                {isGroup ? groupName : receiverInfo?.username}
              </h2>
              <div className="flex items-center space-x-2 text-sm text-gray-300">
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></span>
                  {formatDuration(callDuration)}
                </span>
                <span>•</span>
                <span>{participants.length + 1} participant{participants.length > 0 ? 's' : ''}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {raisedHands.length > 0 && (
              <div className="bg-yellow-500 text-black px-3 py-1 rounded-full text-sm font-semibold flex items-center space-x-1">
                <span>✋</span>
                <span>{raisedHands.length}</span>
              </div>
            )}
            
            <button
              onClick={() => setShowParticipants(!showParticipants)}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span className="hidden md:inline">Participants</span>
            </button>

            <button
              onClick={() => setGridView(!gridView)}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition"
              title={gridView ? 'Switch to Speaker View' : 'Switch to Grid View'}
            >
              {gridView ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Video Area */}
      <div className="h-full flex">
        {/* Video Grid */}
        <div className={`flex-1 p-4 ${showMinutes && !minutesPIP ? 'mr-96' : ''} transition-all duration-300`}>
          {/* Screen Share Display */}
          {screenStream && sharingUser && (
            <div className="h-full flex items-center justify-center mb-4">
              <div className="relative w-full h-[70vh] bg-black rounded-2xl overflow-hidden shadow-2xl">
                <video
                  ref={screenShareRef}
                  autoPlay
                  playsInline
                  muted={false}
                  className="w-full h-full object-contain"
                />
                <div className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>
                    {sharingUser === currentUser.id 
                      ? 'You are sharing' 
                      : `${participants.find(p => p.userId === sharingUser)?.username || 'Someone'} is sharing`
                    }
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Participants Grid */}
          <div className={`grid gap-4 h-full ${
            screenStream 
              ? 'grid-cols-4 h-[25vh]' 
              : gridView 
                ? participants.length === 0 
                  ? 'grid-cols-1' 
                  : participants.length === 1 
                    ? 'grid-cols-2' 
                    : participants.length <= 4 
                      ? 'grid-cols-2' 
                      : 'grid-cols-3'
                : 'grid-cols-1'
          }`}>
            {/* Local Video */}
            <div className={`participant-card relative bg-gray-800 rounded-2xl overflow-hidden shadow-xl ${
              pinnedUser === currentUser.id && !gridView ? 'col-span-2 row-span-2' : ''
            }`}>
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              {isVideoOff && (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-900 to-purple-900">
                  <div className="text-center">
                    <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
                      <span className="text-4xl">{currentUser.username[0].toUpperCase()}</span>
                    </div>
                    <p className="text-white font-semibold">{currentUser.username}</p>
                  </div>
                </div>
              )}
              
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                <div className="bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full">
                  <span className="text-white text-sm font-medium">You {isHandRaised && '✋'}</span>
                </div>
                {isMuted && (
                  <div className="bg-red-500 p-2 rounded-full">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    </svg>
                  </div>
                )}
              </div>

              <button
                onClick={() => setPinnedUser(pinnedUser === currentUser.id ? null : currentUser.id)}
                className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 p-2 rounded-full transition"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>
            </div>

            {/* Remote Videos */}
            {Array.from(remoteStreams.entries()).map(([userId, stream]) => {
              const participant = participants.find(p => p.userId === userId);
              if (!participant) return null;

              return (
                <div 
                  key={userId} 
                  className={`participant-card relative bg-gray-800 rounded-2xl overflow-hidden shadow-xl ${
                    pinnedUser === userId && !gridView ? 'col-span-2 row-span-2' : ''
                  }`}
                  onClick={() => {
                    // Enable audio on click if not playing
                    const videoEl = remoteVideoRefs.current.get(userId);
                    if (videoEl && videoEl.paused) {
                      videoEl.play().catch(e => console.log('Play error:', e));
                    }
                  }}
                >
                  <video
                    ref={el => {
                      if (el) {
                        remoteVideoRefs.current.set(userId, el);
                        if (stream && el.srcObject !== stream) {
                          el.srcObject = stream;
                          el.muted = false;
                          el.play().catch(e => console.log('Auto-play prevented:', e));
                        }
                      }
                    }}
                    autoPlay
                    playsInline
                    muted={false}
                    className="w-full h-full object-cover"
                  />
                  
                  {participant.isVideoOff && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-green-900 to-teal-900">
                      <div className="text-center">
                        <img 
                          src={participant.avatar} 
                          alt={participant.username}
                          className="w-24 h-24 rounded-full mx-auto mb-4 ring-4 ring-white/30"
                        />
                        <p className="text-white font-semibold">{participant.username}</p>
                      </div>
                    </div>
                  )}

                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                    <div className="bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full">
                      <span className="text-white text-sm font-medium">
                        {participant.username} {raisedHands.includes(userId) && '✋'}
                      </span>
                    </div>
                    {participant.isMuted && (
                      <div className="bg-red-500 p-2 rounded-full">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                        </svg>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setPinnedUser(pinnedUser === userId ? null : userId)}
                    className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 p-2 rounded-full transition"
                  >
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Meeting Minutes Panel - keeping previous code */}
        {showMinutes && !minutesPIP && (
          <div className="minutes-panel w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">📋 Meeting Minutes</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setMinutesPIP(true)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                  title="Minimize"
                >
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => setShowMinutes(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                >
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div ref={minutesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {meetingMinutes.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <p className="text-4xl mb-2">📝</p>
                  <p>No notes yet</p>
                  <p className="text-sm">Start taking meeting minutes</p>
                </div>
              ) : (
                meetingMinutes.map((minute) => (
                  <div key={minute.id} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    <div className="flex items-start space-x-2 mb-2">
                      <img 
                        src={minute.avatar} 
                        alt={minute.username}
                        className="w-6 h-6 rounded-full"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                            {minute.username}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(minute.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {editingMinute === minute.id ? (
                      <div>
                        <textarea
                          defaultValue={minute.content}
                          className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
                          rows={2}
                          onBlur={(e) => updateMeetingMinute(minute.id, e.target.value)}
                          autoFocus
                        />
                      </div>
                    ) : (
                      <p className="text-sm text-gray-800 dark:text-white whitespace-pre-wrap">
                        {minute.content}
                      </p>
                    )}

                    {minute.userId === currentUser.id && (
                      <div className="flex items-center space-x-2 mt-2">
                        <button
                          onClick={() => setEditingMinute(minute.id)}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteMeetingMinute(minute.id)}
                          className="text-xs text-red-600 dark:text-red-400 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex gap-2">
                <textarea
                  value={newMinute}
                  onChange={(e) => setNewMinute(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey) {
                      addMeetingMinute();
                    }
                  }}
                  placeholder="Add a note... (Ctrl+Enter to save)"
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:border-blue-500 outline-none resize-none bg-white dark:bg-gray-700 text-gray-800 dark:text-white text-sm"
                  rows={2}
                />
                <button
                  onClick={addMeetingMinute}
                  disabled={!newMinute.trim()}
                  className="px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PIP and Participants - keeping previous code */}
        {minutesPIP && (
          <div className="fixed bottom-24 right-4 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-between">
              <h4 className="text-white font-semibold text-sm">📋 Minutes</h4>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setMinutesPIP(false)}
                  className="p-1 hover:bg-white/20 rounded transition"
                  title="Maximize"
                >
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </button>
                <button
                  onClick={() => { setMinutesPIP(false); setShowMinutes(false); }}
                  className="p-1 hover:bg-white/20 rounded transition"
                >
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="h-40 overflow-y-auto p-3 space-y-2 bg-gray-50 dark:bg-gray-900">
              {meetingMinutes.slice(-5).map((minute) => (
                <div key={minute.id} className="text-xs bg-white dark:bg-gray-800 p-2 rounded">
                  <div className="font-semibold text-gray-700 dark:text-gray-300">{minute.username}</div>
                  <div className="text-gray-600 dark:text-gray-400 line-clamp-2">{minute.content}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {showParticipants && (
          <div className="absolute top-20 right-4 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
            <div className="p-4 bg-gradient-to-r from-green-500 to-teal-600 flex items-center justify-between">
              <h4 className="text-white font-semibold">Participants ({participants.length + 1})</h4>
              <button
                onClick={() => setShowParticipants(false)}
                className="p-1 hover:bg-white/20 rounded transition"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto p-4 space-y-2">
              <div className="flex items-center space-x-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                  {currentUser.username[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-800 dark:text-white">You</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Host</p>
                </div>
                {isHandRaised && <span className="text-2xl">✋</span>}
              </div>

              {participants.map(participant => (
                <div key={participant.userId} className="flex items-center space-x-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg">
                  <img 
                    src={participant.avatar} 
                    alt={participant.username}
                    className="w-10 h-10 rounded-full"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 dark:text-white">{participant.username}</p>
                    <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                      {participant.isMuted && <span>🔇</span>}
                      {participant.isVideoOff && <span>📹</span>}
                    </div>
                  </div>
                  {raisedHands.includes(participant.userId) && <span className="text-2xl">✋</span>}
                </div>
              ))}
            </div>
            {raisedHands.length > 0 && (
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={lowerAllHands}
                  className="w-full px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium transition"
                >
                  Lower All Hands
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Control Bar */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/90 to-transparent p-4 md:p-6">
        <div className="flex items-center justify-center space-x-3 md:space-x-4">
          <button
            onClick={toggleAudio}
            className={`p-4 md:p-5 rounded-full transition-all transform hover:scale-110 ${
              isMuted 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-white/20 hover:bg-white/30'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            )}
          </button>

          {callType === 'video' && (
            <button
              onClick={toggleVideo}
              className={`p-4 md:p-5 rounded-full transition-all transform hover:scale-110 ${
                isVideoOff 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-white/20 hover:bg-white/30'
              }`}
              title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
            >
              {isVideoOff ? (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          )}

          <button
            onClick={isSharingScreen ? stopScreenShare : startScreenShare}
            className={`p-4 md:p-5 rounded-full transition-all transform hover:scale-110 ${
              isSharingScreen 
                ? 'bg-green-500 hover:bg-green-600' 
                : 'bg-white/20 hover:bg-white/30'
            }`}
            title={isSharingScreen ? 'Stop sharing' : 'Share screen'}
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </button>

          <button
            onClick={toggleHandRaise}
            className={`p-4 md:p-5 rounded-full transition-all transform hover:scale-110 ${
              isHandRaised 
                ? 'bg-yellow-500 hover:bg-yellow-600' 
                : 'bg-white/20 hover:bg-white/30'
            }`}
            title={isHandRaised ? 'Lower hand' : 'Raise hand'}
          >
            <span className="text-2xl">✋</span>
          </button>

          <button
            onClick={() => {
              if (minutesPIP) {
                setMinutesPIP(false);
              } else {
                setShowMinutes(!showMinutes);
              }
            }}
            className={`p-4 md:p-5 rounded-full transition-all transform hover:scale-110 ${
              showMinutes || minutesPIP
                ? 'bg-purple-500 hover:bg-purple-600' 
                : 'bg-white/20 hover:bg-white/30'
            }`}
            title="Meeting minutes"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>

          <button
            onClick={handleEndCall}
            className="p-4 md:p-5 bg-red-600 hover:bg-red-700 rounded-full transition-all transform hover:scale-110 animate-pulse"
            title="End call"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoCall;
