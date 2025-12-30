// src/services/showtimeService.ts
import { showtimeClient } from "@/services/apiClient"; // sửa path nếu khác
import type {
  ShowtimeRequest,
  ShowtimeResponse,
  ShowtimeDetailResponse,
  MovieShowtimeResponse,
  BatchShowtimeRequest,
  BatchShowtimeResponse,
  ShowtimeConflictResponse,
  TheaterShowtimesResponse,
} from "@/types/showtime/showtime.type";
import type { PageResponse } from "@/types/PageResponse"; // nếu bạn dùng tên khác/path khác thì chỉnh lại

export const showtimeService = {
  async getAllShowtimes(): Promise<ShowtimeResponse[]> {
    const res = await showtimeClient.get("");
    return res.data;
  },

  async getShowtimeById(id: string): Promise<ShowtimeResponse> {
    const res = await showtimeClient.get(`/${id}`);
    return res.data;
  },

  async getShowtimesByMovie(movieId: string): Promise<MovieShowtimeResponse> {
    const res = await showtimeClient.get(`/by-movie/${movieId}`);
    return res.data;
  },

  async getTheaterShowtimesByProvinceAndDate(
    provinceId: string,
    date: string
  ): Promise<TheaterShowtimesResponse[]> {
    const res = await showtimeClient.get(`/by-province-and-date`, {
      params: { provinceId, date },
    });
    return res.data;
  },

  async getTheaterShowtimesByMovieAndProvince(
    movieId: string,
    provinceId: string
  ): Promise<TheaterShowtimesResponse[]> {
    const res = await showtimeClient.get(`/by-movie-and-province`, {
      params: { movieId, provinceId },
    });
    return res.data;
  },

  async getShowtimesByTheaterAndDate(
    theaterId: string,
    startDate: string,
    endDate: string
  ): Promise<ShowtimeResponse[]> {
    const res = await showtimeClient.get(`/by-theater`, {
      params: { theaterId, startDate, endDate },
    });
    return res.data;
  },

  async getShowtimesByRoomAndDateRange(
    roomId: string,
    start: string,
    end: string
  ): Promise<ShowtimeResponse[]> {
    const res = await showtimeClient.get(`/by-room`, {
      params: { roomId, start, end },
    });
    return res.data;
  },

  async createShowtime(payload: ShowtimeRequest): Promise<ShowtimeResponse> {
    const res = await showtimeClient.post("", payload);
    return res.data;
  },

  async createShowtimesBatch(
    payload: BatchShowtimeRequest
  ): Promise<BatchShowtimeResponse> {
    const res = await showtimeClient.post("/batch", payload);
    return res.data;
  },

  async batchCreate(
    payload: BatchShowtimeRequest
  ): Promise<BatchShowtimeResponse> {
    const res = await showtimeClient.post("/batch", payload);
    return res.data;
  },

  async getStatsOverview(theaterId?: string): Promise<{
    totalShowtimes: number;
    activeShowtimes: number;
    upcomingShowtimes: number;
    weeklyShowtimes: number;
  }> {
    const params = theaterId ? { theaterId } : {};
    const res = await showtimeClient.get("/stats/overview", { params });
    return res.data;
  },

  async updateShowtime(
    id: string,
    payload: ShowtimeRequest
  ): Promise<ShowtimeResponse> {
    const res = await showtimeClient.put(`/${id}`, payload);
    return res.data;
  },

  async deleteShowtime(id: string): Promise<void> {
    await showtimeClient.delete(`/${id}`);
  },

  /**
   * Get all available showtimes (admin/manager). Supports pagination & filters.
   * params:
   *  - filters: object containing optional provinceId, theaterId, roomId, movieId, showtimeId
   *  - page, size, sortBy, sortType
   */
  adminSearch: async (
    criteria: any,
    page = 0,
    size = 10,
    sortBy = "startTime",
    sortType = "desc"
  ): Promise<PageResponse<ShowtimeDetailResponse>> => {
    const params = {
      ...criteria,
      page,
      size,
      sortBy,
      sortType,
    };

    const res = await showtimeClient.get<PageResponse<ShowtimeDetailResponse>>(
      "/admin/search",
      { params }
    );

    return res.data;
  },

  async getAllAvailableShowtimes(
    filters: {
      provinceId?: string;
      theaterId?: string;
      roomId?: string;
      movieId?: string;
      showtimeId?: string;
      selectedDate?: string;
      startOfDay?: string;
      endOfDay?: string;
      fromTime?: string;
      toTime?: string;
    } = {},
    page = 1,
    size = 10,
    sortBy?: string,
    sortType?: "asc" | "desc"
  ): Promise<PageResponse<ShowtimeDetailResponse>> {
    const params: Record<string, any> = { page, size, ...filters };
    if (sortBy) params.sortBy = sortBy;
    if (sortType) params.sortType = sortType;
    const res = await showtimeClient.get("/admin/available", { params });
    return res.data;
  },

  /**
   * Validate a showtime for conflicts (server returns ShowtimeConflictResponse)
   */
  async validateShowtime(
    payload: unknown /* ValidateShowtimeRequest type if exists */
  ): Promise<ShowtimeConflictResponse> {
    const res = await showtimeClient.post("/validate", payload);
    return res.data;
  },

  /**
   * Auto-generate showtimes for a date range
   */
  async autoGenerate(
    startDate: string,
    endDate: string
  ): Promise<{
    totalGenerated: number;
    totalSkipped: number;
    message: string;
    details?: {
      theaterName: string;
      roomName: string;
      movieTitle: string;
      startTime: string;
    }[];
  }> {
    const res = await showtimeClient.post("/auto-generate", null, {
      params: { startDate, endDate },
    });
    return res.data;
  },

  /**
   * Initialize seats for a showtime
   */
  async initializeSeats(showtimeId: string): Promise<void> {
    await showtimeClient.post(`/${showtimeId}/initialize-seats`);
  },

  /**
   * Batch initialize seats for multiple showtimes
   */
  async batchInitializeSeats(showtimeIds: string[]): Promise<string> {
    const res = await showtimeClient.post("/seats/initialize-seats", {
      showtimeIds,
    });
    return res.data;
  },

  /**
   * Initialize seats for showtimes in a date range
   */
  async initializeSeatsByRange(
    startDate: string,
    endDate: string
  ): Promise<string> {
    const res = await showtimeClient.post(
      "/seats/initialize-seats/range",
      null,
      {
        params: { startDate, endDate },
      }
    );
    return res.data;
  },
};

// Seat Lock Service
export const seatLockService = {
  /**
   * Lock seats for a showtime
   */
  async lockSeats(
    payload: import("@/types/showtime/showtime.type").SeatLockRequest
  ): Promise<import("@/types/showtime/showtime.type").SeatLockResponse[]> {
    const res = await showtimeClient.post("/seat-lock/lock", payload);
    return res.data;
  },

  /**
   * Release locked seats
   */
  async releaseSeats(
    payload: import("@/types/showtime/showtime.type").SeatReleaseRequest
  ): Promise<import("@/types/showtime/showtime.type").SeatLockResponse[]> {
    const res = await showtimeClient.post("/seat-lock/release", payload);
    return res.data;
  },

  /**
   * Get seat lock status
   */
  async getSeatStatus(
    showtimeId: string,
    seatId: string
  ): Promise<import("@/types/showtime/showtime.type").SeatLockResponse> {
    const res = await showtimeClient.get("/seat-lock/status", {
      params: { showtimeId, seatId },
    });
    return res.data;
  },
};
