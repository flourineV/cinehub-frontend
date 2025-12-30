"use client";
import React, { useEffect, useState } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  Star,
  User,
  Film,
  X,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  RotateCcw,
} from "lucide-react";
import Swal from "sweetalert2";
import dayjs from "dayjs";
import * as XLSX from "xlsx";

import { reviewService } from "@/services/review/review.service";
import { movieManagementService } from "@/services/movie/movieManagementService";
import type { ReviewResponse } from "@/types/review/review.type";
import { useDebounce } from "@/hooks/useDebounce";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { CustomDropdown } from "@/components/ui/CustomDropdown";

const STATUS_LABELS: Record<string, string> = {
  ALL: "Tất cả",
  VISIBLE: "Hiển thị",
  HIDDEN: "Đã ẩn",
  REPORTED: "Bị báo cáo",
};

const STATUS_COLORS: Record<string, string> = {
  VISIBLE: "bg-green-100 text-green-800",
  HIDDEN: "bg-gray-100 text-gray-800",
  REPORTED: "bg-red-100 text-red-800",
};

const ITEMS_PER_PAGE = 10;

export default function ReviewManagementTable(): React.JSX.Element {
  const [reviews, setReviews] = useState<ReviewResponse[]>([]);
  const [filteredReviews, setFilteredReviews] = useState<ReviewResponse[]>([]);
  const [paging, setPaging] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [movieFilter, setMovieFilter] = useState<string>("");

  const [movies, setMovies] = useState<any[]>([]);
  const [hidingId, setHidingId] = useState<string | null>(null);

  // Modal detail
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalReview, setModalReview] = useState<ReviewResponse | null>(null);

  useBodyScrollLock(isModalOpen);

  // Load movies for filter
  useEffect(() => {
    const loadMovies = async () => {
      try {
        const res = await movieManagementService.adminList({
          page: 1,
          size: 1000,
        });
        setMovies(res.data ?? []);
      } catch (err) {
        console.error("Error loading movies:", err);
      }
    };
    loadMovies();
  }, []);

  const fetchReviews = async (showSkeleton = false) => {
    try {
      if (showSkeleton) setLoading(true);
      else setIsRefreshing(true);

      // Fetch reviews for all movies or selected movie (admin endpoint - includes HIDDEN)
      let allReviews: ReviewResponse[] = [];

      if (movieFilter) {
        allReviews = await reviewService.getAllReviewsByMovieAdmin(movieFilter);
      } else {
        // Fetch reviews for all movies
        const moviePromises = movies.map((m) =>
          reviewService.getAllReviewsByMovieAdmin(m.id).catch(() => [])
        );
        const results = await Promise.all(moviePromises);
        allReviews = results.flat();
      }

      // Sort by createdAt desc
      const sorted = allReviews.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setReviews(sorted);
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: "error", title: "Không thể tải danh sách đánh giá" });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (movies.length > 0) {
      fetchReviews(true);
    }
  }, [movies, movieFilter]);

  // Filter reviews client-side
  useEffect(() => {
    let filtered = [...reviews];

    // Filter by status
    if (selectedStatus === "VISIBLE") {
      filtered = filtered.filter((r) => r.status === "VISIBLE" && !r.reported);
    } else if (selectedStatus === "HIDDEN") {
      filtered = filtered.filter((r) => r.status === "HIDDEN");
    } else if (selectedStatus === "REPORTED") {
      filtered = filtered.filter((r) => r.reported);
    }

    // Filter by search term
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.fullName?.toLowerCase().includes(searchLower) ||
          r.comment?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredReviews(filtered);
    setPaging({
      page: 1,
      totalPages: Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1,
      total: filtered.length,
    });
  }, [reviews, selectedStatus, debouncedSearch]);

  const paginatedReviews = filteredReviews.slice(
    (paging.page - 1) * ITEMS_PER_PAGE,
    paging.page * ITEMS_PER_PAGE
  );

  const goToNextPage = () => {
    if (paging.page < paging.totalPages) {
      setPaging((p) => ({ ...p, page: p.page + 1 }));
    }
  };

  const goToPrevPage = () => {
    if (paging.page > 1) {
      setPaging((p) => ({ ...p, page: p.page - 1 }));
    }
  };

  const getMovieTitle = (movieId: string) => {
    const movie = movies.find((m) => m.id === movieId);
    return movie?.title || "N/A";
  };

  const getStatusDisplay = (review: ReviewResponse) => {
    if (review.reported) return "REPORTED";
    return review.status || "VISIBLE";
  };

  async function handleHideReview(id: string) {
    const confirm = await Swal.fire({
      title: "Ẩn đánh giá này?",
      text: "Đánh giá sẽ không hiển thị cho người dùng",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ẩn",
      cancelButtonText: "Hủy",
      confirmButtonColor: "#ef4444",
    });
    if (!confirm.isConfirmed) return;

    try {
      setHidingId(id);
      await reviewService.hideReview(id);
      Swal.fire({
        icon: "success",
        title: "Đã ẩn đánh giá",
        timer: 1000,
        showConfirmButton: false,
      });
      fetchReviews(false);
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: "error", title: "Không thể ẩn đánh giá" });
    } finally {
      setHidingId(null);
    }
  }

  async function handleUnhideReview(id: string) {
    const confirm = await Swal.fire({
      title: "Hiện lại đánh giá này?",
      text: "Đánh giá sẽ hiển thị cho người dùng",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Hiện lại",
      cancelButtonText: "Hủy",
      confirmButtonColor: "#22c55e",
    });
    if (!confirm.isConfirmed) return;

    try {
      setHidingId(id);
      await reviewService.unhideReview(id);
      Swal.fire({
        icon: "success",
        title: "Đã hiện lại đánh giá",
        timer: 1000,
        showConfirmButton: false,
      });
      fetchReviews(false);
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: "error", title: "Không thể hiện lại đánh giá" });
    } finally {
      setHidingId(null);
    }
  }

  async function handleDismissReport(id: string) {
    const confirm = await Swal.fire({
      title: "Bỏ qua báo cáo này?",
      text: "Đánh giá sẽ không còn bị đánh dấu là bị báo cáo",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Bỏ qua",
      cancelButtonText: "Hủy",
      confirmButtonColor: "#3b82f6",
    });
    if (!confirm.isConfirmed) return;

    try {
      setHidingId(id);
      await reviewService.dismissReport(id);
      Swal.fire({
        icon: "success",
        title: "Đã bỏ qua báo cáo",
        timer: 1000,
        showConfirmButton: false,
      });
      fetchReviews(false);
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: "error", title: "Không thể bỏ qua báo cáo" });
    } finally {
      setHidingId(null);
    }
  }

  function openModal(review: ReviewResponse) {
    setModalReview(review);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setModalReview(null);
  }

  async function exportAllCSV() {
    try {
      const headers = [
        "ID",
        "Người đánh giá",
        "Phim",
        "Điểm",
        "Nội dung",
        "Trạng thái",
        "Ngày tạo",
      ];
      const rows = filteredReviews.map((r) => [
        r.id,
        r.fullName || "",
        getMovieTitle(r.movieId),
        r.rating,
        r.comment || "",
        STATUS_LABELS[getStatusDisplay(r)] || getStatusDisplay(r),
        dayjs(r.createdAt).format("DD/MM/YYYY HH:mm"),
      ]);

      const csvContent =
        "\uFEFF" +
        [headers, ...rows]
          .map((row) =>
            row.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")
          )
          .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reviews_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      Swal.fire({
        icon: "success",
        title: `Đã xuất ${filteredReviews.length} đánh giá (CSV)`,
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
        [
          "ID",
          "Người đánh giá",
          "Phim",
          "Điểm",
          "Nội dung",
          "Trạng thái",
          "Ngày tạo",
        ],
        ...filteredReviews.map((r) => [
          r.id,
          r.fullName || "",
          getMovieTitle(r.movieId),
          r.rating,
          r.comment || "",
          STATUS_LABELS[getStatusDisplay(r)] || getStatusDisplay(r),
          dayjs(r.createdAt).format("DD/MM/YYYY HH:mm"),
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

      XLSX.utils.book_append_sheet(wb, ws, "Đánh giá");
      XLSX.writeFile(
        wb,
        `reviews_${new Date().toISOString().split("T")[0]}.xlsx`
      );

      Swal.fire({
        icon: "success",
        title: `Đã xuất ${filteredReviews.length} đánh giá (Excel)`,
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Export error:", error);
      Swal.fire({ icon: "error", title: "Lỗi xuất file Excel" });
    }
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={14}
            className={
              star <= rating
                ? "text-yellow-500 fill-yellow-500"
                : "text-gray-300"
            }
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-400 rounded-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div className="h-10 bg-gray-200 rounded-lg w-full md:flex-1 animate-pulse"></div>
          <div className="flex items-center gap-2">
            <div className="h-10 w-40 bg-gray-200 rounded-lg animate-pulse"></div>
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
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div className="flex items-center w-full md:flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm theo tên người đánh giá hoặc nội dung..."
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
            <CustomDropdown
              options={[
                { value: "", label: "Tất cả phim" },
                ...movies.map((m) => ({ value: m.id, label: m.title })),
              ]}
              value={movieFilter}
              onChange={(value) => setMovieFilter(value)}
              placeholder="Tất cả phim"
            />
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

        {/* Status filter */}
        <div className="flex space-x-2 mb-4">
          <div className="flex border border-gray-400 rounded-lg p-0.5 bg-gray-50">
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSelectedStatus(key)}
                className={`px-4 py-1 text-sm font-medium rounded-lg transition-colors
                  ${
                    selectedStatus === key
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
                <th className="w-[150px] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Người đánh giá
                </th>
                <th className="w-[180px] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phim
                </th>
                <th className="w-[100px] px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Điểm
                </th>
                <th className="w-[200px] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nội dung
                </th>
                <th className="w-[100px] px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="w-[100px] px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-400 relative bg-white">
              {paginatedReviews.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-10 text-gray-500 italic text-sm"
                  >
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                paginatedReviews.map((r) => {
                  const status = getStatusDisplay(r);
                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-gray-50 transition duration-150"
                    >
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          {r.avatarUrl ? (
                            <img
                              src={r.avatarUrl}
                              alt={r.fullName}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <User size={20} className="text-gray-400" />
                          )}
                          <span className="font-medium truncate">
                            {r.fullName || "Ẩn danh"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <Film size={16} className="text-purple-600" />
                          <span className="truncate">
                            {getMovieTitle(r.movieId)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {renderStars(r.rating)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        <span className="line-clamp-2">
                          {r.comment || "Không có nội dung"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                            STATUS_COLORS[status] || "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {status === "REPORTED" && <AlertTriangle size={12} />}
                          {STATUS_LABELS[status] || status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openModal(r)}
                            className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Xem chi tiết"
                          >
                            <Eye size={16} />
                          </button>
                          {/* Nút bỏ qua báo cáo - chỉ hiện khi review bị reported */}
                          {r.reported && (
                            <button
                              onClick={() => handleDismissReport(r.id)}
                              disabled={hidingId === r.id}
                              className="p-2 rounded-lg text-orange-600 hover:bg-orange-50 transition-colors disabled:opacity-50"
                              title="Bỏ qua báo cáo"
                            >
                              {hidingId === r.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-orange-600 border-t-transparent"></div>
                              ) : (
                                <CheckCircle size={16} />
                              )}
                            </button>
                          )}
                          {/* Nút ẩn - hiện khi review chưa bị ẩn */}
                          {status !== "HIDDEN" && (
                            <button
                              onClick={() => handleHideReview(r.id)}
                              disabled={hidingId === r.id}
                              className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                              title="Ẩn đánh giá"
                            >
                              {hidingId === r.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-600 border-t-transparent"></div>
                              ) : (
                                <EyeOff size={16} />
                              )}
                            </button>
                          )}
                          {/* Nút hiện lại - chỉ hiện khi review đã bị ẩn */}
                          {status === "HIDDEN" && (
                            <button
                              onClick={() => handleUnhideReview(r.id)}
                              disabled={hidingId === r.id}
                              className="p-2 rounded-lg text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50"
                              title="Hiện lại đánh giá"
                            >
                              {hidingId === r.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-600 border-t-transparent"></div>
                              ) : (
                                <RotateCcw size={16} />
                              )}
                            </button>
                          )}
                        </div>
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
            Trang {paging.page}/{paging.totalPages} • {paging.total} đánh giá
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
      {isModalOpen && modalReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeModal}
          />

          <div className="relative w-full max-w-2xl bg-white border border-gray-400 rounded-2xl shadow-2xl z-10 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-xl font-bold text-gray-800">
                Chi tiết đánh giá
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
                  Thông tin người đánh giá
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Người đánh giá</p>
                    <div className="flex items-center gap-2">
                      {modalReview.avatarUrl ? (
                        <img
                          src={modalReview.avatarUrl}
                          alt={modalReview.fullName}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <User size={20} className="text-gray-400" />
                      )}
                      <p className="font-semibold text-gray-900">
                        {modalReview.fullName || "Ẩn danh"}
                      </p>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Trạng thái</p>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                        STATUS_COLORS[getStatusDisplay(modalReview)] ||
                        "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {getStatusDisplay(modalReview) === "REPORTED" && (
                        <AlertTriangle size={12} />
                      )}
                      {STATUS_LABELS[getStatusDisplay(modalReview)] ||
                        getStatusDisplay(modalReview)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Thông tin phim
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Phim</p>
                    <div className="flex items-center gap-2">
                      <Film size={16} className="text-purple-600" />
                      <p className="font-semibold text-gray-900">
                        {getMovieTitle(modalReview.movieId)}
                      </p>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Điểm đánh giá</p>
                    <div className="flex items-center gap-2">
                      {renderStars(modalReview.rating)}
                      <span className="font-semibold text-gray-900">
                        {modalReview.rating}/5
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Nội dung đánh giá
                </h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {modalReview.comment || "Không có nội dung"}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Thời gian
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Ngày tạo</p>
                    <p className="font-semibold text-gray-900">
                      {dayjs(modalReview.createdAt).format("DD/MM/YYYY HH:mm")}
                    </p>
                  </div>
                  {modalReview.updatedAt && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">
                        Cập nhật lần cuối
                      </p>
                      <p className="font-semibold text-gray-900">
                        {dayjs(modalReview.updatedAt).format(
                          "DD/MM/YYYY HH:mm"
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
