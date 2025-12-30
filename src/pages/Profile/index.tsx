import { useEffect, useState, useLayoutEffect } from "react";
import { motion } from "framer-motion";
import Layout from "../../components/layout/Layout";
import {
  userProfileService,
  loyaltyHistoryService,
  managerService,
} from "@/services/userprofile";
import { bookingService } from "@/services/booking/booking.service";
import { movieService } from "@/services/movie/movieService";
import { promotionService } from "@/services/promotion/promotionService";
import type {
  UserProfileResponse,
  LoyaltyHistoryItem,
  ManagerProfileResponse,
} from "@/types/userprofile";
import type { RefundVoucherResponse } from "@/types/promotion/promotion.type";
import { useAuthStore } from "../../stores/authStore";
import { getPosterUrl } from "@/utils/getPosterUrl";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";

import { fnbService } from "@/services/fnb/fnbService";
import type { FnbOrderResponse } from "@/types/fnb/fnb.type";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useScrollToTop } from "@/hooks/useScrollToTop";
import Swal from "sweetalert2";
import CustomSelect from "@/components/ui/CustomSelect";
import {
  User,
  Award,
  Save,
  X,
  History,
  Heart,
  Ticket,
  TrendingUp,
  Camera,
  Coffee,
  Phone,
  MapPin,
  Users,
  Gift,
  Building2,
} from "lucide-react";

type TabType =
  | "info"
  | "bookings"
  | "favorites"
  | "loyalty"
  | "fnb"
  | "vouchers";

// Custom Input Component (giống Auth modal)
interface CustomInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon: React.ElementType;
  label: string;
  error?: string;
}

const CustomInput: React.FC<CustomInputProps> = ({
  icon: Icon,
  label,
  error,
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
          className={`w-full pl-10 pr-4 py-3 bg-white border border-gray-400 rounded-xl 
            text-zinc-800 placeholder-gray-400 caret-black
            focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20
            hover:border-gray-500 transition-all duration-200 ${
              error ? "border-red-300 bg-red-50" : ""
            } ${className}`}
        />
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

// Custom Textarea Component
interface CustomTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  icon: React.ElementType;
  label: string;
  error?: string;
}

const CustomTextarea: React.FC<CustomTextareaProps> = ({
  icon: Icon,
  label,
  error,
  className,
  ...props
}) => {
  return (
    <div className="w-full">
      {/* Label nằm trên textarea */}
      <label className="block text-sm font-semibold text-zinc-700 mb-1.5 ml-1">
        {label}
      </label>

      <div className="relative group">
        {/* Icon bên trái */}
        <div className="absolute left-3 top-3 text-gray-400 group-focus-within:text-yellow-500 transition-colors duration-300">
          <Icon size={20} />
        </div>

        {/* Textarea chính */}
        <textarea
          {...props}
          className={`w-full pl-10 pr-4 py-3 bg-white border border-gray-400 rounded-xl 
            text-zinc-800 placeholder-gray-400 caret-black resize-none
            focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20
            hover:border-gray-500 transition-all duration-200 ${
              error ? "border-red-300 bg-red-50" : ""
            } ${className}`}
        />
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

const Profile = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { t, language } = useLanguage();
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [managerProfile, setManagerProfile] =
    useState<ManagerProfileResponse | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState<Partial<UserProfileResponse>>({});
  const [activeTab, setActiveTab] = useState<TabType>("info");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");

  const [bookings, setBookings] = useState<any[]>([]);
  const [displayedBookings, setDisplayedBookings] = useState<any[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [hasMoreBookings, setHasMoreBookings] = useState(true);
  const [favoriteMovies, setFavoriteMovies] = useState<any[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [loyaltyHistory, setLoyaltyHistory] = useState<LoyaltyHistoryItem[]>(
    []
  );
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);
  const [fnbOrders, setFnbOrders] = useState<FnbOrderResponse[]>([]);
  const [fnbLoading, setFnbLoading] = useState(false);
  const [vouchers, setVouchers] = useState<RefundVoucherResponse[]>([]);
  const [vouchersLoading, setVouchersLoading] = useState(false);
  const [userStats, setUserStats] = useState({
    totalBookings: 0,
    totalFavoriteMovies: 0,
    totalLoyaltyPoints: 0,
  });

  // Lock body scroll when modal is open
  useBodyScrollLock(isModalOpen);

  // Force scroll to top before any rendering (only on initial load)
  useLayoutEffect(() => {
    // Disable browser's automatic scroll restoration
    if (typeof window !== "undefined" && "scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }

    // Force scroll to top on initial load only
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []); // Empty dependency array = only run once on mount

  // Scroll to top when page loads (but not on tab changes)
  useScrollToTop(undefined, "auto");

  // Handle tab query parameter from URL
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (
      tabParam &&
      ["info", "bookings", "favorites", "loyalty", "fnb", "vouchers"].includes(
        tabParam
      )
    ) {
      setActiveTab(tabParam as TabType);
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;
      try {
        const data = await userProfileService.getProfileByUserId(user.id);
        setProfile(data);
        setEditData(data);

        // Fetch user stats
        const stats = await userProfileService.getUserStats(user.id);
        setUserStats(stats);

        // Fetch manager profile based on role
        console.log("User role:", user.role);
        console.log("User profile ID:", data.id);

        if (user.role === "MANAGER" || user.role === "manager") {
          try {
            console.log("Fetching manager profile...");
            const managerData = await managerService.getManagerByUser(data.id);
            console.log("Manager profile found:", managerData);
            setManagerProfile(managerData);
          } catch (error) {
            console.error("Error fetching manager profile:", error);
            console.log("No manager profile found for this user:", error);
          }
        }
      } catch (err) {
        console.error("Lỗi khi lấy profile:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, [user?.id, user?.role]);

  // Fetch bookings
  useEffect(() => {
    const fetchBookings = async () => {
      if (!user?.id) return;
      setBookingsLoading(true);
      try {
        const data = await bookingService.getBookingsByUser(user.id);
        console.log("📦 All bookings:", data);
        // Filter only CONFIRMED bookings
        const confirmedBookings = data.filter(
          (b: any) => b.status === "CONFIRMED"
        );
        console.log("✅ Confirmed bookings:", confirmedBookings);
        setBookings(confirmedBookings);
        setDisplayedBookings(confirmedBookings.slice(0, 10));
        setHasMoreBookings(confirmedBookings.length > 10);
      } catch (error) {
        console.error("Lỗi khi lấy bookings:", error);
      } finally {
        setBookingsLoading(false);
      }
    };

    if (activeTab === "bookings") {
      fetchBookings();
    }
  }, [user?.id, activeTab, location.state?.refresh, language]);

  // Fetch favorite movies
  useEffect(() => {
    const fetchFavorites = async () => {
      if (!user?.id) return;
      setFavoritesLoading(true);
      try {
        const favorites = await userProfileService.getFavorites(user.id);
        console.log("📦 Favorites from API:", favorites);

        // Fetch movie details for each favorite using movieId
        const moviePromises = favorites.map((fav) =>
          movieService.getMovieDetail(fav.movieId, language)
        );
        const movies = await Promise.all(moviePromises);
        console.log("🎬 Movies fetched:", movies);

        setFavoriteMovies(movies);
      } catch (error) {
        console.error("Lỗi khi lấy phim yêu thích:", error);
      } finally {
        setFavoritesLoading(false);
      }
    };

    if (activeTab === "favorites") {
      fetchFavorites();
    }
  }, [user?.id, activeTab, language]);

  // Fetch loyalty history
  useEffect(() => {
    const fetchLoyaltyHistory = async () => {
      if (!user?.id) return;
      setLoyaltyLoading(true);
      try {
        const response = await loyaltyHistoryService.getUserLoyaltyHistory(
          user.id,
          1,
          20
        );
        setLoyaltyHistory(response.data || []);
      } catch (error) {
        console.error("Lỗi khi lấy lịch sử điểm thưởng:", error);
      } finally {
        setLoyaltyLoading(false);
      }
    };

    if (activeTab === "loyalty") {
      fetchLoyaltyHistory();
    }
  }, [user?.id, activeTab]);

  // Fetch FnB orders
  useEffect(() => {
    const fetchFnbOrders = async () => {
      if (!user?.id) return;
      setFnbLoading(true);
      try {
        const orders = await fnbService.getOrdersByUser(user.id);
        console.log("📦 FnB orders:", orders);
        // Filter only PAID or CONFIRMED orders (exclude PENDING, CANCELLED)
        const completedOrders = orders.filter(
          (order) => order.status === "PAID" || order.status === "CONFIRMED"
        );
        setFnbOrders(completedOrders);
      } catch (error) {
        console.error("Lỗi khi lấy lịch sử đặt bắp nước:", error);
      } finally {
        setFnbLoading(false);
      }
    };

    if (activeTab === "fnb") {
      fetchFnbOrders();
    }
  }, [user?.id, activeTab, location.state?.refresh]);

  // Fetch vouchers
  useEffect(() => {
    const fetchVouchers = async () => {
      if (!user?.id) return;
      setVouchersLoading(true);
      try {
        const data = await promotionService.getRefundVouchersByUser(user.id);
        console.log("📦 Vouchers:", data);
        setVouchers(data);
      } catch (error) {
        console.error("Lỗi khi lấy vouchers:", error);
      } finally {
        setVouchersLoading(false);
      }
    };

    if (activeTab === "vouchers") {
      fetchVouchers();
    }
  }, [user?.id, activeTab]);

  const loadMoreBookings = () => {
    const currentLength = displayedBookings.length;
    const nextBatch = bookings.slice(currentLength, currentLength + 10);
    setDisplayedBookings([...displayedBookings, ...nextBatch]);
    setHasMoreBookings(currentLength + 10 < bookings.length);
  };

  const handleAvatarChange = (file: File) => {
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      Swal.fire({
        icon: "warning",
        title: "File quá lớn",
        text: "Kích thước file không được vượt quá 5MB!",
        confirmButtonColor: "#EAB308",
      });
      return;
    }

    // Validate file type (only JPEG and PNG)
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      Swal.fire({
        icon: "warning",
        title: "Định dạng không hỗ trợ",
        text: "Vui lòng chọn file JPEG hoặc PNG!",
        confirmButtonColor: "#EAB308",
      });
      return;
    }

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatarPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!user?.id) return;

    // Validation
    if (!editData.fullName?.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Thiếu thông tin",
        text: "Vui lòng nhập họ và tên!",
        confirmButtonColor: "#EAB308",
      });
      return;
    }

    if (editData.phoneNumber && !/^[0-9]{10,11}$/.test(editData.phoneNumber)) {
      Swal.fire({
        icon: "warning",
        title: "Số điện thoại không hợp lệ",
        text: "Vui lòng nhập 10-11 chữ số.",
        confirmButtonColor: "#EAB308",
      });
      return;
    }

    // Remove nationalId validation since it's read-only

    setIsSaving(true);
    try {
      let avatarUrl = editData.avatarUrl;

      // Upload avatar if a new file is selected
      if (avatarFile) {
        try {
          avatarUrl = await userProfileService.uploadAvatar(avatarFile);
        } catch (uploadError) {
          console.error("Lỗi khi upload avatar:", uploadError);
          Swal.fire({
            icon: "error",
            title: "Lỗi upload ảnh",
            text: "Không thể upload ảnh đại diện! Vui lòng thử lại.",
            confirmButtonColor: "#EAB308",
          });
          return;
        }
      }

      const updated = await userProfileService.updateProfile(user.id, {
        fullName: editData.fullName?.trim(),
        gender: editData.gender as "MALE" | "FEMALE" | "OTHER" | undefined,
        phoneNumber: editData.phoneNumber?.trim() || undefined,
        address: editData.address?.trim() || undefined,
        avatarUrl: avatarUrl,
        // Remove dateOfBirth and nationalId - BE doesn't support them
      });

      setProfile(updated);
      setEditData(updated);
      setIsModalOpen(false);
      setAvatarFile(null);
      setAvatarPreview("");

      Swal.fire({
        icon: "success",
        title: "Thành công!",
        text: "Cập nhật thông tin thành công!",
        confirmButtonColor: "#EAB308",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Lỗi khi cập nhật profile:", error);
      Swal.fire({
        icon: "error",
        title: "Lỗi cập nhật",
        text: "Không thể lưu thông tin! Vui lòng thử lại.",
        confirmButtonColor: "#EAB308",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 relative">
          <div
            className="flex flex-col items-center justify-center"
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 1000,
            }}
          >
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-yellow-500 mb-4"></div>
            <div className="text-gray-600 text-lg">{t("profile.loading")}</div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-red-600 text-xl">{t("profile.cannotLoad")}</div>
        </div>
      </Layout>
    );
  }

  const loyaltyPercent = Math.min((profile.loyaltyPoint / 1000) * 100, 100);

  const tabs = [
    { id: "info" as TabType, label: t("profile.info"), icon: User },
    { id: "bookings" as TabType, label: t("profile.bookings"), icon: Ticket },
    { id: "fnb" as TabType, label: t("profile.fnb"), icon: Coffee },
    { id: "vouchers" as TabType, label: t("profile.vouchers"), icon: Gift },
    { id: "favorites" as TabType, label: t("profile.favorites"), icon: Heart },
    { id: "loyalty" as TabType, label: t("profile.loyalty"), icon: TrendingUp },
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Header Section */}
        <div className="bg-white">
          <div className="max-w-5xl mx-auto py-10">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-tr from-yellow-400 via-yellow-500 to-yellow-600 p-1">
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden border-4 border-white">
                    {profile.avatarUrl ? (
                      <img
                        src={profile.avatarUrl}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-20 h-20 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Profile Info */}
              <div className="flex-1 text-center md:text-left mt-2">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-3xl text-gray-900 font-semibold">
                    {profile.fullName || t("profile.notUpdated")}
                  </p>

                  <button
                    onClick={() => {
                      setEditData(profile);
                      setAvatarFile(null);
                      setAvatarPreview("");
                      setIsModalOpen(true);
                    }}
                    className="px-4 py-1.5 bg-transparent border border-gray-400 text-gray-900 text-md font-semibold rounded-lg hover:bg-gray-50 transition"
                  >
                    {t("profile.edit")}
                  </button>
                </div>
                <h1 className="text-2xl font-light text-gray-900 mb-5">
                  {profile.username}
                </h1>

                {/* Stats */}
                <div className="flex justify-center md:justify-start gap-10 mb-4">
                  <div className="text-center">
                    <span className="block text-gray-900 font-semibold">
                      {userStats.totalBookings}
                    </span>
                    <span className="text-gray-600 text-md">
                      {t("profile.ticketsBooked")}
                    </span>
                  </div>
                  <div className="text-center">
                    <span className="block text-gray-900 font-semibold">
                      {userStats.totalFavoriteMovies}
                    </span>
                    <span className="text-gray-600 text-md">
                      {t("profile.favoriteMovies")}
                    </span>
                  </div>
                  <div className="text-center">
                    <span className="block text-gray-900 font-semibold">
                      {profile.loyaltyPoint}
                    </span>
                    <span className="text-gray-600 text-md">
                      {t("profile.loyaltyPoints")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white -mt-5">
          <div className="max-w-5xl mx-auto space-y-1">
            <div className="flex items-center gap-2 text-gray-900 text-lg">
              <Award className="w-8 h-8 text-yellow-500" />
              <span className="font-semibold">
                {t("profile.memberRank")}{" "}
                {language === "en"
                  ? profile.rankNameEn || profile.rankName || "Bronze"
                  : profile.rankName || "Bronze"}
              </span>
            </div>
          </div>
        </div>

        {/* Loyalty Progress */}
        <div className="bg-white mb-5">
          <div className="max-w-5xl mx-auto py-4">
            <div className="flex items-center gap-6">
              {/* Label */}
              <span className="text-gray-600 text-md whitespace-nowrap">
                {t("profile.rankProgress")}
              </span>

              {/* Progress bar */}
              <div className="flex-1 max-w-md">
                <div className="w-full bg-gray-300 rounded-full h-1.5">
                  <div
                    className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${loyaltyPercent}%` }}
                  />
                </div>
              </div>

              {/* Points */}
              <span className="text-yellow-600 text-md font-semibold whitespace-nowrap">
                {profile.loyaltyPoint}/1000
              </span>
            </div>

            {/* Receive Promo Email Checkbox */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={profile.receivePromoEmail || false}
                  onChange={async (e) => {
                    try {
                      const updated = await userProfileService.updateProfile(
                        user!.id,
                        {
                          receivePromoEmail: e.target.checked,
                        }
                      );
                      setProfile(updated);
                    } catch (error) {
                      console.error(
                        "Failed to update promo email preference:",
                        error
                      );
                    }
                  }}
                  className="w-5 h-5 rounded border-2 border-gray-400 bg-white text-yellow-500 focus:ring-yellow-500 focus:ring-offset-0 cursor-pointer appearance-none checked:bg-yellow-500 checked:border-yellow-500"
                  style={{
                    backgroundImage: profile.receivePromoEmail
                      ? "url(\"data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e\")"
                      : "none",
                    backgroundSize: "100% 100%",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                  }}
                />
                <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                  {t("profile.receivePromoEmail")}
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b border-gray-200 relative">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-6 gap-4 relative">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex items-center justify-center gap-2 py-4 border-t-2 transition-all duration-300 overflow-hidden ${
                      isActive
                        ? "border-yellow-500 text-yellow-600"
                        : "border-transparent text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    {/* Glow effect - thanh sáng đều chiếu xuống */}
                    {isActive && (
                      <div
                        className="absolute top-0 left-0 right-0 h-12 pointer-events-none"
                        style={{
                          background:
                            "linear-gradient(to bottom, rgba(234, 179, 8, 0.15) 0%, rgba(234, 179, 8, 0.05) 50%, transparent 100%)",
                        }}
                      />
                    )}
                    <Icon className="w-4 h-4 relative z-10" />
                    <span className="text-sm font-semibold whitespace-nowrap relative z-10">
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="max-w-5xl mx-auto py-8">
          {activeTab === "info" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  Thông tin cá nhân
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                  <InfoItem
                    label={t("profile.fullName")}
                    value={profile.fullName || t("profile.notUpdated")}
                  />
                  <InfoItem label={t("profile.email")} value={profile.email} />
                  <InfoItem
                    label={t("profile.phone")}
                    value={profile.phoneNumber || t("profile.notUpdated")}
                  />
                  <InfoItem
                    label={t("profile.gender")}
                    value={
                      profile.gender === "MALE"
                        ? t("profile.male")
                        : profile.gender === "FEMALE"
                          ? t("profile.female")
                          : profile.gender === "OTHER"
                            ? t("profile.other")
                            : t("profile.notUpdated")
                    }
                  />
                  <InfoItem
                    label={t("profile.dateOfBirth")}
                    value={
                      profile.dateOfBirth
                        ? new Date(profile.dateOfBirth).toLocaleDateString(
                            language === "en" ? "en-US" : "vi-VN"
                          )
                        : t("profile.notUpdated")
                    }
                  />
                  <InfoItem
                    label={t("profile.nationalId")}
                    value={profile.nationalId || t("profile.notUpdated")}
                  />
                  <InfoItem
                    label={t("profile.address")}
                    value={profile.address || t("profile.notUpdated")}
                  />
                  <InfoItem
                    label={t("profile.status")}
                    value={
                      profile.status === "ACTIVE"
                        ? t("profile.active")
                        : t("profile.blocked")
                    }
                  />
                  <InfoItem
                    label={t("profile.createdDate")}
                    value={
                      profile.createdAt
                        ? new Date(profile.createdAt).toLocaleDateString(
                            language === "en" ? "en-US" : "vi-VN"
                          )
                        : "N/A"
                    }
                  />
                </div>
              </div>

              {/* Work Information - Only show for MANAGER */}
              {managerProfile && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-yellow-600" />
                    Thông tin công việc
                  </h3>
                  <div className="bg-gray-300 rounded-lg p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <InfoItem label="Chức vụ" value="Quản lý rạp" />
                      <InfoItem
                        label="Rạp quản lý"
                        value={managerProfile.managedCinemaName}
                      />
                      <InfoItem
                        label="Ngày nhận chức"
                        value={new Date(
                          managerProfile.hireDate
                        ).toLocaleDateString(
                          language === "en" ? "en-US" : "vi-VN"
                        )}
                      />
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "bookings" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* Cancellation Policy Notice */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-yellow-800">
                  <span className="font-semibold">
                    📋 {t("profile.cancellationPolicy")}:
                  </span>{" "}
                  {t("profile.cancellationPolicyDesc")}
                </p>
              </div>

              {bookingsLoading ? (
                <div className="text-center py-16">
                  <div className="text-gray-500">{t("profile.loading")}</div>
                </div>
              ) : displayedBookings.length === 0 ? (
                <div className="text-center py-16">
                  <Ticket className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {t("profile.noBookingHistory")}
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {t("profile.bookingHistoryDesc")}
                  </p>
                  <button
                    onClick={() => navigate("/showtime")}
                    className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-6 py-2 rounded-lg transition-colors"
                  >
                    {t("profile.bookNow")}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {displayedBookings.map((booking) => {
                    // Check if booking can be cancelled (60 minutes before showtime)
                    const showDateTime = booking.showDateTime
                      ? new Date(booking.showDateTime)
                      : null;
                    const now = new Date();
                    const minutesUntilShow = showDateTime
                      ? (showDateTime.getTime() - now.getTime()) / (1000 * 60)
                      : 0;
                    const canCancel =
                      booking.status === "CONFIRMED" && minutesUntilShow >= 60;

                    return (
                      <div
                        key={booking.bookingId}
                        className="bg-white rounded-xl p-6 shadow hover:shadow-md transition border border-gray-400"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">
                              {language === "en" && booking.movieTitleEn
                                ? booking.movieTitleEn
                                : booking.movieTitle || "Phim"}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {t("profile.bookingCode")}: {booking.bookingCode}
                            </p>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              booking.status === "CONFIRMED"
                                ? "bg-green-100 text-green-700"
                                : booking.status === "PENDING"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                            }`}
                          >
                            {booking.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                          <div className="text-gray-600">
                            <span className="font-medium">
                              {t("profile.theater")}:
                            </span>{" "}
                            {language === "en" && booking.theaterNameEn
                              ? booking.theaterNameEn
                              : booking.theaterName || "N/A"}
                          </div>
                          <div className="text-gray-600">
                            <span className="font-medium">
                              {t("profile.room")}:
                            </span>{" "}
                            {language === "en" && booking.roomNameEn
                              ? booking.roomNameEn
                              : booking.roomName || "N/A"}
                          </div>
                          <div className="text-gray-600 col-span-2">
                            <span className="font-medium">
                              {t("profile.showtime")}:
                            </span>{" "}
                            {booking.showDateTime
                              ? new Date(booking.showDateTime).toLocaleString(
                                  language === "en" ? "en-US" : "vi-VN"
                                )
                              : "N/A"}
                          </div>
                        </div>

                        <div className="pt-4 border-t border-gray-200 flex items-center justify-between">
                          <div className="text-sm text-gray-600">
                            {t("profile.seats")}:{" "}
                            <span className="font-semibold text-gray-900">
                              {booking.seats
                                ?.map((s: any) => s.seatNumber || s)
                                .join(", ") || "N/A"}
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-lg font-bold text-yellow-600">
                              {(
                                booking.finalPrice ?? booking.totalPrice
                              )?.toLocaleString() || 0}{" "}
                              VNĐ
                            </div>
                            {canCancel && (
                              <button
                                onClick={async () => {
                                  const result = await Swal.fire({
                                    title: t("profile.cancelBookingTitle"),
                                    text: t("profile.cancelBookingConfirm"),
                                    icon: "warning",
                                    showCancelButton: true,
                                    confirmButtonColor: "#ef4444",
                                    cancelButtonColor: "#6b7280",
                                    confirmButtonText: t(
                                      "profile.confirmCancel"
                                    ),
                                    cancelButtonText: t("profile.keepBooking"),
                                  });

                                  if (result.isConfirmed) {
                                    try {
                                      await bookingService.cancelBooking(
                                        booking.bookingId
                                      );
                                      Swal.fire({
                                        icon: "success",
                                        title: t("profile.cancelSuccess"),
                                        text: t("profile.cancelSuccessDesc"),
                                        confirmButtonColor: "#EAB308",
                                      });
                                      // Refresh bookings
                                      const data =
                                        await bookingService.getBookingsByUser(
                                          user!.id
                                        );
                                      const confirmedBookings = data.filter(
                                        (b: any) => b.status === "CONFIRMED"
                                      );
                                      setBookings(confirmedBookings);
                                      setDisplayedBookings(
                                        confirmedBookings.slice(0, 10)
                                      );
                                    } catch (error: any) {
                                      Swal.fire({
                                        icon: "error",
                                        title: t("profile.cancelError"),
                                        text:
                                          error.response?.data?.message ||
                                          t("profile.cancelErrorDesc"),
                                        confirmButtonColor: "#EAB308",
                                      });
                                    }
                                  }
                                }}
                                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors"
                              >
                                {t("profile.cancelBooking")}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {hasMoreBookings && (
                    <button
                      onClick={loadMoreBookings}
                      className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition"
                    >
                      {t("profile.seeMore")}
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "favorites" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {favoritesLoading ? (
                <div className="text-center py-16">
                  <div className="text-gray-500">{t("profile.loading")}</div>
                </div>
              ) : favoriteMovies.length === 0 ? (
                <div className="text-center py-16">
                  <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {t("profile.noFavoriteMovies")}
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {t("profile.favoriteMoviesDesc")}
                  </p>
                  <button
                    onClick={() => navigate("/")}
                    className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-6 py-2 rounded-lg transition-colors"
                  >
                    {t("profile.exploreMovies")}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {favoriteMovies.map((movie) => (
                    <div key={movie.id} className="group relative">
                      {/* Remove button */}
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!user?.id) return;
                          try {
                            await userProfileService.removeFavorite(
                              user.id, // Use actual userId from auth
                              movie.id
                            );
                            setFavoriteMovies((prev) =>
                              prev.filter((m) => m.id !== movie.id)
                            );
                          } catch (error) {
                            console.error("Error removing favorite:", error);
                            Swal.fire({
                              icon: "error",
                              title: "Lỗi",
                              text: "Không thể xóa phim yêu thích!",
                              confirmButtonText: "OK",
                              confirmButtonColor: "#f59e0b",
                            });
                          }
                        }}
                        className="absolute top-2 right-2 z-10 w-8 h-8 bg-black/60 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>

                      <div
                        onClick={() => navigate(`/movie/${movie.id}`)}
                        className="cursor-pointer"
                      >
                        <div className="relative overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-all">
                          <img
                            src={getPosterUrl(movie.posterUrl)}
                            alt={movie.title}
                            className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="absolute bottom-0 left-0 right-0 p-4">
                              <h4 className="text-white font-semibold text-sm line-clamp-2">
                                {movie.title}
                              </h4>
                              <p className="text-gray-300 text-xs mt-1">
                                {movie.releaseDate}
                              </p>
                            </div>
                          </div>
                        </div>
                        <h4 className="mt-2 text-gray-900 font-medium text-sm line-clamp-2">
                          {movie.title}
                        </h4>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "fnb" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {fnbLoading ? (
                <div className="text-center py-16">
                  <div className="text-gray-500">{t("profile.loading")}</div>
                </div>
              ) : fnbOrders.length === 0 ? (
                <div className="text-center py-16">
                  <Coffee className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {t("profile.noFnbHistory")}
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {t("profile.fnbHistoryDesc")}
                  </p>
                  <button
                    onClick={() => navigate("/popcorn-drink")}
                    className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-6 py-2 rounded-lg transition-colors"
                  >
                    {t("profile.orderNow")}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {fnbOrders.map((order) => (
                    <div
                      key={order.id}
                      className="bg-white rounded-xl p-6 shadow hover:shadow-md transition border border-gray-400"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {t("profile.fnbOrder")}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {t("profile.orderCode")}: {order.orderCode}
                          </p>
                          {order.theaterName && (
                            <p className="text-sm text-gray-600 mt-1">
                              <span className="font-medium">
                                {t("profile.pickupLocation")}:
                              </span>{" "}
                              {order.theaterName}
                            </p>
                          )}
                          {order.theaterAddress && (
                            <p className="text-xs text-gray-500">
                              {order.theaterAddress}
                            </p>
                          )}
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            order.status === "CONFIRMED" ||
                            order.status === "PAID"
                              ? "bg-green-100 text-green-700"
                              : order.status === "PENDING"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                          }`}
                        >
                          {order.status === "CONFIRMED" ||
                          order.status === "PAID"
                            ? t("profile.confirmed")
                            : order.status === "PENDING"
                              ? t("profile.pending")
                              : t("profile.cancelled")}
                        </span>
                      </div>

                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">
                          {t("profile.orderedItems")}:
                        </h4>
                        <div className="space-y-2">
                          {order.items.map((item, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between text-sm bg-gray-50 p-3 rounded-lg"
                            >
                              <div className="flex-1">
                                <span className="font-medium text-gray-900">
                                  {language === "en" && item.itemNameEn
                                    ? item.itemNameEn
                                    : item.itemName || `Item #${index + 1}`}
                                </span>
                                <span className="text-gray-500 ml-2">
                                  x{item.quantity}
                                </span>
                              </div>
                              <div className="text-right">
                                <div className="text-gray-900 font-medium">
                                  {item.totalPrice.toLocaleString()} VNĐ
                                </div>
                                <div className="text-xs text-gray-500">
                                  {item.unitPrice.toLocaleString()} VNĐ/món
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-4 border-t border-gray-200 flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">
                            {t("profile.orderTime")}:
                          </span>{" "}
                          {new Date(order.createdAt).toLocaleString("vi-VN")}
                        </div>
                        <div className="text-lg font-bold text-yellow-600">
                          {t("profile.total")}:{" "}
                          {order.totalAmount.toLocaleString()} VNĐ
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "vouchers" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {vouchersLoading ? (
                <div className="text-center py-16">
                  <div className="text-gray-500">{t("profile.loading")}</div>
                </div>
              ) : vouchers.length === 0 ? (
                <div className="text-center py-16">
                  <Gift className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {t("profile.noVouchers")}
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {t("profile.vouchersDesc")}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {vouchers.map((voucher) => {
                    const isExpired = new Date(voucher.expiredAt) < new Date();
                    const isUsed = voucher.isUsed;
                    return (
                      <div
                        key={voucher.id}
                        className={`bg-white rounded-xl p-6 shadow hover:shadow-md transition border ${
                          isUsed || isExpired
                            ? "border-gray-300 opacity-60"
                            : "border-yellow-400"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">
                              {t("profile.refundVoucher")}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {t("profile.voucherCode")}:{" "}
                              <span className="font-mono font-semibold text-yellow-600">
                                {voucher.code}
                              </span>
                            </p>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              isUsed
                                ? "bg-gray-100 text-gray-600"
                                : isExpired
                                  ? "bg-red-100 text-red-700"
                                  : "bg-green-100 text-green-700"
                            }`}
                          >
                            {isUsed
                              ? t("profile.voucherUsed")
                              : isExpired
                                ? t("profile.voucherExpired")
                                : t("profile.voucherActive")}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                          <div className="text-gray-600">
                            <span className="font-medium">
                              {t("profile.voucherValue")}:
                            </span>{" "}
                            <span className="text-yellow-600 font-bold text-lg">
                              {voucher.value.toLocaleString()} VNĐ
                            </span>
                          </div>
                          <div className="text-gray-600">
                            <span className="font-medium">
                              {t("profile.voucherExpiry")}:
                            </span>{" "}
                            {new Date(voucher.expiredAt).toLocaleDateString(
                              language === "en" ? "en-US" : "vi-VN"
                            )}
                          </div>
                        </div>

                        <div className="pt-4 border-t border-gray-200 flex items-center justify-between">
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">
                              {t("profile.voucherCreated")}:
                            </span>{" "}
                            {new Date(voucher.createdAt).toLocaleDateString(
                              language === "en" ? "en-US" : "vi-VN"
                            )}
                          </div>
                          {!isUsed && !isExpired && (
                            <div className="text-sm text-green-600 font-medium">
                              {t("profile.voucherReadyToUse")}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "loyalty" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-5xl mx-auto"
            >
              {/* Loyalty History */}
              <div className="bg-white rounded-xl p-6 shadow border border-gray-400">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  {t("profile.loyaltyHistory")}
                </h3>
                {loyaltyLoading ? (
                  <div className="text-center py-16">
                    <div className="text-gray-500">{t("profile.loading")}</div>
                  </div>
                ) : loyaltyHistory.length === 0 ? (
                  <div className="text-center py-16">
                    <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-2">
                      {t("profile.noLoyaltyHistory")}
                    </p>
                    <p className="text-gray-400 text-sm mb-4">
                      {t("profile.loyaltyHistoryDesc")}
                    </p>
                    <button
                      onClick={() => navigate("/showtime")}
                      className="px-6 py-2 bg-yellow-500 text-black font-semibold rounded-lg hover:bg-black hover:text-yellow-500 transition-colors"
                    >
                      {t("profile.bookNow")}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {loyaltyHistory.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                item.pointsChange > 0
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {item.pointsChange > 0
                                ? t("profile.earned")
                                : t("profile.redeemed")}
                            </span>
                          </div>
                          <p className="text-sm text-gray-900 font-medium">
                            {item.description}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(item.createdAt).toLocaleString("vi-VN")}
                          </p>
                        </div>
                        <div className="text-right">
                          <span
                            className={`text-lg font-bold ${
                              item.pointsChange > 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {item.pointsChange > 0 ? "+" : ""}
                            {item.pointsChange}
                          </span>
                          <p className="text-xs text-gray-500">
                            {t("profile.points")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>

        {/* Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full mx-4">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold">{t("profile.edit")}</h3>
                  <button
                    onClick={() => {
                      setIsModalOpen(false);
                      setAvatarFile(null);
                      setAvatarPreview("");
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Top Row: Avatar left, Name + Gender right */}
                <div className="flex gap-10 mb-6">
                  {/* Avatar Upload */}
                  <div className="flex flex-col items-center mt-7">
                    <div className="relative group">
                      <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-yellow-400 via-yellow-500 to-yellow-600 p-1">
                        <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden border-4 border-white">
                          {avatarPreview ? (
                            <img
                              src={avatarPreview}
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
                          ) : editData.avatarUrl ? (
                            <img
                              src={editData.avatarUrl}
                              alt="Avatar"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="w-16 h-16 text-gray-400" />
                          )}
                        </div>
                      </div>
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-full transition-all flex items-center justify-center">
                        <Camera className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <button
                        onClick={() => {
                          const modalFileInput =
                            document.createElement("input");
                          modalFileInput.type = "file";
                          modalFileInput.accept = "image/jpeg,image/png";
                          modalFileInput.onchange = (e) => {
                            const target = e.target as HTMLInputElement;
                            if (target.files?.[0]) {
                              handleAvatarChange(target.files[0]);
                            }
                          };
                          modalFileInput.click();
                        }}
                        className="absolute bottom-0 right-0 w-9 h-9 bg-yellow-500 hover:bg-yellow-600 rounded-full flex items-center justify-center text-white transition-all hover:scale-110 shadow-lg"
                        title={t("profile.changeAvatar")}
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      {t("profile.avatarFormat")}
                    </p>
                  </div>

                  {/* Name + Gender */}
                  <div className="flex-1 flex flex-col gap-4">
                    <CustomInput
                      label={`${t("profile.fullName")} *`}
                      icon={User}
                      type="text"
                      value={editData.fullName || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, fullName: e.target.value })
                      }
                      placeholder={t("profile.fullName")}
                      error={
                        !editData.fullName?.trim()
                          ? `${t("profile.fullName")} ${t("profile.requiredField")}`
                          : undefined
                      }
                    />

                    <div className="w-full">
                      <label className="block text-sm font-semibold text-zinc-700 mb-1.5 ml-1">
                        {t("profile.gender")}
                      </label>
                      <div className="relative group">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-yellow-500 transition-colors duration-300 z-10">
                          <Users size={20} />
                        </div>
                        <CustomSelect
                          options={[
                            { value: "MALE", label: t("profile.male") },
                            { value: "FEMALE", label: t("profile.female") },
                            { value: "OTHER", label: t("profile.other") },
                          ]}
                          value={editData.gender || "MALE"}
                          onChange={(value: string) =>
                            setEditData({
                              ...editData,
                              gender: value as "MALE" | "FEMALE" | "OTHER",
                            })
                          }
                          placeholder={t("profile.male")}
                          variant="solid"
                          className="w-full [&_button]:pl-10"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Phone + Address */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CustomInput
                    label={t("profile.phone")}
                    icon={Phone}
                    type="tel"
                    value={editData.phoneNumber || ""}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, "");
                      setEditData({
                        ...editData,
                        phoneNumber: value,
                      });
                    }}
                    placeholder={t("profile.phone")}
                    maxLength={11}
                    error={
                      editData.phoneNumber &&
                      !/^[0-9]{10,11}$/.test(editData.phoneNumber)
                        ? t("profile.phoneInvalid")
                        : undefined
                    }
                  />

                  <CustomTextarea
                    label={t("profile.address")}
                    icon={MapPin}
                    value={editData.address || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, address: e.target.value })
                    }
                    rows={1}
                    placeholder={t("profile.address")}
                  />
                </div>

                <div className="flex justify-end mt-6">
                  <button
                    onClick={handleSave}
                    disabled={isSaving || !editData.fullName?.trim()}
                    className="px-6 py-2.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 transition-colors flex items-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        {t("profile.saving")}
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        {t("profile.saveChanges")}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

// Info Item Component - ĐÃ CHỈNH SỬA: Title bold, value font thường
const InfoItem = ({ label, value }: { label: string; value: string }) => (
  <div>
    <label className="block text-sm font-bold text-gray-900 mb-1">
      {label}
    </label>
    <p className="text-gray-600">{value}</p>
  </div>
);

export default Profile;
