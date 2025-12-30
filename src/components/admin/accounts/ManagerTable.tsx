"use client";
import React, { useEffect, useState } from "react";
import { Crown, Eye, Edit2, Trash2, X, Plus } from "lucide-react";
import Swal from "sweetalert2";

import { managerService, userProfileService } from "@/services/userprofile";
import { theaterService } from "@/services/showtime/theaterService";
import { userAdminService } from "@/services/auth/userService";
import type {
  ManagerProfileResponse,
  UserProfileResponse,
} from "@/types/userprofile";
import type { TheaterResponse } from "@/types/showtime/theater.type";
import { Badge } from "@/components/ui/Badge";
import { CustomDropdown } from "@/components/ui/CustomDropdown";
import DateInput from "@/components/ui/DateInput";
import { useScrollToTop } from "@/hooks/useScrollToTop";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

export default function ManagerTable(): React.JSX.Element {
  const [managerList, setManagerList] = useState<ManagerProfileResponse[]>([]);
  const [theaters, setTheaters] = useState<TheaterResponse[]>([]);
  const [selectedCinema, setSelectedCinema] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingTheaters, setLoadingTheaters] = useState<boolean>(true);

  // Modal states
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedManager, setSelectedManager] =
    useState<ManagerProfileResponse | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Add manager modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<UserProfileResponse[]>(
    []
  );
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedTheater, setSelectedTheater] = useState<string>("");
  const [hireDate, setHireDate] = useState<string>("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [creating, setCreating] = useState(false);

  // Scroll to top when component mounts
  useScrollToTop();
  useBodyScrollLock(isProfileModalOpen || isAddModalOpen);

  // Load theaters on component mount
  useEffect(() => {
    loadTheaters();
  }, []);

  // Load managers when cinema is selected
  useEffect(() => {
    if (selectedCinema) {
      loadManagersByCinema(selectedCinema);
    } else {
      setManagerList([]);
    }
  }, [selectedCinema]);

  const loadTheaters = async () => {
    try {
      const theaterList = await theaterService.getAllTheaters();
      setTheaters(theaterList);

      // Auto select first theater if available
      if (theaterList.length > 0) {
        setSelectedCinema(theaterList[0].name);
      }
    } catch (error) {
      console.error("Error loading theaters:", error);
      Swal.fire({
        icon: "error",
        title: "Không thể tải danh sách rạp",
        text: "Vui lòng thử lại sau",
      });
    } finally {
      setLoadingTheaters(false);
    }
  };

  const loadManagersByCinema = async (cinemaName: string) => {
    setLoading(true);
    try {
      const managers = await managerService.getManagersByCinemaName(cinemaName);
      setManagerList(managers);
    } catch (error) {
      console.error("Error loading managers:", error);
      Swal.fire({
        icon: "error",
        title: "Không thể tải danh sách quản lý",
        text: "Vui lòng thử lại sau",
      });
      setManagerList([]);
    } finally {
      setLoading(false);
    }
  };

  // Open profile modal
  const openProfileModal = async (manager: ManagerProfileResponse) => {
    setSelectedManager(manager);
    setIsProfileModalOpen(true);
    setProfileLoading(true);

    try {
      // userProfile is already populated in the response
      setUserProfile(manager.userProfile || null);
    } catch (error) {
      console.error("Error fetching profile:", error);
      setUserProfile(manager.userProfile || null);
    } finally {
      setProfileLoading(false);
    }
  };

  // Close profile modal
  const closeProfileModal = () => {
    setIsProfileModalOpen(false);
    setSelectedManager(null);
    setUserProfile(null);
  };

  // Open add manager modal
  const openAddModal = async () => {
    setIsAddModalOpen(true);
    setLoadingUsers(true);

    try {
      const users = await userProfileService.searchProfiles();
      // Filter out users who already have manager profiles
      const existingManagers = await managerService.getAllManagers();
      const managerUserIds = existingManagers.map((m) => m.userProfileId);

      const availableUsersFiltered = users.filter(
        (user) => !managerUserIds.includes(user.id)
      );

      setAvailableUsers(availableUsersFiltered);
    } catch (error) {
      console.error("Error loading users:", error);
      Swal.fire({
        icon: "error",
        title: "Không thể tải danh sách người dùng",
        text: "Vui lòng thử lại sau",
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  // Close add manager modal
  const closeAddModal = () => {
    setIsAddModalOpen(false);
    setSelectedUser("");
    setSelectedTheater("");
    setHireDate("");
    setAvailableUsers([]);
  };

  // Create manager
  const handleCreateManager = async () => {
    if (!selectedUser || !selectedTheater || !hireDate) {
      Swal.fire({
        icon: "warning",
        title: "Thiếu thông tin",
        text: "Vui lòng điền đầy đủ thông tin",
      });
      return;
    }

    setCreating(true);
    try {
      // Get the selected user's auth userId
      const selectedUserProfile = availableUsers.find(
        (u) => u.id === selectedUser
      );

      await managerService.createManager({
        userProfileId: selectedUser,
        managedCinemaName: selectedTheater,
        hireDate: hireDate,
      });

      // Update role to manager in auth-service
      if (selectedUserProfile?.userId) {
        await userAdminService.updateUserRole(
          selectedUserProfile.userId,
          "manager"
        );
      }

      Swal.fire({
        icon: "success",
        title: "Tạo quản lý thành công",
        timer: 1500,
        showConfirmButton: false,
      });

      closeAddModal();

      // Reload managers if the created manager is for the selected cinema
      if (selectedTheater === selectedCinema) {
        loadManagersByCinema(selectedCinema);
      }
    } catch (error) {
      console.error("Error creating manager:", error);
      Swal.fire({
        icon: "error",
        title: "Lỗi tạo quản lý",
        text: "Vui lòng thử lại sau",
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <div className="bg-white border border-gray-400 rounded-lg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-600" />
            <h3 className="text-lg font-semibold text-gray-800">
              Thông tin quản lý
            </h3>
          </div>

          <div className="flex items-center gap-3">
            {/* Add Manager Button */}
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
            >
              <Plus size={16} />
              Thêm quản lý
            </button>

            {/* Cinema selector */}
            <CustomDropdown
              options={theaters.map((theater) => ({
                value: theater.name,
                label: theater.name,
              }))}
              value={selectedCinema}
              onChange={setSelectedCinema}
              placeholder={loadingTheaters ? "Đang tải..." : "Chọn rạp"}
              disabled={loadingTheaters}
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg relative border border-gray-400">
          {loading && (
            <div className="absolute inset-0 bg-white/60 flex items-center justify-center backdrop-blur-sm pointer-events-none z-10 rounded-lg">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
            </div>
          )}

          <table
            className="min-w-full divide-y divide-yellow-400/80 table-fixed"
            style={{ tableLayout: "fixed", width: "100%" }}
          >
            <thead className="sticky top-0 z-10 border-b border-gray-400 bg-gray-50">
              <tr>
                <th className="w-[170px] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quản lý
                </th>
                <th className="w-[150px] px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="w-[110px] px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Số điện thoại
                </th>
                <th className="w-[180px] px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rạp quản lý
                </th>
                <th className="w-[100px] px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ngày nhận chức
                </th>
                <th className="w-[150px] px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-400 relative bg-white">
              {!selectedCinema ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-10 text-gray-500 italic text-sm"
                  >
                    Vui lòng chọn rạp để xem danh sách quản lý
                  </td>
                </tr>
              ) : managerList.length === 0 && !loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-10 text-gray-500 italic text-sm"
                  >
                    Không có quản lý nào tại rạp này
                  </td>
                </tr>
              ) : (
                managerList.map((manager) => (
                  <tr
                    key={manager.id}
                    className={`transition duration-150 ${
                      loading ? "opacity-60 pointer-events-none" : ""
                    } hover:bg-gray-50`}
                  >
                    <td className="px-6 py-4 text-sm text-gray-900 text-left">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900 truncate">
                          {manager.userProfile?.fullName || "Chưa cập nhật"}
                        </span>
                        <span className="text-xs text-gray-500 truncate">
                          {manager.userProfile?.username || "N/A"}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-center text-sm text-gray-900 truncate">
                      {manager.userProfile?.email || "N/A"}
                    </td>

                    <td className="px-6 py-4 text-center text-sm text-gray-900">
                      {manager.userProfile?.phoneNumber || "-"}
                    </td>

                    <td className="px-6 py-4 text-center text-sm">
                      <Badge
                        type="AccountRole"
                        value={manager.managedCinemaName}
                        raw="manager"
                      />
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-900 text-center">
                      {new Date(manager.hireDate).toLocaleDateString("vi-VN")}
                    </td>

                    <td className="px-6 py-3 text-center text-base font-medium">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openProfileModal(manager)}
                          className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Xem thông tin"
                        >
                          <Eye size={20} />
                        </button>

                        <button
                          onClick={() => {
                            Swal.fire({
                              icon: "info",
                              title: "Chỉnh sửa thông tin",
                              text: "Tính năng đang phát triển",
                            });
                          }}
                          className="p-2 rounded-lg text-yellow-600 hover:bg-yellow-50 transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Edit2 size={20} />
                        </button>

                        <button
                          onClick={async () => {
                            const confirm = await Swal.fire({
                              title: "Xóa quản lý?",
                              text: "Hành động này không thể hoàn tác",
                              icon: "warning",
                              showCancelButton: true,
                              confirmButtonText: "Xóa",
                              cancelButtonText: "Hủy",
                            });
                            if (confirm.isConfirmed) {
                              try {
                                // Get userId from userProfile before deleting
                                const authUserId = manager.userProfile?.userId;

                                await managerService.deleteManager(manager.id);

                                // Revert role to customer in auth-service
                                if (authUserId) {
                                  await userAdminService.updateUserRole(
                                    authUserId,
                                    "customer"
                                  );
                                }

                                Swal.fire({
                                  icon: "success",
                                  title: "Đã xóa quản lý",
                                  timer: 1500,
                                  showConfirmButton: false,
                                });
                                loadManagersByCinema(selectedCinema);
                              } catch (error) {
                                Swal.fire({
                                  icon: "error",
                                  title: "Lỗi xóa quản lý",
                                  text: "Vui lòng thử lại sau",
                                });
                              }
                            }
                          }}
                          className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                          title="Xóa quản lý"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        {selectedCinema && (
          <div className="flex justify-between items-center pt-4">
            <span className="text-sm text-gray-700">
              Tổng số quản lý: {managerList.length}
            </span>
          </div>
        )}
      </div>

      {/* Profile Modal */}
      {isProfileModalOpen && selectedManager && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeProfileModal}
          />

          <div className="relative w-full max-w-3xl bg-white border border-gray-400 rounded-lg p-6 shadow-xl z-10 max-h-[90vh] overflow-y-auto">
            {profileLoading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-yellow-600"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Header */}
                <div className="relative flex items-start gap-6 p-6 bg-yellow-50 rounded-lg border border-yellow-200">
                  <button
                    onClick={closeProfileModal}
                    className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={20} />
                  </button>

                  <div className="flex-shrink-0">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-yellow-400 via-yellow-500 to-yellow-600 p-1">
                      <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden border-2 border-white">
                        {userProfile?.avatarUrl ? (
                          <img
                            src={userProfile.avatarUrl}
                            alt="Avatar"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                            <span className="text-gray-500 text-lg font-semibold">
                              {userProfile?.fullName?.charAt(0) ||
                                selectedManager.userProfile?.fullName?.charAt(
                                  0
                                ) ||
                                "?"}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 pr-8">
                    <h4 className="text-lg font-semibold text-gray-900 mb-1">
                      {userProfile?.fullName ||
                        selectedManager.userProfile?.fullName ||
                        "Chưa cập nhật"}
                    </h4>
                    <p className="text-sm text-gray-600 mb-2">
                      {selectedManager.userProfile?.email || "N/A"}
                    </p>
                    <div className="flex items-center gap-4">
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
                        Quản lý
                      </span>
                    </div>
                  </div>
                </div>

                {/* Thông tin cá nhân */}
                <div>
                  <h5 className="text-lg font-semibold text-gray-800 mb-3">
                    Thông tin cá nhân
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Họ và tên
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {userProfile?.fullName ||
                          selectedManager.userProfile?.fullName ||
                          "Chưa cập nhật"}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Số điện thoại
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {userProfile?.phoneNumber ||
                          selectedManager.userProfile?.phoneNumber ||
                          "Chưa cập nhật"}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Ngày sinh
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {userProfile?.dateOfBirth
                          ? new Date(
                              userProfile.dateOfBirth
                            ).toLocaleDateString("vi-VN")
                          : "Chưa cập nhật"}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Giới tính
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {userProfile?.gender === "MALE"
                          ? "Nam"
                          : userProfile?.gender === "FEMALE"
                            ? "Nữ"
                            : userProfile?.gender === "OTHER"
                              ? "Khác"
                              : "Chưa cập nhật"}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        CMND/CCCD
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {userProfile?.nationalId || "Chưa cập nhật"}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Địa chỉ
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {userProfile?.address || "Chưa cập nhật"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Thông tin công việc */}
                <div>
                  <h5 className="text-lg font-semibold text-gray-800 mb-3">
                    Thông tin công việc
                  </h5>
                  <div className="p-6 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Rạp quản lý
                        </label>
                        <p className="mt-1 text-sm text-gray-900">
                          {selectedManager.managedCinemaName}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Ngày nhận chức
                        </label>
                        <p className="mt-1 text-sm text-gray-900">
                          {new Date(
                            selectedManager.hireDate
                          ).toLocaleDateString("vi-VN")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={closeProfileModal}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Manager Modal */}
      {isAddModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[99999] flex items-center justify-center px-4 py-6"
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeAddModal}
          />

          <div className="relative w-full max-w-md bg-white border border-gray-400 rounded-lg p-6 shadow-xl z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Thêm quản lý mới
              </h3>
              <button
                onClick={closeAddModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* User Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chọn người dùng
                </label>
                {loadingUsers ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-yellow-600"></div>
                  </div>
                ) : (
                  <CustomDropdown
                    options={availableUsers.map((user) => ({
                      value: user.id,
                      label: `${user.fullName || user.username} (${user.email})`,
                    }))}
                    value={selectedUser}
                    onChange={setSelectedUser}
                    placeholder="Chọn người dùng"
                  />
                )}
              </div>

              {/* Theater Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rạp quản lý
                </label>
                <CustomDropdown
                  options={theaters.map((theater) => ({
                    value: theater.name,
                    label: theater.name,
                  }))}
                  value={selectedTheater}
                  onChange={setSelectedTheater}
                  placeholder="Chọn rạp"
                />
              </div>

              {/* Hire Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ngày nhận chức
                </label>
                <DateInput
                  value={hireDate}
                  onChange={setHireDate}
                  placeholder="Chọn ngày"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={closeAddModal}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                disabled={creating}
              >
                Hủy
              </button>
              <button
                onClick={handleCreateManager}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
                disabled={
                  creating || !selectedUser || !selectedTheater || !hireDate
                }
              >
                {creating ? "Đang tạo..." : "Tạo quản lý"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
