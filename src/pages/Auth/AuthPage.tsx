"use client";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import {
  Eye,
  EyeOff,
  Loader2,
  User,
  Lock,
  Mail,
  Phone,
  CreditCard,
  KeyRound,
} from "lucide-react";
import { motion } from "framer-motion";
import Layout from "../../components/layout/Layout";
import { useLanguage } from "../../contexts/LanguageContext";
import { emailVerificationService } from "../../services/auth/emailVerificationService";

// --- INTERFACES ---
interface LoginFormData {
  usernameOrEmailOrPhone: string;
  password: string;
}

interface SignupFormData {
  email: string;
  username: string;
  phoneNumber: string;
  nationalId: string;
  password: string;
  confirmPassword: string;
}

// --- COMPONENT INPUT TÙY CHỈNH (CẬP NHẬT) ---
interface CustomInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon: React.ElementType;
  label: string; // Thêm prop label
  error?: string;
  isPassword?: boolean;
  showPassword?: boolean;
  onTogglePassword?: () => void;
}

const CustomInput: React.FC<CustomInputProps> = ({
  icon: Icon,
  label, // Nhận label từ props
  error,
  isPassword = false,
  showPassword = false,
  onTogglePassword,
  className,
  ...props
}) => {
  return (
    <div className="w-full">
      {/* Label nằm trên input */}
      <label className="block text-sm font-semibold text-zinc-700 mb-1.5 ml-1">
        {label}
      </label>

      <div className="relative group">
        {/* Icon bên trái */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-yellow-500 transition-colors duration-300">
          <Icon size={20} />
        </div>

        {/* Input chính */}
        <input
          {...props}
          type={isPassword ? (showPassword ? "text" : "password") : props.type}
          className={`w-full pl-10 pr-4 py-3 bg-white border border-zinc-200 rounded-xl 
            text-zinc-800 placeholder-gray-400 caret-black
            focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20
            transition-all duration-200 hover:border-zinc-300 ${className}`}
        />

        {/* Nút mắt xem pass */}
        {isPassword && onTogglePassword && (
          <button
            type="button"
            onClick={onTogglePassword}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-zinc-800 transition-colors"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>

      {/* Thông báo lỗi */}
      {error && (
        <p className="text-red-500 text-xs mt-1 ml-1 font-medium animate-pulse">
          {error}
        </p>
      )}
    </div>
  );
};

// --- MAIN COMPONENT ---
function AuthPage() {
  const { t } = useLanguage();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isProcessingLogin, setIsProcessingLogin] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user, signin, signup, loading, clearError } = useAuthStore();

  const [loginData, setLoginData] = useState<LoginFormData>({
    usernameOrEmailOrPhone: "",
    password: "",
  });
  const [loginErrors, setLoginErrors] = useState<Partial<LoginFormData>>({});
  const [showLoginPass, setShowLoginPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [signupData, setSignupData] = useState<SignupFormData>({
    email: "",
    username: "",
    phoneNumber: "",
    nationalId: "",
    password: "",
    confirmPassword: "",
  });
  const [signupErrors, setSignupErrors] = useState<Partial<SignupFormData>>({});
  const [showSignupPass, setShowSignupPass] = useState(false);

  useEffect(() => {
    // Không redirect nếu đang xử lý login
    if (isProcessingLogin) {
      return;
    }

    if (user) {
      switch (user.role) {
        case "admin":
          navigate("/admin/dashboard");
          break;
        case "manager":
          navigate("/manager/dashboard");
          break;
        default:
          navigate("/");
      }
    }
  }, [user, navigate, isProcessingLogin]);

  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
    if (loginErrors[e.target.name as keyof LoginFormData]) {
      setLoginErrors({ ...loginErrors, [e.target.name]: "" });
    }
  };

  const validateLogin = () => {
    const newErrors: Partial<LoginFormData> = {};
    if (!loginData.usernameOrEmailOrPhone.trim())
      newErrors.usernameOrEmailOrPhone = t("auth.error.accountRequired");
    if (!loginData.password.trim())
      newErrors.password = t("auth.error.passwordRequired");
    setLoginErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateLogin()) return;

    setIsProcessingLogin(true);
    setLocalError(null);

    try {
      await signin(loginData, rememberMe);
      setIsProcessingLogin(false);
    } catch (err: any) {
      setIsProcessingLogin(false);

      // Check if error is about email verification
      const errorMessage = err.response?.data?.message || err.message || "";

      if (errorMessage.includes("Email must be verified")) {
        // Extract email from login data
        const email = loginData.usernameOrEmailOrPhone.includes("@")
          ? loginData.usernameOrEmailOrPhone
          : "";

        if (email) {
          // Clear the error from authStore
          if (clearError) clearError();

          // Navigate to email verification page with email and returnUrl
          navigate(
            `/email-verification?email=${encodeURIComponent(email)}&returnUrl=/auth&mode=login`
          );
          return;
        }
      }

      // For other errors, show them locally
      setLocalError(errorMessage || "Sign in failed");
    }
  };

  const handleSignupChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSignupData({ ...signupData, [e.target.name]: e.target.value });
    if (signupErrors[e.target.name as keyof SignupFormData]) {
      setSignupErrors({ ...signupErrors, [e.target.name]: "" });
    }
  };

  const validateSignup = () => {
    const newErrors: Partial<SignupFormData> = {};
    if (!signupData.email || !/\S+@\S+\.\S+/.test(signupData.email))
      newErrors.email = t("auth.error.emailInvalid");
    if (!signupData.username || signupData.username.length < 3)
      newErrors.username = t("auth.error.usernameMin");
    if (
      !signupData.phoneNumber ||
      !/^[0-9]{10,11}$/.test(signupData.phoneNumber)
    )
      newErrors.phoneNumber = t("auth.error.phoneInvalid");
    if (!signupData.nationalId || !/^[0-9]{9,12}$/.test(signupData.nationalId))
      newErrors.nationalId = t("auth.error.nationalIdInvalid");
    if (!signupData.password || signupData.password.length < 8)
      newErrors.password = t("auth.error.passwordMin");
    if (signupData.password !== signupData.confirmPassword)
      newErrors.confirmPassword = t("auth.error.passwordMismatch");

    setSignupErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSignup()) return;

    // Trước tiên kiểm tra email đã được verify chưa
    try {
      const emailStatus = await emailVerificationService.checkEmailStatus(
        signupData.email
      );
      if (!emailStatus.verified) {
        // Nếu chưa verify, lưu signup data vào sessionStorage và navigate đến trang verification
        sessionStorage.setItem("pendingSignupData", JSON.stringify(signupData));
        navigate(
          `/email-verification?email=${encodeURIComponent(signupData.email)}&returnUrl=/auth&mode=signup`
        );
        return;
      }
    } catch (err) {
      console.error("Error checking email status:", err);
      // Nếu có lỗi, vẫn tiếp tục navigate đến trang verification
      sessionStorage.setItem("pendingSignupData", JSON.stringify(signupData));
      navigate(
        `/email-verification?email=${encodeURIComponent(signupData.email)}&returnUrl=/auth&mode=signup`
      );
      return;
    }

    // Nếu email đã verify, tiến hành đăng ký
    await signup({
      email: signupData.email,
      username: signupData.username,
      phoneNumber: signupData.phoneNumber,
      nationalId: signupData.nationalId,
      password: signupData.password,
      confirmPassword: signupData.confirmPassword,
    });
  };

  const buttonClass =
    "w-full bg-zinc-900 text-yellow-400 py-3 rounded-xl font-bold hover:bg-black hover:shadow-lg hover:shadow-yellow-400/20 active:scale-[0.98] transition-all duration-300 flex justify-center items-center gap-2 border border-zinc-800";

  return (
    <Layout>
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-zinc-950 py-28 px-4">
        {/* BACKGROUND */}
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: "url('/background_profile.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
        </div>

        {/* MAIN MODAL */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative w-full max-w-5xl min-h-[700px] bg-white rounded-2xl shadow-2xl overflow-hidden z-10 flex"
        >
          {/* === FORM SIGN IN (LOGIN) === */}
          <div
            className={`absolute top-0 left-0 w-1/2 h-full flex items-center justify-center transition-all duration-700 ease-in-out ${
              isSignUp
                ? "translate-x-full opacity-0 pointer-events-none"
                : "translate-x-0 opacity-100 z-20"
            }`}
          >
            <div className="w-full px-12">
              <h2 className="text-3xl font-bold text-zinc-900 mb-2 text-center tracking-tight">
                {t("auth.login")}
              </h2>
              <p className="text-gray-400 text-sm text-center mb-8">
                {t("auth.loginWelcome")}
              </p>

              <form onSubmit={handleLoginSubmit} className="space-y-5">
                <CustomInput
                  label={t("auth.accountLabel")}
                  icon={User}
                  type="text"
                  name="usernameOrEmailOrPhone"
                  placeholder={t("auth.accountPlaceholder")}
                  value={loginData.usernameOrEmailOrPhone}
                  onChange={handleLoginChange}
                  error={loginErrors.usernameOrEmailOrPhone}
                />

                <CustomInput
                  label={t("auth.passwordLabel")}
                  icon={Lock}
                  type="password"
                  name="password"
                  placeholder={t("auth.passwordPlaceholder")}
                  value={loginData.password}
                  onChange={handleLoginChange}
                  error={loginErrors.password}
                  isPassword={true}
                  showPassword={showLoginPass}
                  onTogglePassword={() => setShowLoginPass(!showLoginPass)}
                />

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="custom-checkbox"
                    />
                    <span className="text-sm text-gray-600 group-hover:text-zinc-900 transition-colors">
                      {t("auth.rememberMe")}
                    </span>
                  </label>
                  <a
                    href="/forgot-password"
                    className="text-gray-500 text-sm hover:text-zinc-900 transition-colors font-medium hover:underline"
                  >
                    {t("auth.forgotPassword")}
                  </a>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={buttonClass}
                >
                  {loading ? (
                    <Loader2
                      className="animate-spin text-yellow-400"
                      size={20}
                    />
                  ) : (
                    t("auth.loginButton")
                  )}
                </button>

                {localError && !isSignUp && (
                  <p className="text-red-500 text-center text-sm mt-2 font-medium bg-red-50 py-1 rounded-md">
                    {localError}
                  </p>
                )}
              </form>
            </div>
          </div>

          {/* === FORM SIGN UP (REGISTER) === */}
          <div
            className={`absolute top-0 right-0 w-1/2 h-full flex items-center justify-center transition-all duration-700 ease-in-out ${
              isSignUp
                ? "translate-x-0 opacity-100 z-20"
                : "-translate-x-full opacity-0 pointer-events-none"
            }`}
          >
            <div className="w-full px-12 h-full overflow-y-auto py-8 custom-scrollbar">
              <h2 className="text-3xl font-bold text-zinc-900 mb-3 text-center tracking-tight">
                {t("auth.createAccount")}
              </h2>

              <p className="text-gray-400 text-sm text-center mb-6">
                {t("auth.registerWelcome")}
              </p>

              <form onSubmit={handleSignupSubmit} className="space-y-4">
                <CustomInput
                  label={t("auth.usernameLabel")}
                  icon={User}
                  name="username"
                  placeholder={t("auth.usernamePlaceholder")}
                  value={signupData.username}
                  onChange={handleSignupChange}
                  error={signupErrors.username}
                />

                <CustomInput
                  label={t("auth.emailLabel")}
                  icon={Mail}
                  name="email"
                  type="email"
                  placeholder={t("auth.emailPlaceholder")}
                  value={signupData.email}
                  onChange={handleSignupChange}
                  error={signupErrors.email}
                />

                <div className="flex gap-3">
                  <CustomInput
                    label={t("auth.phoneLabel")}
                    icon={Phone}
                    name="phoneNumber"
                    placeholder={t("auth.phonePlaceholder")}
                    value={signupData.phoneNumber}
                    onChange={handleSignupChange}
                    error={signupErrors.phoneNumber}
                  />
                  <CustomInput
                    label={t("auth.nationalIdLabel")}
                    icon={CreditCard}
                    name="nationalId"
                    placeholder={t("auth.nationalIdPlaceholder")}
                    value={signupData.nationalId}
                    onChange={handleSignupChange}
                    error={signupErrors.nationalId}
                  />
                </div>

                <CustomInput
                  label={t("auth.passwordLabel")}
                  icon={Lock}
                  isPassword
                  showPassword={showSignupPass}
                  onTogglePassword={() => setShowSignupPass(!showSignupPass)}
                  name="password"
                  placeholder={t("auth.minChars")}
                  value={signupData.password}
                  onChange={handleSignupChange}
                  error={signupErrors.password}
                />

                <CustomInput
                  label={t("auth.confirmPasswordLabel")}
                  icon={KeyRound}
                  type="password"
                  name="confirmPassword"
                  placeholder={t("auth.confirmPasswordPlaceholder")}
                  value={signupData.confirmPassword}
                  onChange={handleSignupChange}
                  error={signupErrors.confirmPassword}
                />

                <button
                  type="submit"
                  disabled={loading}
                  className={`${buttonClass} mt-2`}
                >
                  {loading ? (
                    <Loader2
                      className="animate-spin text-yellow-400"
                      size={20}
                    />
                  ) : (
                    t("auth.registerButton")
                  )}
                </button>

                {localError && isSignUp && (
                  <p className="text-red-500 text-center text-sm mt-2 font-medium bg-red-50 py-1 rounded-md">
                    {localError}
                  </p>
                )}
              </form>
            </div>
          </div>

          {/* === OVERLAY PANEL === */}
          <div
            className={`absolute top-0 w-1/2 h-full bg-zinc-900 transition-all duration-700 ease-in-out z-50 overflow-hidden border-l border-zinc-800 ${
              isSignUp ? "left-0" : "left-1/2"
            }`}
          >
            <div
              className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)",
                backgroundSize: "24px 24px",
              }}
            ></div>
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl"></div>
            <div className="absolute top-0 left-0 w-64 h-64 bg-zinc-700/10 rounded-full blur-3xl"></div>

            <div className="relative flex flex-col items-center justify-center h-full text-white px-12 text-center">
              {isSignUp ? (
                <>
                  <h1 className="text-4xl font-bold mb-4 text-white">
                    {t("auth.welcomeBack")}
                  </h1>
                  <p className="mb-8 text-gray-400">
                    {t("auth.welcomeBackDesc")}
                  </p>
                  <button
                    onClick={() => setIsSignUp(false)}
                    className="border border-white/30 text-white bg-transparent px-10 py-3 rounded-full font-bold hover:bg-yellow-400 hover:text-black hover:border-yellow-400 transition-all duration-300 uppercase tracking-wider"
                  >
                    {t("auth.login")}
                  </button>
                </>
              ) : (
                <>
                  <h1 className="text-4xl font-bold mb-4 text-white">
                    {t("auth.helloNew")}
                  </h1>
                  <p className="mb-8 text-gray-400">
                    {t("auth.helloNewDesc")}{" "}
                    <span className="text-yellow-400 font-bold">CineHub</span>
                  </p>
                  <button
                    onClick={() => setIsSignUp(true)}
                    className="border border-white/30 text-white bg-transparent px-10 py-3 rounded-full font-bold hover:bg-yellow-400 hover:text-black hover:border-yellow-400 transition-all duration-300 uppercase tracking-wider"
                  >
                    {t("auth.register")}
                  </button>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}

export default AuthPage;
