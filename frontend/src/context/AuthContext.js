import React, {createContext, useState, useEffect, useContext} from "react";
import { getProfile, logoutUser } from "../utils/authService";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const loadUser = async () => {
        try {
            const token = localStorage.getItem("access_token");
            if (!token) return;
            const response = await getProfile();
            setUser(response.data);
        } catch (err) {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        logoutUser();
        setUser(null);
        window.location.href = "/login";
    };

    useEffect(() => {
        console.log("🔍 Current user:", user);
        console.log("🔍 Token:", localStorage.getItem("access_token"));
    }, [user]);


    useEffect(() => {

            loadUser();

    }, []);


    return (
        <AuthContext.Provider value={{ user, setUser, loading, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
export const useAuth = () => useContext(AuthContext);