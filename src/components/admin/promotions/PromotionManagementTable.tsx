"use client";
import React, { useEffect, useState } from "react";
import {
  Search,
  Trash2,
  Edit2,
  Plus,
  Download,
  Tag,
  Percent,
  X,
  Calendar,
  Send,
} from "lucide-react";
import Swal from "sweetalert2";
import dayjs from "dayjs";
import * as XLSX from "xlsx";

import { promotionService } from "@/services/promotion/promotionService";
import type {
  PromotionResponse,
  PromotionRequest,
  DiscountType,
  PromotionType,
  UsageTimeRestriction,
} from "@/types/promotion/promotion.type";
import { useDebounce } from "@/hooks/useDebounce";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { CustomDropdown } from "@/components/ui/CustomDropdown";

const DISCOUNT_TYPE_LABELS: Record<DiscountType, string> = {
  FIXED_AMOUNT: "Số tiền cố định",
  PERCENTAGE: "Phần trăm",
};

const PROMOTION_TYPE_LABELS: Record<PromotionType, string> = {
  GENERAL: "Chung",
  BIRTHDAY: "Sinh nhật",
  MEMBERSHIP: "Thành viên",
  SPECIAL_EVENT: "Sự kiện đặc biệt",
};

const USAGE_TIME_LABELS: Record<UsageTimeRestriction, string> = {
  ANYTIME: "Mọi lúc",
  WEEKDAYS_ONLY: "Chỉ ngày thường",
  WEEKENDS_ONLY: "Chỉ cuối tuần",
  SPECIFIC_DAYS: "Ngày cụ thể",
};

const STATUS_LABELS: Record<string, string> = {
  ALL: "Tất cả",
  ACTIVE: "Đang hoạt động",
  INACTIVE: "Không hoạt động",
};

export default function PromotionManagementTable(): React.JSX.Element {
  const [promotions, setPromotions] = useState<PromotionResponse[]>([]);
  const [filteredPromotions, setFilteredPromotions] = useState<
    PromotionResponse[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedType, setSelectedType] = useState<string>("");

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState<PromotionRequest | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useBodyScrollLock(isModalOpen);

  const fetchPromotions = async (showSkeleton = false) => {
    try {
      if (showSkeleton) setLoading(true);
      else setIsRefreshing(true);

      const data = await promotionService.getAllPromotionsForAdmin();
      // Sort by createdAt/startDate desc
      const sorted = data.sort(
        (a, b) =>
          new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
      );
      setPromotions(sorted);
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Không thể tải danh sách mã giảm giá",
      });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPromotions(true);
  }, []);

  // Filter promotions client-side
  useEffect(() => {
    let filtered = [...promotions];

    // Filter by status
    if (selectedStatus === "ACTIVE") {
      filtered = filtered.filter((p) => p.isActive);
    } else if (selectedStatus === "INACTIVE") {
      filtered = filtered.filter((p) => !p.isActive);
    }

    // Filter by type
    if (selectedType) {
      filtered = filtered.filter((p) => p.promotionType === selectedType);
    }

    // Filter by search term
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.code.toLowerCase().includes(searchLower) ||
          p.description?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredPromotions(filtered);
  }, [promotions, selectedStatus, selectedType, debouncedSearch]);

  const openModal = (promo?: PromotionResponse) => {
    if (promo) {
      setModalData({
        code: promo.code,
        promotionType: promo.promotionType,
        discountType: promo.discountType,
        discountValue: promo.discountValue,
        startDate: promo.startDate.split("T")[0],
        endDate: promo.endDate.split("T")[0],
        isActive: promo.isActive,
        usageTimeRestriction: promo.usageTimeRestriction || "ANYTIME",
        description: promo.description || "",
        promoDisplayUrl: promo.promoDisplayUrl || "",
      });
      setEditingId(promo.id);
    } else {
      setModalData({
        code: "",
        promotionType: "GENERAL",
        discountType: "PERCENTAGE",
        discountValue: 0,
        startDate: dayjs().format("YYYY-MM-DD"),
        endDate: dayjs().add(30, "day").format("YYYY-MM-DD"),
        isActive: true,
        usageTimeRestriction: "ANYTIME",
        description: "",
        promoDisplayUrl: "",
      });
      setEditingId(null);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalData(null);
    setEditingId(null);
  };

  const savePromotion = async () => {
    if (!modalData?.code.trim()) {
      Swal.fire({ icon: "warning", title: "Vui lòng nhập mã giảm giá" });
      return;
    }
    if (!modalData.discountValue || modalData.discountValue <= 0) {
      Swal.fire({ icon: "warning", title: "Giá trị giảm phải lớn hơn 0" });
      return;
    }
    if (
      modalData.discountType === "PERCENTAGE" &&
      modalData.discountValue > 100
    ) {
      Swal.fire({
        icon: "warning",
        title: "Phần trăm giảm không được vượt quá 100%",
      });
      return;
    }

    try {
      setSaving(true);
      const payload = {
        ...modalData,
        startDate: `${modalData.startDate}T00:00:00`,
        endDate: `${modalData.endDate}T23:59:59`,
      };

      if (editingId) {
        await promotionService.updatePromotion(editingId, payload);
        Swal.fire({
          icon: "success",
          title: "Đã cập nhật",
          timer: 1000,
          showConfirmButton: false,
        });
      } else {
        await promotionService.createPromotion(payload);
        Swal.fire({
          icon: "success",
          title: "Đã thêm",
          timer: 1000,
          showConfirmButton: false,
        });
      }
      closeModal();
      fetchPromotions(false);
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Lưu thất bại",
        text: err.response?.data?.message || "Có lỗi xảy ra",
      });
    } finally {
      setSaving(false);
    }
  };

  const deletePromotion = async (id: string) => {
    const confirm = await Swal.fire({
      title: "Xóa mã giảm giá?",
      text: "Hành động này không thể hoàn tác",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Xóa",
      cancelButtonText: "Hủy",
      confirmButtonColor: "#ef4444",
    });
    if (!confirm.isConfirmed) return;

    try {
      setDeletingId(id);
      await promotionService.deletePromotion(id);
      Swal.fire({
        icon: "success",
        title: "Đã xóa",
        timer: 1000,
        showConfirmButton: false,
      });
      fetchPromotions(false);
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: "error", title: "Xóa thất bại" });
    } finally {
      setDeletingId(null);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("vi-VN").format(value) + "đ";

  const isExpired = (endDate: string) => {
    return new Date(endDate) < new Date();
  };

  // Export ALL promotions
  const exportAllCSV = () => {
    const headers = [
      "Mã",
      "Loại",
      "Kiểu giảm",
      "Giá trị",
      "Bắt đầu",
      "Kết thúc",
      "Trạng thái",
      "Mô tả",
    ];
    const rows = promotions.map((p) => [
      p.code,
      PROMOTION_TYPE_LABELS[p.promotionType] || p.promotionType,
      DISCOUNT_TYPE_LABELS[p.discountType] || p.discountType,
      p.discountType === "PERCENTAGE"
        ? `${p.discountValue}%`
        : formatCurrency(p.discountValue),
      dayjs(p.startDate).format("DD/MM/YYYY"),
      dayjs(p.endDate).format("DD/MM/YYYY"),
      p.isActive ? "Đang hoạt động" : "Không hoạt động",
      p.description || "",
    ]);

    const csvContent =
      "\uFEFF" +
      [headers, ...rows]
        .map((r) =>
          r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")
        )
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `promotions_${dayjs().format("YYYY-MM-DD")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAllExcel = () => {
    const wb = XLSX.utils.book_new();
    const wsData = [
      [
        "Mã",
        "Loại",
        "Kiểu giảm",
        "Giá trị",
        "Bắt đầu",
        "Kết thúc",
        "Trạng thái",
        "Mô tả",
      ],
      ...promotions.map((p) => [
        p.code,
        PROMOTION_TYPE_LABELS[p.promotionType] || p.promotionType,
        DISCOUNT_TYPE_LABELS[p.discountType] || p.discountType,
        p.discountType === "PERCENTAGE"
          ? `${p.discountValue}%`
          : formatCurrency(p.discountValue),
        dayjs(p.startDate).format("DD/MM/YYYY"),
        dayjs(p.endDate).format("DD/MM/YYYY"),
        p.isActive ? "Đang hoạt động" : "Không hoạt động",
        p.description || "",
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const colWidths = wsData[0].map((_, colIndex) => {
      const maxLength = Math.max(
        ...wsData.map((row) => String(row[colIndex] || "").length)
      );
      return { wch: Math.min(Math.max(maxLength + 2, 10), 50) };
    });
    ws["!cols"] = colWidths;
    XLSX.utils.book_append_sheet(wb, ws, "Mã giảm giá");
    XLSX.writeFile(wb, `promotions_${dayjs().format("YYYY-MM-DD")}.xlsx`);
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="bg-white border border-gray-400 rounded-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div className="h-10 bg-gray-200 rounded-lg w-full md:w-1/3 animate-pulse"></div>
          <div className="flex items-center gap-2">
            <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="h-10 w-28 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>
        </div>
        <div className="flex gap-2 mb-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              className="h-8 w-28 bg-gray-200 rounded-lg animate-pulse"
            ></div>
          ))}
        </div>
        <div className="overflow-x-auto rounded-lg border border-gray-400">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                {Array.from({ length: 6 }).map((_, idx) => (
                  <th key={idx} className="px-6 py-3">
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-400 bg-white">
              {Array.from({ length: 5 }).map((_, rowIdx) => (
                <tr key={rowIdx}>
                  {Array.from({ length: 6 }).map((_, colIdx) => (
                    <td key={colIdx} className="px-6 py-4">
                      <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white border border-gray-400 rounded-lg p-6">
        {/* Header: search + type dropdown + export */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div className="flex items-center w-full md:flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm mã giảm giá..."
              className="w-full pl-10 pr-4 py-2 text-sm rounded-lg bg-white border border-gray-400 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <CustomDropdown
              options={[
                { value: "", label: "Tất cả loại" },
                ...Object.entries(PROMOTION_TYPE_LABELS).map(
                  ([key, label]) => ({
                    value: key,
                    label: label,
                  })
                ),
              ]}
              value={selectedType}
              onChange={(value) => setSelectedType(value)}
              placeholder="Tất cả loại"
            />

            <button
              onClick={exportAllCSV}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-400 rounded-lg bg-white text-gray-700 hover:bg-gray-50 whitespace-nowrap shrink-0"
            >
              <Download size={16} /> Export CSV
            </button>

            <button
              onClick={exportAllExcel}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-400 rounded-lg bg-green-600 text-white hover:bg-green-700 whitespace-nowrap shrink-0"
            >
              <Download size={16} /> Export Excel
            </button>
          </div>
        </div>

        {/* Status filter bar */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex border border-gray-400 rounded-lg p-0.5 bg-gray-50">
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSelectedStatus(key)}
                className={`px-4 py-1 text-base font-medium rounded-lg transition-colors ${
                  selectedStatus === key
                    ? "bg-yellow-500 text-white shadow-sm font-semibold"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-black font-medium rounded-lg hover:bg-black hover:text-yellow-500 transition-colors"
          >
            <Plus size={18} /> Thêm mã giảm giá
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg relative border border-gray-400">
          {isRefreshing && (
            <div className="absolute inset-0 bg-white/60 flex items-center justify-center backdrop-blur-sm pointer-events-none z-10 rounded-lg">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
            </div>
          )}

          <table className="min-w-full divide-y divide-gray-400 table-fixed">
            <thead className="sticky top-0 z-10 border-b border-gray-400 bg-gray-50">
              <tr>
                <th className="w-[140px] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mã
                </th>
                <th className="w-[120px] px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Loại
                </th>
                <th className="w-[120px] px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Giảm giá
                </th>
                <th className="w-[140px] px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thời gian bắt đầu
                </th>
                <th className="w-[140px] px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thời gian kết thúc
                </th>
                <th className="w-[130px] px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="w-[120px] px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-400 bg-white">
              {filteredPromotions.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-10 text-gray-500 italic text-sm"
                  >
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                filteredPromotions.map((promo) => (
                  <tr
                    key={promo.id}
                    className="hover:bg-gray-50 transition duration-150"
                  >
                    <td className="px-4 py-4 text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        <Tag size={16} className="text-yellow-600" />
                        <span className="font-medium">{promo.code}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center text-sm text-gray-700">
                      {PROMOTION_TYPE_LABELS[promo.promotionType] ||
                        promo.promotionType}
                    </td>
                    <td className="px-4 py-4 text-center text-sm">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                        {promo.discountType === "PERCENTAGE" ? (
                          <>
                            <Percent size={14} />
                            {promo.discountValue}%
                          </>
                        ) : (
                          formatCurrency(promo.discountValue)
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center text-sm text-gray-700">
                      <span className="flex items-center justify-center gap-1">
                        <Calendar size={14} className="text-gray-400" />
                        {dayjs(promo.startDate).format("DD/MM/YYYY")}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center text-sm text-gray-700">
                      <span
                        className={`flex items-center justify-center gap-1 ${
                          isExpired(promo.endDate) ? "text-red-500" : ""
                        }`}
                      >
                        <Calendar size={14} className="text-gray-400" />
                        {dayjs(promo.endDate).format("DD/MM/YYYY")}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      {promo.isActive && !isExpired(promo.endDate) ? (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                          Đang hoạt động
                        </span>
                      ) : isExpired(promo.endDate) ? (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
                          Hết hạn
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                          Không hoạt động
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openModal(promo)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Chỉnh sửa"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => deletePromotion(promo.id)}
                          disabled={deletingId === promo.id}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                          title="Xóa"
                        >
                          {deletingId === promo.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="pt-4">
          <span className="text-sm text-gray-600">
            Hiển thị {filteredPromotions.length} mã giảm giá
          </span>
        </div>
      </div>

      {/* Modal Add/Edit */}
      {isModalOpen && modalData && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center px-4 py-6">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeModal}
          />
          <div className="relative w-full max-w-2xl bg-white border border-gray-400 rounded-2xl shadow-2xl z-10 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-xl font-bold text-gray-800">
                {editingId ? "Chỉnh sửa mã giảm giá" : "Thêm mã giảm giá mới"}
              </h3>
              <button
                onClick={closeModal}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-200"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mã giảm giá <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={modalData.code}
                  onChange={(e) =>
                    setModalData({
                      ...modalData,
                      code: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-full px-3 py-2 bg-white border border-gray-400 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  placeholder="VD: SUMMER2024"
                />
              </div>

              {/* Promotion Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Loại khuyến mãi
                </label>
                <select
                  value={modalData.promotionType}
                  onChange={(e) =>
                    setModalData({
                      ...modalData,
                      promotionType: e.target.value as PromotionType,
                    })
                  }
                  className="w-full px-3 py-2 bg-white border border-gray-400 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                >
                  {Object.entries(PROMOTION_TYPE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Discount Type & Value */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kiểu giảm giá
                  </label>
                  <select
                    value={modalData.discountType}
                    onChange={(e) =>
                      setModalData({
                        ...modalData,
                        discountType: e.target.value as DiscountType,
                      })
                    }
                    className="w-full px-3 py-2 bg-white border border-gray-400 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  >
                    {Object.entries(DISCOUNT_TYPE_LABELS).map(
                      ([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      )
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Giá trị <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={modalData.discountValue}
                      onChange={(e) =>
                        setModalData({
                          ...modalData,
                          discountValue: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-gray-400 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                      min={0}
                      max={
                        modalData.discountType === "PERCENTAGE"
                          ? 100
                          : undefined
                      }
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                      {modalData.discountType === "PERCENTAGE" ? "%" : "đ"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ngày bắt đầu
                  </label>
                  <input
                    type="date"
                    value={modalData.startDate}
                    onChange={(e) =>
                      setModalData({ ...modalData, startDate: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-white border border-gray-400 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ngày kết thúc
                  </label>
                  <input
                    type="date"
                    value={modalData.endDate}
                    onChange={(e) =>
                      setModalData({ ...modalData, endDate: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-white border border-gray-400 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  />
                </div>
              </div>

              {/* Usage Time Restriction */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Thời gian sử dụng
                </label>
                <select
                  value={modalData.usageTimeRestriction}
                  onChange={(e) =>
                    setModalData({
                      ...modalData,
                      usageTimeRestriction: e.target
                        .value as UsageTimeRestriction,
                    })
                  }
                  className="w-full px-3 py-2 bg-white border border-gray-400 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                >
                  {Object.entries(USAGE_TIME_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mô tả
                </label>
                <textarea
                  value={modalData.description}
                  onChange={(e) =>
                    setModalData({ ...modalData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white border border-gray-400 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 resize-none"
                  rows={3}
                  placeholder="Mô tả khuyến mãi..."
                />
              </div>

              {/* Promo Display URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL hình ảnh
                </label>
                <input
                  type="text"
                  value={modalData.promoDisplayUrl}
                  onChange={(e) =>
                    setModalData({
                      ...modalData,
                      promoDisplayUrl: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-white border border-gray-400 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  placeholder="https://..."
                />
              </div>

              {/* Is Active */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={modalData.isActive}
                  onChange={(e) =>
                    setModalData({ ...modalData, isActive: e.target.checked })
                  }
                  className="w-4 h-4 text-yellow-500 border-gray-300 rounded focus:ring-yellow-500"
                />
                <label
                  htmlFor="isActive"
                  className="text-sm font-medium text-gray-700"
                >
                  Kích hoạt ngay
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-400 rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={savePromotion}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-yellow-500 text-black font-medium rounded-lg hover:bg-yellow-600 disabled:opacity-50"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent"></div>
                ) : (
                  <Send size={16} />
                )}
                {editingId ? "Cập nhật" : "Thêm mới"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
