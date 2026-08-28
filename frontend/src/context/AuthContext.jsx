import { createContext, useContext, useState, useEffect } from "react";
import { getMyBusiness } from "../services/business.api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [hasBusiness, setHasBusiness] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkUserBusiness = async () => {
    try {
      const response = await getMyBusiness();
      const businessData = response.data?.business || response.data;
      if (businessData && (businessData.id || businessData.business_name)) {
        setHasBusiness(true);
      } else {
        setHasBusiness(false);
      }
    } catch (err) {
      setHasBusiness(false);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const storedUser = localStorage.getItem("user");
      const token = localStorage.getItem("accessToken");

      if (storedUser && token) {
        setUser(JSON.parse(storedUser));
        await checkUserBusiness();
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (userData, accessToken, refreshToken) => {
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
    await checkUserBusiness();
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
    setHasBusiness(false);
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        isAuthenticated: !!user, 
        hasBusiness, 
        login, 
        logout, 
        loading,
        refetchBusiness: checkUserBusiness 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);