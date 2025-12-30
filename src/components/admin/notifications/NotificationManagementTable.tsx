"use client";
import React, { useEffect, useState } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  Bell,
  User,
  X,
  Ticket,
  Gift,
  RefreshCw,
} from "lucide-react";
import Swal from "sweetalert2";
import dayjs from "dayjs";
import * as XLSX from "xlsx";

import {
  notificationService,
  type NotificationResponse,
} from "@/services/notification/notification.service";
import { useDebounce } from "@/hooks/useDebounce";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

const TYPE_LABELS: Record<string, string> = {
  ALL: "Tất cả",
  BOOKING_TICKET: "Vé đặt",
  PROMOTION: "Khuyến mãi",
  BOOKING_REFUNDED: "Hoàn tiền",
};

const TYPE_COLORS: Record<string, string> = {
  BOOKING_TICKET: "bg-green-100 text-green-800",
  PROMOTION: "bg-purple-100 text-purple-800",
  BOOKING_REFUNDED: "bg-blue-100 text-blue-800",
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  BOOKING_TICKET: <Ticket size={16} className="text-green-600" />,
  PROMOTION: <Gift size={16} className="text-purple-600" />,
  BOOKING_REFUNDED: <RefreshCw size={16} className="text-blue-600" />,
};

const ITEMS_PER_PAGE = 10;

export default function NotificationManagementTable(): React.JSX.Element {
  const [notifications, setNotifications] = useState<NotificationResponse[]>(
    []
  );
  const [filteredNotifications, setFilteredNotifications] = useState<
    NotificationResponse[]
  >([]);
  const [paging, setPaging] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [selectedType, setSelectedType] = useState<string>("ALL");

  // Modal detail
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalNotification, setModalNotification] =
    useState<NotificationResponse | null>(null);

  useBodyScrollLock(isModalOpen);

  const fetchNotifications = async (showSkeleton = false) => {
    try {
      if (showSkeleton) setLoading(true);
      else setIsRefreshing(true);

      const data = await notificationService.getAllNotifications();
      // Sort by createdAt desc
      const sorted = data.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setNotifications(sorted);
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: "error", title: "Không thể tải danh sách thông báo" });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications(true);
  }, []);

  // Filter notifications client-side
  useEffect(() => {
    let filtered = [...notifications];

    // Filter by type
    if (selectedType !== "ALL") {
      filtered = filtered.filter((n) => n.type === selectedType);
    }

    // Filter by search term (title or message)
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      filtered = filtered.filter(
        (n) =>
          n.title.toLowerCase().includes(searchLower) ||
          n.message.toLowerCase().includes(searchLower)
      );
    }

    setFilteredNotifications(filtered);
    setPaging({
      page: 1,
      totalPages: Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1,
      total: filtered.length,
    });
  }, [notifications, selectedType, debouncedSearch]);

  const paginatedNotifications = filteredNotifications.slice(
    (paging.page - 1) * ITEMS_PER_PAGE,
    paging.page * ITEMS_PER_PAGE
  );

  const goToNextPage = () => {
    if (paging.page < paging.totalPages && !isRefreshing) {
      setPaging((p) => ({ ...p, page: p.page + 1 }));
    }
  };

  const goToPrevPage = () => {
    if (paging.page > 1 && !isRefreshing) {
      setPaging((p) => ({ ...p, page: p.page - 1 }));
    }
  };

  function openModal(notification: NotificationResponse) {
    setModalNotification(notification);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setModalNotification(null);
  }

  async function exportAllCSV() {
    try {
      const headers = [
        "ID",
        "Tiêu đề",
        "Nội dung",
        "Loại",
        "User ID",
        "Ngày tạo",
      ];
      const rows = filteredNotifications.map((n) => [
        n.id,
        n.title,
        n.message,
        TYPE_LABELS[n.type] || n.type,
        n.userId || "",
        dayjs(n.createdAt).format("DD/MM/YYYY HH:mm"),
      ]);

      const csvContent =
        "\uFEFF" +
        [headers, ...rows]
          .map((r) =>
            r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")
          )
          .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `notifications_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      Swal.fire({
        icon: "success",
        title: `Đã xuất ${filteredNotifications.length} thông báo (CSV)`,
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Export error:", error);
      Swal.fire({ icon: "error", title: "Lỗi xuất file" });
    }
  }

  async function exportAllExcel() {
    try {
      const wb = XLSX.utils.book_new();
      const wsData = [
        ["ID", "Tiêu đề", "Nội dung", "Loại", "User ID", "Ngày tạo"],
        ...filteredNotifications.map((n) => [
          n.id,
          n.title,
          n.message,
          TYPE_LABELS[n.type] || n.type,
          n.userId || "",
          dayjs(n.createdAt).format("DD/MM/YYYY HH:mm"),
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

      XLSX.utils.book_append_sheet(wb, ws, "Thông báo");
      XLSX.writeFile(
        wb,
        `notifications_${new Date().toISOString().split("T")[0]}.xlsx`
      );

      Swal.fire({
        icon: "success",
        title: `Đã xuất ${filteredNotifications.length} thông báo (Excel)`,
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Export error:", error);
      Swal.fire({ icon: "error", title: "Lỗi xuất file Excel" });
    }
  }

  if (loading) {
    return (
      <div className="bg-white border border-gray-400 rounded-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div className="h-10 bg-gray-200 rounded-lg w-full md:flex-1 animate-pulse"></div>
          <div className="flex items-center gap-2">
            <div className="h-10 w-28 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>
        </div>
        <div className="flex space-x-2 mb-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="h-8 w-24 bg-gray-200 rounded-lg animate-pulse"
            ></div>
          ))}
        </div>
        <div className="overflow-x-auto rounded-lg border border-gray-400">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                {Array.from({ length: 5 }).map((_, idx) => (
                  <th key={idx} className="px-6 py-3">
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-400 bg-white">
              {Array.from({ length: 5 }).map((_, rowIdx) => (
                <tr key={rowIdx}>
                  {Array.from({ length: 5 }).map((_, colIdx) => (
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
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div className="flex items-center w-full md:flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm theo tiêu đề hoặc nội dung..."
              className="w-full pl-10 pr-4 py-2 text-sm rounded-lg
                        bg-white border border-gray-400
                        text-gray-700 placeholder-gray-400
                        focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500
                        transition"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => exportAllCSV()}
              className="flex items-center gap-2 px-3 py-2 text-sm 
                        border border-gray-400 rounded-lg 
                        bg-white text-gray-700 hover:bg-gray-50
                        whitespace-nowrap shrink-0"
            >
              <Download size={16} /> Export CSV
            </button>
            <button
              onClick={() => exportAllExcel()}
              className="flex items-center gap-2 px-3 py-2 text-sm 
                        border border-gray-400 rounded-lg 
                        bg-green-600 text-white hover:bg-green-700
                        whitespace-nowrap shrink-0"
            >
              <Download size={16} /> Export Excel
            </button>
          </div>
        </div>

        {/* Type filter */}
        <div className="flex space-x-2 mb-4">
          <div className="flex border border-gray-400 rounded-lg p-0.5 bg-gray-50">
            {Object.entries(TYPE_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSelectedType(key)}
                className={`px-4 py-1 text-sm font-medium rounded-lg transition-colors
                  ${
                    selectedType === key
                      ? "bg-yellow-500 text-white shadow-sm font-semibold"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg relative border border-gray-400">
          {isRefreshing && (
            <div className="absolute inset-0 bg-white/60 flex items-center justify-center backdrop-blur-sm pointer-events-none z-10 rounded-lg">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
            </div>
          )}

          <table className="min-w-full divide-y divide-yellow-400/80 table-fixed">
            <thead className="sticky top-0 z-10 border-b border-gray-400 bg-gray-50">
              <tr>
                <th className="w-[300px] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nội dung
                </th>
                <th className="w-[120px] px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Loại
                </th>
                <th className="w-[150px] px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ngày tạo
                </th>
                <th className="w-[80px] px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Chi tiết
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-400 relative bg-white">
              {paginatedNotifications.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center py-10 text-gray-500 italic text-sm"
                  >
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                paginatedNotifications.map((n) => {
                  // Strip HTML tags for table preview
                  const plainText = n.message
                    .replace(/<[^>]*>/g, " ")
                    .replace(/\s+/g, " ")
                    .trim();
                  return (
                    <tr
                      key={n.id}
                      className="hover:bg-gray-50 transition duration-150"
                    >
                      <td className="px-6 py-4 text-sm text-gray-700">
                        <span className="line-clamp-2">{plainText}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                            TYPE_COLORS[n.type] || "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {TYPE_ICONS[n.type]}
                          {TYPE_LABELS[n.type] || n.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-700">
                        {dayjs(n.createdAt).format("DD/MM/YYYY HH:mm")}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <button
                          onClick={() => openModal(n)}
                          className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Xem chi tiết"
                        >
                          <Bell size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex justify-between items-center pt-4">
          <span className="text-sm text-gray-700">
            Trang {paging.page}/{paging.totalPages} • {paging.total} thông báo
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={goToPrevPage}
              disabled={paging.page <= 1}
              className={`p-2 rounded-md transition ${
                paging.page <= 1
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={goToNextPage}
              disabled={paging.page >= paging.totalPages}
              className={`p-2 rounded-md transition ${
                paging.page >= paging.totalPages
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {isModalOpen && modalNotification && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 py-6">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeModal}
          />

          <div className="relative w-full max-w-2xl bg-white border border-gray-400 rounded-2xl shadow-2xl z-10 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-xl font-bold text-gray-800">
                Chi tiết thông báo
              </h3>
              <button
                onClick={closeModal}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Thông tin chung
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Tiêu đề</p>
                    <p className="font-semibold text-gray-900">
                      {modalNotification.title}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Loại</p>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                        TYPE_COLORS[modalNotification.type] ||
                        "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {TYPE_ICONS[modalNotification.type]}
                      {TYPE_LABELS[modalNotification.type] ||
                        modalNotification.type}
                    </span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">User ID</p>
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-blue-600" />
                      <p className="font-semibold text-gray-900 truncate">
                        {modalNotification.userId || "N/A"}
                      </p>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Ngày tạo</p>
                    <p className="font-semibold text-gray-900">
                      {dayjs(modalNotification.createdAt).format(
                        "DD/MM/YYYY HH:mm"
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Nội dung
                </h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div
                    className="text-gray-700 prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: modalNotification.message,
                    }}
                  />
                </div>
              </div>

              {(modalNotification.bookingId || modalNotification.amount) && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Thông tin liên quan
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {modalNotification.bookingId && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">Booking ID</p>
                        <p className="font-semibold text-gray-900">
                          {modalNotification.bookingId}
                        </p>
                      </div>
                    )}
                    {modalNotification.amount && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">Số tiền</p>
                        <p className="font-semibold text-yellow-600">
                          {new Intl.NumberFormat("vi-VN").format(
                            modalNotification.amount
                          )}
                          đ
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
