'use client';

import { useEffect } from 'react';
import gsap from 'gsap';

const IncomingCallModal = ({ incomingCall, onAnswer, onReject, darkMode }) => {
  useEffect(() => {
    // Animate modal entrance
    gsap.fromTo('.incoming-call-modal',
      { scale: 0.5, opacity: 0, y: 50 },
      { scale: 1, opacity: 1, y: 0, duration: 0.5, ease: 'back.out(2)' }
    );

    // Pulse animation for avatar
    gsap.to('.caller-avatar', {
      scale: 1.1,
      duration: 1,
      repeat: -1,
      yoyo: true,
      ease: 'power1.inOut'
    });

    // Ring animation
    gsap.to('.ring-pulse', {
      scale: 1.5,
      opacity: 0,
      duration: 1.5,
      repeat: -1,
      ease: 'power1.out'
    });
  }, []);

  return (
    <div className={`fixed inset-0 z-[200] flex items-center justify-center bg-black/90 ${darkMode ? 'dark' : ''}`}>
      <div className="incoming-call-modal relative bg-white dark:bg-gray-900 rounded-3xl p-8 md:p-12 w-full max-w-md shadow-2xl">
        {/* Ring Pulse Effect */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="ring-pulse absolute w-32 h-32 rounded-full bg-blue-500/30"></div>
          <div className="ring-pulse absolute w-32 h-32 rounded-full bg-blue-500/20" style={{ animationDelay: '0.5s' }}></div>
        </div>

        {/* Content */}
        <div className="relative z-10 text-center">
          {/* Caller Avatar */}
          <div className="mb-6">
            <div className="relative inline-block">
              <img 
                src={incomingCall.isGroup ? incomingCall.groupAvatar : incomingCall.caller.avatar}
                alt={incomingCall.isGroup ? incomingCall.groupName : incomingCall.caller.username}
                className="caller-avatar w-32 h-32 rounded-full mx-auto ring-8 ring-blue-500/30 shadow-2xl"
              />
              <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                {incomingCall.callType === 'video' ? (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                )}
              </div>
            </div>
          </div>

          {/* Caller Info */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
              {incomingCall.isGroup ? incomingCall.groupName : incomingCall.caller.username}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Incoming {incomingCall.callType} call...
            </p>
            {incomingCall.isGroup && (
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                Group call
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center space-x-6">
            {/* Reject Button */}
            <button
              onClick={onReject}
              className="group relative"
            >
              <div className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg transform transition-all hover:scale-110 active:scale-95">
                <svg className="w-8 h-8 text-white transform rotate-135" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-sm font-medium text-gray-700 dark:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                Decline
              </span>
            </button>

            {/* Answer Button */}
            <button
              onClick={onAnswer}
              className="group relative"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 hover:from-green-500 hover:to-green-700 rounded-full flex items-center justify-center shadow-2xl transform transition-all hover:scale-110 active:scale-95 animate-pulse">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-sm font-medium text-gray-700 dark:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                Answer
              </span>
            </button>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-4 left-4 w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-xl"></div>
        <div className="absolute bottom-4 right-4 w-20 h-20 bg-gradient-to-br from-green-500/20 to-teal-500/20 rounded-full blur-xl"></div>
      </div>
    </div>
  );
};

export default IncomingCallModal;
