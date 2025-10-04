"use client";
import { useTheme } from "next-themes";
import Image from "next/image";
import React, { useEffect, useState } from "react";

const ThemeToggle = () => {
  const { systemTheme, theme, setTheme } = useTheme();
  const [currentTheme, setCurrentTheme] = useState(null);

  useEffect(() => {
    setCurrentTheme(theme === "system" ? systemTheme : theme);
  }, [systemTheme, theme]);

  const toggleTheme = () => {
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    setCurrentTheme(newTheme);
  };

  // Ensure that the component does not render until currentTheme is set
  if (currentTheme === null) {
    return null;
  }

  const altText = currentTheme === "dark" ? "Moon" : "Sun";
  return (
    <div className={currentTheme === "dark" ? "dark" : ""}>
      {/* Your component content */}
      <button className="flex cursor-pointer justify-center items-center" onClick={toggleTheme}>
        <span className="bg-zinc-300/30 dark:bg-[#1A1B1E] flex justify-center items-center rounded-full h-10 w-10" >
        {currentTheme === "dark" ? (
         
            <Image height={32} className="w-6 h-6" width={32} src="/sun.svg" alt={altText} />
          
        ) : (
          
            <Image height={32} className="w-6 h-6" width={32} src="/moon.svg" alt={altText} />
          
        )}
        </span>
      </button>
    </div>
  );
};

export default ThemeToggle;