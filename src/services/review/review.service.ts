// src/services/review/review.service.ts
import { reviewClient } from "../apiClient";
import type {
  ReviewRequest,
  ReviewResponse,
  RatingRequest,
  RatingResponse,
  AverageRatingResponse,
} from "@/types/review/review.type";

export const reviewService = {
  // CREATE REVIEW (for comments only)
  createReview: async (data: ReviewRequest): Promise<ReviewResponse> => {
    const res = await reviewClient.post<ReviewResponse>("", data);
    return res.data;
  },

  // UPSERT RATING (new method for rating)
  upsertRating: async (
    movieId: string,
    data: RatingRequest
  ): Promise<RatingResponse> => {
    const res = await reviewClient.post<RatingResponse>(
      `/movie/${movieId}/rate`,
      data
    );
    return res.data;
  },

  // GET MY RATING
  getMyRating: async (movieId: string): Promise<RatingResponse | null> => {
    try {
      const res = await reviewClient.get<RatingResponse>(
        `/movie/${movieId}/my-rating`
      );
      return res.data;
    } catch (error: any) {
      if (error.response?.status === 204) {
        return null; // No rating found
      }
      throw error;
    }
  },

  // UPDATE
  updateReview: async (
    id: string,
    data: ReviewRequest
  ): Promise<ReviewResponse> => {
    const res = await reviewClient.put<ReviewResponse>(`/${id}`, data);
    return res.data;
  },

  // DELETE
  deleteReview: async (id: string): Promise<void> => {
    await reviewClient.delete(`/${id}`);
  },

  // GET ALL REVIEWS OF MOVIE (public - only VISIBLE)
  getReviewsByMovie: async (movieId: string): Promise<ReviewResponse[]> => {
    const res = await reviewClient.get<ReviewResponse[]>(`/movie/${movieId}`);
    return res.data;
  },

  // GET ALL REVIEWS OF MOVIE (admin - includes HIDDEN)
  getAllReviewsByMovieAdmin: async (
    movieId: string
  ): Promise<ReviewResponse[]> => {
    const res = await reviewClient.get<ReviewResponse[]>(
      `/admin/movie/${movieId}`
    );
    return res.data;
  },

  // AVG RATING
  getAverageRating: async (movieId: string): Promise<AverageRatingResponse> => {
    const res = await reviewClient.get<AverageRatingResponse>(
      `/movie/${movieId}/average-rating`
    );
    return res.data;
  },

  // REPORT REVIEW
  reportReview: async (id: string): Promise<ReviewResponse> => {
    const res = await reviewClient.post<ReviewResponse>(`/${id}/report`);
    return res.data;
  },

  // HIDE REVIEW
  hideReview: async (id: string): Promise<ReviewResponse> => {
    const res = await reviewClient.post<ReviewResponse>(`/${id}/hide`);
    return res.data;
  },

  // DISMISS REPORT (admin/manager bỏ qua báo cáo)
  dismissReport: async (id: string): Promise<ReviewResponse> => {
    const res = await reviewClient.post<ReviewResponse>(
      `/${id}/dismiss-report`
    );
    return res.data;
  },

  // UNHIDE REVIEW (admin/manager hiện lại review đã ẩn)
  unhideReview: async (id: string): Promise<ReviewResponse> => {
    const res = await reviewClient.post<ReviewResponse>(`/${id}/unhide`);
    return res.data;
  },
};
