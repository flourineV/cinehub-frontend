"use client";
import React, { useEffect, useState } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  Trash2,
  Film,
  Building2,
  Download,
} from "lucide-react";
import Swal from "sweetalert2";
import dayjs from "dayjs";
import * as XLSX from "xlsx";

import { showtimeService } from "@/services/showtime/showtimeService";
import { theaterService } from "@/services/showtime/theaterService";
import { roomService } from "@/services/showtime/roomService";
import { movieManagementService } from "@/services/movie/movieManagementService";
import { managerService, userProfileService } from "@/services/userprofile";
import type { ShowtimeDetailResponse } from "@/types/showtime/showtime.type";
import { useDebounce } from "@/hooks/useDebounce";
import { CustomDropdown } from "@/components/ui/CustomDropdown";
import { useAuthStore } from "@/stores/authStore";

const ITEMS_PER_PAGE = 10;

interface ManagerShowtimeTableProps {
  refreshTrigger?: number;
}

export default function ManagerShowtimeTable({
  refreshTrigger,
}: ManagerShowtimeTableProps): React.JSX.Element {
  const { user } = useAuthStore();
  const [showtimes, setShowtimes] = useState<ShowtimeDetailResponse[]>([]);
  const [paging, setPaging] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Manager's theater info
  const [managedTheaterId, setManagedTheaterId] = useState<string>("");
  const [managedTheaterName, setManagedTheaterName] = useState<string>("");
  const [loadingTheater, setLoadingTheater] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>("");
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [roomFilter, setRoomFilter] = useState<string>("");
  const [movieFilter, setMovieFilter] = useState<string>("");
  const [startOfDayFilter, setStartOfDayFilter] = useState<string>("");
  const [endOfDayFilter, setEndOfDayFilter] = useState<string>("");

  const [filterRooms, setFilterRooms] = useState<any[]>([]);
  const [filterMovies, setFilterMovies] = useState<any[]>([]);

  // Load manager's theater
  useEffect(() => {
    loadManagerTheater();
  }, [user]);

  const loadManagerTheater = async () => {
    if (!user?.id) return;

    setLoadingTheater(true);
    try {
      const profile = await userProfileService.getProfileByUserId(user.id);
      const managerInfo = await managerService.getManagerByUser(profile.id);
      setManagedTheaterName(managerInfo.managedCinemaName);

      // Get theater ID from name
      const theaters = await theaterService.getAllTheaters();
      const theater = theaters.find(
        (t) => t.name === managerInfo.managedCinemaName
      );
      if (theater) {
        setManagedTheaterId(theater.id);
        // Load rooms for this theater
        const rooms = await roomService.getRoomsByTheaterId(theater.id);
        setFilterRooms(rooms);
      }
    } catch (error) {
      console.error("Error loading manager theater:", error);
      Swal.fire({
        icon: "error",
        title: "Không thể tải thông tin rạp",
        text: "Vui lòng thử lại sau",
      });
    } finally {
      setLoadingTheater(false);
    }
  };

  // Load movies for filter
  useEffect(() => {
    const loadMovies = async () => {
      try {
        const moviesRes = await movieManagementService.adminList({
          page: 1,
          size: 1000,
          status: "NOW_PLAYING",
        });
        setFilterMovies(moviesRes.data ?? []);
      } catch (err) {
        console.error("Error loading movies", err);
      }
    };
    loadMovies();
  }, []);

  // Fetch showtimes when theater is loaded
  useEffect(() => {
    if (managedTheaterId) {
      fetchShowtimes(1, true);
    }
  }, [managedTheaterId]);

  // Refetch when filters change
  useEffect(() => {
    if (!loading && managedTheaterId) {
      fetchShowtimes(paging.page, false);
    }
  }, [
    roomFilter,
    movieFilter,
    startOfDayFilter,
    endOfDayFilter,
    debouncedSearch,
  ]);

  // Refetch when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger && managedTheaterId) {
      fetchShowtimes(paging.page, false);
    }
  }, [refreshTrigger]);

  const fetchShowtimes = async (page = 1, showSkeleton = false) => {
    if (!managedTheaterId) return;

    try {
      if (showSkeleton) setLoading(true);
      else setIsRefreshing(true);

      const criteria = {
        theaterId: managedTheaterId,
        roomId: roomFilter || undefined,
        movieId: movieFilter || undefined,
        // Only pass showtimeId if it looks like a valid UUID
        showtimeId:
          debouncedSearch &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            debouncedSearch
          )
            ? debouncedSearch
            : undefined,
        startOfDay: startOfDayFilter || undefined,
        endOfDay: endOfDayFilter || undefined,
      };

      const pageResp = await showtimeService.adminSearch(
        criteria,
        page,
        ITEMS_PER_PAGE,
        "startTime",
        "asc"
      );

      setShowtimes(pageResp.data ?? []);
      setPaging({
        page: pageResp.page ?? page,
        totalPages: pageResp.totalPages ?? 1,
        total: pageResp.totalElements ?? 0,
      });
    } catch (err) {
      console.error("fetchShowtimes error", err);
      Swal.fire({ icon: "error", title: "Không thể tải danh sách lịch chiếu" });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const goToNextPage = () => {
    if (paging.page < paging.totalPages && !isRefreshing) {
      setPaging((p) => ({ ...p, page: p.page + 1 }));
      fetchShowtimes(paging.page + 1, false);
    }
  };

  const goToPrevPage = () => {
    if (paging.page > 1 && !isRefreshing) {
      setPaging((p) => ({ ...p, page: p.page - 1 }));
      fetchShowtimes(paging.page - 1, false);
    }
  };

  async function deleteShowtime(id: string) {
    const showtime = showtimes.find((s) => s.id === id);
    const bookedSeats = showtime?.bookedSeats || 0;

    const confirm = await Swal.fire({
      title: "Xóa lịch chiếu?",
      html:
        bookedSeats > 0
          ? `Xóa lịch chiếu sẽ phải hoàn tiền cho <strong>${bookedSeats}</strong> ghế đã đặt.<br/>Hành động này không thể hoàn tác.`
          : "Hành động này không thể hoàn tác",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Xóa",
      cancelButtonText: "Hủy",
      confirmButtonColor: "#ef4444",
    });
    if (!confirm.isConfirmed) return;

    try {
      setDeletingId(id);
      await showtimeService.deleteShowtime(id);
      Swal.fire({
        icon: "success",
        title: "Đã xóa",
        timer: 900,
        showConfirmButton: false,
      });
      fetchShowtimes(paging.page, false);
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: "error", title: "Xóa thất bại" });
    } finally {
      setDeletingId(null);
    }
  }

  function exportAllCSV() {
    const headers = [
      "ID",
      "Phim",
      "Phòng",
      "Ngày chiếu",
      "Giờ bắt đầu",
      "Giờ kết thúc",
      "Ghế đã đặt",
    ];
    const rows = showtimes.map((s) => [
      s.id,
      s.movieTitle || "",
      s.roomName || "",
      dayjs(s.startTime).format("DD/MM/YYYY"),
      dayjs(s.startTime).format("HH:mm"),
      dayjs(s.endTime).format("HH:mm"),
      s.bookedSeats || 0,
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
    a.download = `showtimes_${managedTheaterName}_${dayjs().format("YYYY-MM-DD")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportAllExcel() {
    const wb = XLSX.utils.book_new();
    const wsData = [
      [
        "ID",
        "Phim",
        "Phòng",
        "Ngày chiếu",
        "Giờ bắt đầu",
        "Giờ kết thúc",
        "Ghế đã đặt",
      ],
      ...showtimes.map((s) => [
        s.id,
        s.movieTitle || "",
        s.roomName || "",
        dayjs(s.startTime).format("DD/MM/YYYY"),
        dayjs(s.startTime).format("HH:mm"),
        dayjs(s.endTime).format("HH:mm"),
        s.bookedSeats || 0,
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws["!cols"] = [
      { wch: 36 },
      { wch: 30 },
      { wch: 15 },
      { wch: 12 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, "Lịch chiếu");
    XLSX.writeFile(
      wb,
      `showtimes_${managedTheaterName}_${dayjs().format("YYYY-MM-DD")}.xlsx`
    );
  }

  // Loading skeleton
  if (loadingTheater || loading) {
    return (
      <div className="bg-white border border-gray-400 rounded-lg p-6 shadow-md">
        {/* Filters skeleton */}
        <div className="flex flex-col md:flex-row gap-3 mb-3">
          <div className="h-10 bg-gray-200 rounded-lg flex-1 animate-pulse"></div>
          <div className="h-10 w-40 bg-gray-200 rounded-lg animate-pulse"></div>
          <div className="h-10 w-40 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <div className="h-10 w-40 bg-gray-200 rounded-lg animate-pulse"></div>
          <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse"></div>
          <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>

        {/* Table skeleton */}
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

        {/* Pagination skeleton */}
        <div className="flex justify-between items-center pt-4">
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-400 rounded-lg p-6 shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-yellow-600" />
          <h3 className="text-lg font-semibold text-gray-800">
            Lịch chiếu tại {managedTheaterName}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportAllCSV}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-400 rounded-lg bg-white text-gray-700 hover:bg-gray-50"
          >
            <Download size={16} /> CSV
          </button>
          <button
            onClick={exportAllExcel}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-400 rounded-lg bg-green-600 text-white hover:bg-green-700"
          >
            <Download size={16} /> Excel
          </button>
        </div>
      </div>

      {/* Filters Row 1: Search */}
      <div className="flex flex-col md:flex-row gap-3 mb-3">
        <div className="flex items-center flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm theo ID lịch chiếu..."
            className="w-full pl-10 pr-4 py-2 text-sm rounded-lg
                      bg-white border border-gray-400
                      text-gray-700 placeholder-gray-400
                      focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500
                      transition"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPaging((p) => ({ ...p, page: 1 }));
            }}
          />
        </div>
      </div>

      {/* Filters Row 2: Dropdowns */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Phim
          </label>
          <CustomDropdown
            options={[
              { value: "", label: "Tất cả phim" },
              ...filterMovies.map((m) => ({ value: m.id, label: m.title })),
            ]}
            value={movieFilter}
            onChange={(value) => {
              setMovieFilter(value);
              setPaging((p) => ({ ...p, page: 1 }));
            }}
            placeholder="Tất cả phim"
            fullWidth
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Phòng
          </label>
          <CustomDropdown
            options={[
              { value: "", label: "Tất cả phòng" },
              ...filterRooms.map((r) => ({ value: r.id, label: r.name })),
            ]}
            value={roomFilter}
            onChange={(value) => {
              setRoomFilter(value);
              setPaging((p) => ({ ...p, page: 1 }));
            }}
            placeholder="Tất cả phòng"
            fullWidth
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Từ ngày
          </label>
          <input
            type="date"
            value={startOfDayFilter}
            onChange={(e) => {
              setStartOfDayFilter(e.target.value);
              setPaging((p) => ({ ...p, page: 1 }));
            }}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-400 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Đến ngày
          </label>
          <input
            type="date"
            value={endOfDayFilter}
            onChange={(e) => {
              setEndOfDayFilter(e.target.value);
              setPaging((p) => ({ ...p, page: 1 }));
            }}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-400 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
          />
        </div>
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
              <th className="w-[200px] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Phim
              </th>
              <th className="w-[120px] px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Phòng
              </th>
              <th className="w-[120px] px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ngày chiếu
              </th>
              <th className="w-[100px] px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Giờ chiếu
              </th>
              <th className="w-[100px] px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ghế đặt
              </th>
              <th className="w-[80px] px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Thao tác
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-400 bg-white">
            {showtimes.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="text-center py-10 text-gray-500 italic text-sm"
                >
                  Không có lịch chiếu nào
                </td>
              </tr>
            ) : (
              showtimes.map((s) => (
                <tr
                  key={s.id}
                  className="hover:bg-gray-50 transition duration-150"
                >
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                      <Film size={16} className="text-yellow-600" />
                      <span className="truncate font-medium">
                        {s.movieTitle}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-gray-700">
                    {s.roomName}
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-gray-700">
                    {dayjs(s.startTime).format("DD/MM/YYYY")}
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-gray-700">
                    <div className="flex items-center justify-center gap-1">
                      <Clock size={14} className="text-gray-400" />
                      {dayjs(s.startTime).format("HH:mm")}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center text-sm">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        (s.bookedSeats || 0) > 0
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {s.bookedSeats || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => deleteShowtime(s.id)}
                      disabled={deletingId === s.id}
                      className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                      title="Xóa lịch chiếu"
                    >
                      {deletingId === s.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-600 border-t-transparent"></div>
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col md:flex-row justify-between items-center pt-4 gap-3">
        <span className="text-sm text-gray-700">
          Trang {paging.page}/{paging.totalPages} • {paging.total} lịch chiếu
        </span>
        <div className="flex items-center space-x-2">
          <button
            onClick={goToPrevPage}
            disabled={paging.page <= 1 || isRefreshing}
            className={`p-2 rounded-md transition ${
              paging.page <= 1 || isRefreshing
                ? "text-gray-400 cursor-not-allowed"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goToNextPage}
            disabled={paging.page >= paging.totalPages || isRefreshing}
            className={`p-2 rounded-md transition ${
              paging.page >= paging.totalPages || isRefreshing
                ? "text-gray-400 cursor-not-allowed"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
