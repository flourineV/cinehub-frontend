import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { fnbService } from "@/services/fnb/fnbService";
import type { FnbItemResponse } from "@/types/fnb/fnb.type";
import type { TheaterResponse } from "@/types/showtime/theater.type";
import { ShoppingCart } from "lucide-react";
import FnbSummaryBar from "@/components/fnb/FnbSummaryBar";
import { useAuthStore } from "@/stores/authStore";
import { useLanguage } from "@/contexts/LanguageContext";
import CustomSelect from "@/components/ui/CustomSelect";
import Swal from "sweetalert2";

interface CartItem extends FnbItemResponse {
  quantity: number;
}

const PopcornDrinkPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { t, language } = useLanguage();
  const [theaters, setTheaters] = useState<TheaterResponse[]>([]);
  const [selectedTheaterId, setSelectedTheaterId] = useState<string>("");
  const [fnbItems, setFnbItems] = useState<FnbItemResponse[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingOrder, setCreatingOrder] = useState(false);

  // Get selected theater object
  const selectedTheater = theaters.find((t) => t.id === selectedTheaterId);

  // Load theaters and FnB items on mount (tất cả rạp đều có cùng thực đơn)
  useEffect(() => {
    const loadData = async () => {
      try {
        const [theaterList, items] = await Promise.all([
          fnbService.getTheaters(),
          fnbService.getAllFnbItems(), // Load tất cả FnB items ngay từ đầu
        ]);
        setTheaters(theaterList);
        setFnbItems(items);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const addToCart = (item: FnbItemResponse) => {
    setCart((prev) => {
      const existingItem = prev.find((cartItem) => cartItem.id === item.id);
      if (existingItem) {
        return prev.map((cartItem) =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      } else {
        return [...prev, { ...item, quantity: 1 }];
      }
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => {
      const existingItem = prev.find((cartItem) => cartItem.id === itemId);
      if (existingItem && existingItem.quantity > 1) {
        return prev.map((cartItem) =>
          cartItem.id === itemId
            ? { ...cartItem, quantity: cartItem.quantity - 1 }
            : cartItem
        );
      } else {
        return prev.filter((cartItem) => cartItem.id !== itemId);
      }
    });
  };

  const getItemQuantity = (itemId: string) => {
    const item = cart.find((cartItem) => cartItem.id === itemId);
    return item ? item.quantity : 0;
  };

  const getTotalAmount = () => {
    return cart.reduce(
      (total, item) => total + item.unitPrice * item.quantity,
      0
    );
  };

  const handleCheckout = async () => {
    // Check authentication first
    if (!user) {
      return Swal.fire({
        title: t("fnb.loginRequired"),
        text: t("fnb.loginRequiredDesc"),
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: t("fnb.login"),
        cancelButtonText: t("fnb.cancel"),
        confirmButtonColor: "#eab308",
      }).then((result) => {
        if (result.isConfirmed) {
          navigate("/auth");
        }
      });
    }

    // Validation
    if (!selectedTheater) {
      return Swal.fire({
        icon: "warning",
        title: t("fnb.noTheaterSelected"),
        text: t("fnb.noTheaterSelectedDesc"),
        confirmButtonColor: "#eab308",
      });
    }

    if (cart.length === 0) {
      return Swal.fire({
        icon: "warning",
        title: t("fnb.emptyCart"),
        text: t("fnb.emptyCartDesc"),
        confirmButtonColor: "#eab308",
      });
    }

    // Validate total amount > 0
    const total = getTotalAmount();
    if (total <= 0) {
      return Swal.fire({
        icon: "error",
        title: t("fnb.cartError"),
        text: t("fnb.cartErrorDesc"),
        confirmButtonColor: "#eab308",
      });
    }

    setCreatingOrder(true);

    // Show Swal loading
    Swal.fire({
      title: t("fnb.creatingOrder"),
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
      background: "#18181b",
      color: "#fff",
    });

    try {
      // Create FnB order
      const orderData = {
        userId: user.id,
        theaterId: selectedTheater.id,
        theaterName:
          language === "en" && selectedTheater.nameEn
            ? selectedTheater.nameEn
            : selectedTheater.name,
        theaterAddress:
          language === "en" && selectedTheater.addressEn
            ? selectedTheater.addressEn
            : selectedTheater.address,
        paymentMethod: "ZALOPAY",
        items: cart.map((item) => ({
          fnbItemId: item.id,
          quantity: item.quantity,
        })),
        language: language,
      };

      const order = await fnbService.createOrder(orderData);

      console.log("🔍 [PopcornDrink] Order created:", order);
      console.log("🔍 [PopcornDrink] Order ID:", order.id);
      console.log("🔍 [PopcornDrink] Order expiresAt:", order.expiresAt);

      // Calculate TTL from expiresAt
      const expiresAt = new Date(order.expiresAt);
      const ttl = Math.max(
        0,
        Math.floor((expiresAt.getTime() - Date.now()) / 1000)
      );

      Swal.close();

      // Navigate to FnB checkout with order data and TTL
      navigate("/fnb-checkout", {
        state: {
          theater: selectedTheater,
          cart: cart,
          totalAmount: total,
          order: order,
          ttl: ttl,
          ttlTimestamp: Date.now(),
        },
      });
    } catch (error: any) {
      console.error("❌ [PopcornDrink] Create order error:", error);
      console.error("❌ [PopcornDrink] Error response:", error.response?.data);
      console.error("❌ [PopcornDrink] Error status:", error.response?.status);

      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Có lỗi xảy ra khi tạo đơn hàng";

      Swal.fire({
        icon: "error",
        title: t("fnb.error"),
        text: `${errorMessage}. ${t("fnb.tryAgain")}`,
        confirmButtonColor: "#eab308",
        background: "#18181b",
        color: "#fff",
      });
    } finally {
      setCreatingOrder(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div
          className="min-h-screen flex items-center justify-center relative"
          style={{
            backgroundImage: "url('/background_profile.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-black/60" />
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-yellow-500 relative z-10"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div
        className="min-h-screen pt-8 pb-32 relative"
        style={{
          backgroundImage: "url('/background_profile.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/60" />
        {/* Header */}
        <div className="max-w-5xl mx-auto mb-8 relative z-10">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-extrabold text-yellow-500 mb-3">
              {t("fnb.title")}
            </h1>
            <p className="text-gray-300 font-light text-lg">
              {t("fnb.subtitle")}
            </p>
          </div>

          {/* Theater Selection - giống ShowtimePage */}
          <div className="space-y-2 max-w-md mx-auto mb-8 relative z-30">
            <CustomSelect
              variant="solid"
              options={[
                { value: "", label: t("fnb.selectTheaterPlaceholder") },
                ...theaters.map((theater) => ({
                  value: theater.id,
                  label:
                    language === "en" && theater.nameEn
                      ? theater.nameEn
                      : theater.name,
                })),
              ]}
              value={selectedTheaterId}
              onChange={setSelectedTheaterId}
              placeholder={t("fnb.selectTheaterPlaceholder")}
            />
          </div>
        </div>

        {/* FnB Items */}
        <div className="max-w-5xl mx-auto relative z-0">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                🍿 {t("fnb.menuTitle")}
              </h3>
              <p className="text-gray-600">{t("fnb.menuSubtitle")}</p>
            </div>

            {fnbItems.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 rounded-xl">
                <div className="bg-gray-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-4">
                  <ShoppingCart className="w-12 h-12 text-gray-400" />
                </div>
                <p className="text-gray-500 text-lg">{t("fnb.noItems")}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {fnbItems.map((item) => {
                  const quantity = getItemQuantity(item.id);
                  const isSelected = quantity > 0;

                  return (
                    <div key={item.id} className="relative group">
                      {/* Badge số lượng */}
                      {isSelected && (
                        <div className="absolute -top-3 -right-3 bg-yellow-500 text-black font-extrabold rounded-full w-8 h-8 flex items-center justify-center shadow-lg border-2 border-gray-900 z-10">
                          {quantity}
                        </div>
                      )}

                      {/* Card */}
                      <div
                        className={`relative h-full border rounded-xl overflow-hidden transition-all duration-300 ${
                          isSelected
                            ? "bg-gray-100 border-yellow-500 shadow-lg"
                            : "bg-gray-100 border-gray-300 hover:border-gray-400 hover:shadow-md"
                        }`}
                      >
                        <div className="relative overflow-hidden">
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>

                        <div className="p-4">
                          <h4 className="font-bold text-lg text-gray-900 mb-1">
                            {(language === "en" && item.nameEn) || item.name}
                          </h4>
                          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                            {(language === "en" && item.descriptionEn) ||
                              item.description}
                          </p>

                          <div className="flex items-center justify-between">
                            <div className="text-xl font-bold text-yellow-600">
                              {item.unitPrice.toLocaleString()}
                              <span className="text-sm text-gray-500 ml-1">
                                đ
                              </span>
                            </div>

                            {/* Controls giống SelectTicket */}
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => removeFromCart(item.id)}
                                disabled={quantity <= 0}
                                className={`w-10 h-10 flex items-center justify-center rounded-lg font-bold text-xl transition-all ${
                                  quantity <= 0
                                    ? "text-gray-300 cursor-not-allowed"
                                    : "bg-gray-200 text-gray-700 hover:bg-gray-300 hover:text-red-500 active:scale-95"
                                }`}
                              >
                                −
                              </button>

                              <div className="min-w-[40px] text-center font-mono text-xl text-gray-900 font-bold">
                                {quantity}
                              </div>

                              <button
                                onClick={() => addToCart(item)}
                                className="w-10 h-10 flex items-center justify-center rounded-lg bg-yellow-500 text-black font-bold text-xl transition-all hover:bg-yellow-400 active:scale-95"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* FnB Summary Bar */}
        <FnbSummaryBar
          theaterName={
            selectedTheater
              ? (language === "en" && selectedTheater.nameEn) ||
                selectedTheater.name
              : t("fnb.noTheater")
          }
          totalPrice={getTotalAmount()}
          itemCount={cart.reduce((total, item) => total + item.quantity, 0)}
          isVisible={cart.length > 0}
          onSubmit={handleCheckout}
          loading={creatingOrder}
        />
      </div>
    </Layout>
  );
};

export default PopcornDrinkPage;
