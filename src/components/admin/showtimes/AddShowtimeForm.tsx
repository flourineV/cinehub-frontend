import React, { useState, useEffect } from "react";
import { Plus, Minus, ArrowUpFromLine, Wand2 } from "lucide-react";
import Swal from "sweetalert2";
import { showtimeService } from "@/services/showtime/showtimeService";
import { movieManagementService } from "@/services/movie/movieManagementService";
import { theaterService } from "@/services/showtime/theaterService";
import { roomService } from "@/services/showtime/roomService";
import { CustomDropdown } from "@/components/ui/CustomDropdown";
import DateInput from "@/components/ui/DateInput";

interface ShowtimeRow {
  id: string;
  movieId: string;
  theaterId: string;
  roomId: string;
  date: string;
  startHour: string;
  startMinute: string;
  endHour: string;
  endMinute: string;
}

interface AddShowtimeFormProps {
  onSuccess?: () => void;
}

export default function AddShowtimeForm({
  onSuccess,
}: AddShowtimeFormProps): React.JSX.Element {
  const [showtimeRows, setShowtimeRows] = useState<ShowtimeRow[]>([
    {
      id: Date.now().toString(),
      movieId: "",
      theaterId: "",
      roomId: "",
      date: "",
      startHour: "",
      startMinute: "",
      endHour: "",
      endMinute: "",
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [autoGenStep, setAutoGenStep] = useState<"idle" | "showtime" | "seats">(
    "idle"
  );
  const [autoGenStartDate, setAutoGenStartDate] = useState("");
  const [autoGenEndDate, setAutoGenEndDate] = useState("");

  // Dropdown data
  const [movies, setMovies] = useState<any[]>([]);
  const [theaters, setTheaters] = useState<any[]>([]);
  const [rooms, setRooms] = useState<Record<string, any[]>>({});

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load movies
        const moviesRes = await movieManagementService.adminList({
          page: 1,
          size: 1000,
          status: "NOW_PLAYING",
        });
        setMovies(moviesRes.data ?? []);

        // Load theaters
        const theatersRes = await theaterService.getAllTheaters();
        setTheaters(theatersRes);
      } catch (error) {
        console.error("Error loading dropdown data:", error);
      }
    };
    loadData();
  }, []);

  const loadRoomsForTheater = async (theaterId: string) => {
    try {
      const roomsRes = await roomService.getRoomsByTheaterId(theaterId);
      setRooms((prev) => ({ ...prev, [theaterId]: roomsRes }));
    } catch (error) {
      console.error("Error loading rooms:", error);
    }
  };

  const addShowtimeRow = () => {
    setShowtimeRows([
      ...showtimeRows,
      {
        id: Date.now().toString(),
        movieId: "",
        theaterId: "",
        roomId: "",
        date: "",
        startHour: "",
        startMinute: "",
        endHour: "",
        endMinute: "",
      },
    ]);
  };

  const removeShowtimeRow = (id: string) => {
    if (showtimeRows.length > 1) {
      setShowtimeRows(showtimeRows.filter((row) => row.id !== id));
    }
  };

  const updateShowtimeRow = (
    id: string,
    field: keyof Omit<ShowtimeRow, "id">,
    value: string
  ) => {
    setShowtimeRows(
      showtimeRows.map((row) => {
        if (row.id === id) {
          const updatedRow = { ...row, [field]: value };

          // Reset roomId when theater changes
          if (field === "theaterId") {
            updatedRow.roomId = "";
            if (value) {
              loadRoomsForTheater(value);
            }
          }

          return updatedRow;
        }
        return row;
      })
    );
  };

  const handleAutoGenerate = async () => {
    if (!autoGenStartDate || !autoGenEndDate) {
      Swal.fire({
        icon: "warning",
        title: "Thiếu thông tin",
        text: "Vui lòng chọn ngày bắt đầu và ngày kết thúc",
      });
      return;
    }

    const start = new Date(autoGenStartDate);
    const end = new Date(autoGenEndDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start < today) {
      Swal.fire({
        icon: "warning",
        title: "Ngày không hợp lệ",
        text: "Ngày bắt đầu phải từ hôm nay trở đi",
      });
      return;
    }

    if (start > end) {
      Swal.fire({
        icon: "warning",
        title: "Ngày không hợp lệ",
        text: "Ngày bắt đầu phải trước ngày kết thúc",
      });
      return;
    }

    // Max 7 days
    const diffDays = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays > 7) {
      Swal.fire({
        icon: "warning",
        title: "Khoảng thời gian quá dài",
        text: "Chỉ có thể tự động tạo lịch chiếu tối đa 7 ngày",
      });
      return;
    }

    setIsAutoGenerating(true);
    let showtimeResult: {
      totalGenerated: number;
      totalSkipped: number;
      message: string;
    } | null = null;
    let seatsResult: string | null = null;

    try {
      // Step 1: Generate showtimes
      setAutoGenStep("showtime");
      showtimeResult = await showtimeService.autoGenerate(
        autoGenStartDate,
        autoGenEndDate
      );

      // Step 2: Initialize seats for generated showtimes
      if (showtimeResult.totalGenerated > 0) {
        setAutoGenStep("seats");
        seatsResult = await showtimeService.initializeSeatsByRange(
          autoGenStartDate,
          autoGenEndDate
        );
      }

      // Show final result
      await Swal.fire({
        icon: showtimeResult.totalGenerated > 0 ? "success" : "info",
        title: "Hoàn tất tự động tạo lịch chiếu",
        html: `
          <div class="text-left space-y-3">
            <div class="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <p class="font-semibold text-yellow-800 mb-1">📅 Bước 1: Tạo lịch chiếu</p>
              <p class="text-sm"><strong>Tạo thành công:</strong> ${showtimeResult.totalGenerated}</p>
              <p class="text-sm"><strong>Bỏ qua (trùng):</strong> ${showtimeResult.totalSkipped}</p>
            </div>
            ${
              showtimeResult.totalGenerated > 0
                ? `
            <div class="p-3 bg-green-50 rounded-lg border border-green-200">
              <p class="font-semibold text-green-800 mb-1">🪑 Bước 2: Khởi tạo ghế</p>
              <p class="text-sm">${seatsResult || "Đã khởi tạo ghế cho các lịch chiếu mới"}</p>
            </div>
            `
                : ""
            }
            <p class="text-gray-600 text-sm mt-2">${showtimeResult.message}</p>
          </div>
        `,
      });

      if (showtimeResult.totalGenerated > 0) {
        setAutoGenStartDate("");
        setAutoGenEndDate("");
        onSuccess?.();
      }
    } catch (error) {
      console.error("Error auto-generating:", error);

      // Show partial result if showtime succeeded but seats failed
      if (showtimeResult && showtimeResult.totalGenerated > 0) {
        await Swal.fire({
          icon: "warning",
          title: "Hoàn tất một phần",
          html: `
            <div class="text-left space-y-3">
              <div class="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <p class="font-semibold text-yellow-800 mb-1">📅 Bước 1: Tạo lịch chiếu ✓</p>
                <p class="text-sm"><strong>Tạo thành công:</strong> ${showtimeResult.totalGenerated}</p>
              </div>
              <div class="p-3 bg-red-50 rounded-lg border border-red-200">
                <p class="font-semibold text-red-800 mb-1">🪑 Bước 2: Khởi tạo ghế ✗</p>
                <p class="text-sm text-red-600">${error instanceof Error ? error.message : "Có lỗi xảy ra"}</p>
              </div>
            </div>
          `,
        });
        onSuccess?.();
      } else {
        Swal.fire({
          icon: "error",
          title: "Lỗi tự động tạo lịch chiếu",
          text: error instanceof Error ? error.message : "Có lỗi xảy ra",
        });
      }
    } finally {
      setIsAutoGenerating(false);
      setAutoGenStep("idle");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all rows
    const validRows = showtimeRows.filter(
      (row) =>
        row.movieId &&
        row.theaterId &&
        row.roomId &&
        row.date &&
        row.startHour &&
        row.startMinute &&
        row.endHour &&
        row.endMinute
    );

    if (validRows.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Vui lòng điền đầy đủ thông tin ít nhất một lịch chiếu",
      });
      return;
    }

    // Validate each row
    for (const row of validRows) {
      // Construct datetime strings
      const startDateTime = `${row.date}T${row.startHour.padStart(2, "0")}:${row.startMinute.padStart(2, "0")}:00`;
      const endDateTime = `${row.date}T${row.endHour.padStart(2, "0")}:${row.endMinute.padStart(2, "0")}:00`;

      const startTime = new Date(startDateTime);
      const endTime = new Date(endDateTime);

      if (startTime >= endTime) {
        Swal.fire({
          icon: "warning",
          title: "Thời gian không hợp lệ",
          text: "Thời gian bắt đầu phải trước thời gian kết thúc",
        });
        return;
      }

      if (startTime <= new Date()) {
        Swal.fire({
          icon: "warning",
          title: "Thời gian không hợp lệ",
          text: "Thời gian bắt đầu phải sau thời điểm hiện tại",
        });
        return;
      }

      // Validate minimum duration (e.g., 30 minutes)
      const durationMinutes =
        (endTime.getTime() - startTime.getTime()) / (1000 * 60);
      if (durationMinutes < 30) {
        Swal.fire({
          icon: "warning",
          title: "Thời gian không hợp lệ",
          text: "Thời lượng lịch chiếu phải ít nhất 30 phút",
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // Prepare batch request
      const showtimes = validRows.map((row) => {
        const startDateTime = `${row.date}T${row.startHour.padStart(2, "0")}:${row.startMinute.padStart(2, "0")}:00`;
        const endDateTime = `${row.date}T${row.endHour.padStart(2, "0")}:${row.endMinute.padStart(2, "0")}:00`;

        return {
          movieId: row.movieId,
          theaterId: row.theaterId,
          roomId: row.roomId,
          startTime: startDateTime,
          endTime: endDateTime,
        };
      });

      const result = await showtimeService.batchCreate({
        showtimes,
        skipOnConflict: true,
      });

      const successCount = result.successCount || 0;
      const failedCount = result.errors?.length || 0;
      const totalRequests = validRows.length;

      // Show success message with details
      let successMessage = `
        <div class="text-left">
          <p><strong>Tổng số yêu cầu:</strong> ${totalRequests}</p>
          <p><strong>Thành công:</strong> ${successCount}</p>
          <p><strong>Thất bại:</strong> ${failedCount}</p>
        </div>
      `;

      // Show detailed errors if there are failures
      if (failedCount > 0 && result.errors) {
        const conflictErrors = result.errors.filter(
          (error: string) =>
            error.includes("conflict") ||
            error.includes("overlap") ||
            error.includes("trùng")
        );

        if (conflictErrors.length > 0) {
          successMessage += `<br><div class="text-left text-sm mt-2 text-red-600">
            <strong>Lỗi trùng lịch:</strong><br>
            ${conflictErrors
              .map(
                (error: string, index: number) =>
                  `• Lịch chiếu ${index + 1}: ${error}`
              )
              .join("<br>")}
          </div>`;
        }
      }

      await Swal.fire({
        icon: successCount > 0 ? "success" : "warning",
        title: "Kết quả tạo lịch chiếu",
        html: successMessage,
        confirmButtonText: "OK",
      });

      // Reset form on success
      if (successCount > 0) {
        setShowtimeRows([
          {
            id: Date.now().toString(),
            movieId: "",
            theaterId: "",
            roomId: "",
            date: "",
            startHour: "",
            startMinute: "",
            endHour: "",
            endMinute: "",
          },
        ]);
        onSuccess?.();
      }
    } catch (error) {
      console.error("Error creating showtimes:", error);
      Swal.fire({
        icon: "error",
        title: "Lỗi tạo lịch chiếu",
        text:
          error instanceof Error
            ? error.message
            : "Có lỗi xảy ra khi tạo lịch chiếu",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Auto Generate Section */}
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-300 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Wand2 className="w-5 h-5 text-yellow-600" />
          <h4 className="text-lg font-semibold text-gray-800">
            Tự động tạo lịch chiếu
          </h4>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Hệ thống sẽ tự động tạo lịch chiếu cho tất cả phim đang chiếu, phân bổ
          vào các phòng trống trong khoảng thời gian được chọn.
        </p>
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-48">
            <DateInput
              label="Từ ngày"
              value={autoGenStartDate}
              onChange={setAutoGenStartDate}
              required
            />
          </div>
          <div className="w-48">
            <DateInput
              label="Đến ngày"
              value={autoGenEndDate}
              onChange={setAutoGenEndDate}
              required
            />
          </div>
          <button
            type="button"
            onClick={handleAutoGenerate}
            disabled={isAutoGenerating || !autoGenStartDate || !autoGenEndDate}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg hover:from-yellow-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md min-w-[180px] justify-center"
          >
            {isAutoGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>
                  {autoGenStep === "showtime" && "Đang tạo lịch chiếu..."}
                  {autoGenStep === "seats" && "Đang khởi tạo ghế..."}
                </span>
              </>
            ) : (
              <>
                <Wand2 size={16} />
                Tự động tạo
              </>
            )}
          </button>
        </div>

        {/* Progress indicator */}
        {isAutoGenerating && (
          <div className="flex items-center gap-4 mt-4">
            <div
              className={`flex items-center gap-2 ${autoGenStep === "showtime" ? "text-yellow-600" : "text-green-600"}`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  autoGenStep === "showtime"
                    ? "bg-yellow-100 border-2 border-yellow-500 animate-pulse"
                    : "bg-green-100 border-2 border-green-500"
                }`}
              >
                {autoGenStep === "showtime" ? "1" : "✓"}
              </div>
              <span className="text-sm font-medium">Tạo lịch chiếu</span>
            </div>
            <div className="w-8 h-0.5 bg-gray-300"></div>
            <div
              className={`flex items-center gap-2 ${autoGenStep === "seats" ? "text-yellow-600" : "text-gray-400"}`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  autoGenStep === "seats"
                    ? "bg-yellow-100 border-2 border-yellow-500 animate-pulse"
                    : "bg-gray-100 border-2 border-gray-300"
                }`}
              >
                2
              </div>
              <span className="text-sm font-medium">Khởi tạo ghế</span>
            </div>
          </div>
        )}
        <p className="text-xs text-gray-500 mt-2">
          * Tối đa 7 ngày mỗi lần. Lịch chiếu trùng sẽ được bỏ qua.
        </p>
      </div>

      {/* Manual Create Section */}
      <div className="bg-white border border-gray-400 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Plus className="w-5 h-5 text-yellow-600" />
          <h4 className="text-lg font-semibold text-gray-800">
            Tạo lịch chiếu thủ công
          </h4>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Showtime Rows */}
          <div className="space-y-0">
            {showtimeRows.map((row) => (
              <div
                key={row.id}
                className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3 items-end"
              >
                {/* Movie - 3/12 cột */}
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phim <span className="text-red-500">*</span>
                  </label>
                  <CustomDropdown
                    options={[
                      { value: "", label: "Chọn phim" },
                      ...movies.map((movie) => ({
                        value: movie.id,
                        label: movie.title,
                      })),
                    ]}
                    value={row.movieId}
                    onChange={(value) =>
                      updateShowtimeRow(row.id, "movieId", value)
                    }
                    placeholder="Chọn phim"
                    fullWidth
                  />
                </div>

                {/* Theater - 2/12 cột */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rạp <span className="text-red-500">*</span>
                  </label>
                  <CustomDropdown
                    options={[
                      { value: "", label: "Chọn rạp" },
                      ...theaters.map((theater) => ({
                        value: theater.id,
                        label: theater.name,
                      })),
                    ]}
                    value={row.theaterId}
                    onChange={(value) =>
                      updateShowtimeRow(row.id, "theaterId", value)
                    }
                    placeholder="Chọn rạp"
                    fullWidth
                  />
                </div>

                {/* Room - 2/12 cột */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phòng <span className="text-red-500">*</span>
                  </label>
                  <CustomDropdown
                    options={[
                      { value: "", label: "Chọn phòng" },
                      ...(rooms[row.theaterId] || []).map((room) => ({
                        value: room.id,
                        label: room.name,
                      })),
                    ]}
                    value={row.roomId}
                    onChange={(value) =>
                      updateShowtimeRow(row.id, "roomId", value)
                    }
                    placeholder="Chọn phòng"
                    disabled={!row.theaterId}
                    fullWidth
                  />
                </div>

                {/* Date - 2/12 cột */}
                <div className="md:col-span-2">
                  <DateInput
                    label="Ngày chiếu"
                    value={row.date}
                    onChange={(value) =>
                      updateShowtimeRow(row.id, "date", value)
                    }
                    required
                  />
                </div>

                {/* Start Time - 1/12 cột */}
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bắt đầu <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={
                      row.startHour && row.startMinute
                        ? `${row.startHour.padStart(2, "0")}:${row.startMinute.padStart(2, "0")}`
                        : ""
                    }
                    onChange={(e) => {
                      const [hour, minute] = e.target.value.split(":");
                      updateShowtimeRow(row.id, "startHour", hour || "");
                      updateShowtimeRow(row.id, "startMinute", minute || "");
                    }}
                    className="w-full px-2 py-2 text-sm rounded-lg bg-white border border-gray-300 text-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition"
                    disabled={isSubmitting}
                  />
                </div>

                {/* End Time - 1/12 cột */}
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kết thúc <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={
                      row.endHour && row.endMinute
                        ? `${row.endHour.padStart(2, "0")}:${row.endMinute.padStart(2, "0")}`
                        : ""
                    }
                    onChange={(e) => {
                      const [hour, minute] = e.target.value.split(":");
                      updateShowtimeRow(row.id, "endHour", hour || "");
                      updateShowtimeRow(row.id, "endMinute", minute || "");
                    }}
                    className="w-full px-2 py-2 text-sm rounded-lg bg-white border border-gray-300 text-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Remove Button - 1/12 cột */}
                <div className="md:col-span-1 flex items-end justify-center pb-[2px]">
                  <button
                    type="button"
                    onClick={() => removeShowtimeRow(row.id)}
                    disabled={showtimeRows.length <= 1 || isSubmitting}
                    className="w-10 h-10 flex items-center justify-center bg-red-100 text-red-600 rounded-full hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-red-200"
                    title="Xóa dòng này"
                  >
                    <Minus size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={addShowtimeRow}
              className="flex items-center justify-center w-10 h-10 bg-yellow-500 text-black rounded-full hover:bg-yellow-600 transition-colors"
              disabled={isSubmitting}
              title="Thêm dòng mới"
            >
              <Plus size={18} />
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent"></div>
                  Đang tạo...
                </>
              ) : (
                <>
                  <ArrowUpFromLine size={16} />
                  Tạo tất cả lịch chiếu
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
