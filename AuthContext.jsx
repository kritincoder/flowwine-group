import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("fwg_user");
    return raw ? JSON.parse(raw) : null;
  });

  function login(token, userObj) {
    localStorage.setItem("fwg_token", token);
    localStorage.setItem("fwg_user", JSON.stringify(userObj));
    setUser(userObj);
  }

  function logout() {
    localStorage.removeItem("fwg_token");
    localStorage.removeItem("fwg_user");
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
