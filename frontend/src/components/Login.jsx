import React, {useContext, useState} from 'react';
import { useNavigate } from 'react-router-dom';
import {Card} from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";// relative path
import {UserPen , Lock, Chrome , Facebook} from "lucide-react";
import { Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import {getProfile , loginUser} from "../utils/authService";
import {useLogin} from "../hooks/useLogin";




const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [email, setEmail] = useState("");
  const [isLoading , setIsLoading] = useState(false);
  const { setUser } = useContext(AuthContext);
  const { login, setLoginUser } = useLogin();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      alert("Please enter both username and password");
      return;
    }
    console.log("username-password",username , password);
    try {
      await login(username, password);
      const userProfile = getProfile()
      setUser(userProfile); // update AuthContext
    } catch (err) {
      console.log(err.message); // error handled in hook
    }
  };


  return (
      // <div className="d-flex justify-content-center align-items-center vh-100">
      //   <form onSubmit={handleSubmit} className="bg-white p-4 rounded shadow">
      //     <h2 className="h4 mb-3">Login</h2>
      //     <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} className="form-control mb-3" />
      //     <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="form-control mb-3" />
      //     <button type="submit" className="btn btn-primary w-100">Login</button>
      //   </form>
      // </div>

      <div
          className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4 py-12">
        {/* Background accent elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
        </div>

        <div className="w-full max-w-md relative z-10">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <div
                className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg mb-4">
              <span className="text-white font-bold text-xl">A</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-slate-400">Sign in to your account to continue</p>
          </div>

          {/* Main Card */}
          <Card className="bg-slate-800/50 border-slate-700 shadow-2xl backdrop-blur-xl">
            <div className="p-8">
              {/* Error Message */}
              {error && (
                  <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Input */}
                <div className="space-y-2">
                  <label htmlFor="email" className="block flex
                   gap-2 text-sm font-medium text-slate-200">
                    Username <UserPen  className=" w-5 h-5 text-slate-500"/>
                  </label>
                  <div className="relative">

                    <Input
                        id="username"
                        type="text"
                        placeholder="Enter Your Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/50"
                        disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="block flex gap-2 text-sm font-medium text-slate-200">
                      Password  <Lock className=" w-5 h-5 text-slate-500"/>
                    </label>

                  </div>
                  <div className="relative">

                    <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/50"
                        disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Sign In Button */}
                <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-2.5 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
              </form>

              <Link href="/forgot-password"
                    className="text-sm text-blue-400 pt-3 mt-3 hover:text-blue-300 transition-colors">
                Forgot Password?
              </Link>

              {/* Divider */}
              <div className="my-6 flex items-center gap-4">
                <div className="flex-1 h-px bg-slate-700"></div>
                <span className="text-xs text-slate-400 font-medium">OR CONTINUE WITH</span>
                <div className="flex-1 h-px bg-slate-700"></div>
              </div>

              {/* OAuth Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                    type="button"
                    onClick={() => handleOAuthLogin("google")}
                    variant="outline"
                    className="border-slate-600 bg-slate-700/50 hover:bg-slate-700 text-slate-100 gap-2"
                >
                  <Chrome className="w-4 h-4"/>
                  <span className="hidden sm:inline text-sm">Google</span>
                </Button>
                <Button
                    type="button"
                    onClick={() => handleOAuthLogin("facebook")}
                    variant="outline"
                    className="border-slate-600 bg-slate-700/50 hover:bg-slate-700 text-slate-100 gap-2"
                >
                  <Facebook className="w-4 h-4"/>
                  <span className="hidden sm:inline text-sm">Facebook</span>
                </Button>
              </div>
            </div>
          </Card>

          {/* Sign Up Link */}
          <div className="mt-6 text-center">
            <p className="text-slate-400">
              Don't have an account?{" "}
              <Link href="/frontend/src/components/Signup" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors" to="/signup">
                Sign up here
              </Link>
            </p>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-xs text-slate-500">
            <p>
              By signing in, you agree to our{" "}
              <Link href="/terms" className="text-blue-400 hover:text-blue-300">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-blue-400 hover:text-blue-300">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </div>
  );
};

export default Login;