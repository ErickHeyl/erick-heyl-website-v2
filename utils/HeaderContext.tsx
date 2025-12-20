"use client";
import React, { createContext, useState, useContext, ReactNode } from "react";

interface HeaderContextType {
  isSticky: boolean;
  setSticky: (isSticky: boolean) => void;
}

const HeaderContext = createContext<HeaderContextType>({
  isSticky: true,
  setSticky: () => {},
});

export const useHeaderContext = () => useContext(HeaderContext);

export const HeaderProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isSticky, setSticky] = useState(true);

  return (
    <HeaderContext.Provider value={{ isSticky, setSticky }}>
      {children}
    </HeaderContext.Provider>
  );
};

export default HeaderContext;
