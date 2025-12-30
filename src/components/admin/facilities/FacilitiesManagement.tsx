"use client";
import React, { useEffect, useState } from "react";
import {
  Search,
  Trash2,
  Edit2,
  Plus,
  MapPin,
  Building2,
  DoorOpen,
  Armchair,
  X,
} from "lucide-react";
import Swal from "sweetalert2";

import { provinceService } from "@/services/showtime/provinceService";
import { theaterService } from "@/services/showtime/theaterService";
import { roomService } from "@/services/showtime/roomService";
import type {
  ProvinceResponse,
  ProvinceRequest,
} from "@/types/showtime/province.type";
import type {
  TheaterResponse,
  TheaterRequest,
} from "@/types/showtime/theater.type";
import type { RoomResponse, RoomRequest } from "@/types/showtime/room.type";
import type { SeatResponse, SeatRequest } from "@/types/showtime/seat.type";
import { useDebounce } from "@/hooks/useDebounce";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { CustomDropdown } from "@/components/ui/CustomDropdown";
import { seatService } from "@/services/showtime/seatService";

type TabType = "province" | "theater" | "room" | "seat";

const TAB_LABELS: Record<TabType, string> = {
  province: "Tỉnh/Thành",
  theater: "Rạp chiếu",
  room: "Phòng chiếu",
  seat: "Ghế ngồi",
};

export default function FacilitiesManagement(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TabType>("province");

  // ================= Provinces =================
  const [provinces, setProvinces] = useState<ProvinceResponse[]>([]);
  const [provinceLoading, setProvinceLoading] = useState(false);
  const [provinceSearch, setProvinceSearch] = useState("");
  const debouncedProvinceSearch = useDebounce(provinceSearch, 300);
  const [provinceModalOpen, setProvinceModalOpen] = useState(false);
  const [provinceModalData, setProvinceModalData] =
    useState<ProvinceRequest | null>(null);
  const [editingProvinceId, setEditingProvinceId] = useState<string | null>(
    null
  );
  const [savingProvince, setSavingProvince] = useState(false);
  const [deletingProvinceId, setDeletingProvinceId] = useState<string | null>(
    null
  );

  // ================= Theaters =================
  const [theaters, setTheaters] = useState<TheaterResponse[]>([]);
  const [theaterLoading, setTheaterLoading] = useState(false);
  const [theaterSearch, setTheaterSearch] = useState("");
  const debouncedTheaterSearch = useDebounce(theaterSearch, 300);
  const [theaterModalOpen, setTheaterModalOpen] = useState(false);
  const [theaterModalData, setTheaterModalData] =
    useState<TheaterRequest | null>(null);
  const [editingTheaterId, setEditingTheaterId] = useState<string | null>(null);
  const [selectedProvinceForTheater, setSelectedProvinceForTheater] =
    useState<string>("");
  const [savingTheater, setSavingTheater] = useState(false);
  const [deletingTheaterId, setDeletingTheaterId] = useState<string | null>(
    null
  );

  // ================= Rooms =================
  const [rooms, setRooms] = useState<RoomResponse[]>([]);
  const [roomLoading, setRoomLoading] = useState(false);
  const [roomSearch, setRoomSearch] = useState("");
  const debouncedRoomSearch = useDebounce(roomSearch, 300);
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [roomModalData, setRoomModalData] = useState<RoomRequest | null>(null);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [selectedProvinceForRoom, setSelectedProvinceForRoom] =
    useState<string>("");
  const [selectedTheaterForRoom, setSelectedTheaterForRoom] =
    useState<string>("");
  const [theatersForRoom, setTheatersForRoom] = useState<TheaterResponse[]>([]);
  const [savingRoom, setSavingRoom] = useState(false);
  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null);

  // ================= Seats =================
  const [seats, setSeats] = useState<SeatResponse[]>([]);
  const [seatLoading, setSeatLoading] = useState(false);
  const [seatSearch, setSeatSearch] = useState("");
  const debouncedSeatSearch = useDebounce(seatSearch, 300);
  const [seatModalOpen, setSeatModalOpen] = useState(false);
  const [seatModalData, setSeatModalData] = useState<SeatRequest[]>([]);
  const [editingSeatId, setEditingSeatId] = useState<string | null>(null);
  const [selectedProvinceForSeat, setSelectedProvinceForSeat] =
    useState<string>("");
  const [selectedTheaterForSeat, setSelectedTheaterForSeat] =
    useState<string>("");
  const [selectedRoomForSeat, setSelectedRoomForSeat] = useState<string>("");
  const [theatersForSeat, setTheatersForSeat] = useState<TheaterResponse[]>([]);
  const [roomsForSeat, setRoomsForSeat] = useState<RoomResponse[]>([]);
  const [savingSeat, setSavingSeat] = useState(false);
  const [deletingSeatId, setDeletingSeatId] = useState<string | null>(null);

  useBodyScrollLock(
    provinceModalOpen || theaterModalOpen || roomModalOpen || seatModalOpen
  );

  // ================= Fetch Functions =================
  const fetchProvinces = async () => {
    try {
      setProvinceLoading(true);
      const data = await provinceService.getAllProvinces();
      setProvinces(data);
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: "error", title: "Không thể tải danh sách tỉnh" });
    } finally {
      setProvinceLoading(false);
    }
  };

  const fetchTheaters = async () => {
    try {
      setTheaterLoading(true);
      let data: TheaterResponse[];
      if (selectedProvinceForTheater) {
        data = await theaterService.getTheatersByProvince(
          selectedProvinceForTheater
        );
      } else {
        data = await theaterService.getAllTheaters();
      }
      setTheaters(data);
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: "error", title: "Không thể tải danh sách rạp" });
    } finally {
      setTheaterLoading(false);
    }
  };

  const fetchRooms = async () => {
    if (!selectedTheaterForRoom) {
      setRooms([]);
      return;
    }
    try {
      setRoomLoading(true);
      const data = await roomService.getRoomsByTheaterId(
        selectedTheaterForRoom
      );
      setRooms(data);
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: "error", title: "Không thể tải danh sách phòng" });
    } finally {
      setRoomLoading(false);
    }
  };

  const fetchSeats = async () => {
    if (!selectedRoomForSeat) {
      setSeats([]);
      return;
    }
    try {
      setSeatLoading(true);
      const data = await seatService.getSeatsByRoomId(selectedRoomForSeat);
      setSeats(data);
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: "error", title: "Không thể tải danh sách ghế" });
    } finally {
      setSeatLoading(false);
    }
  };

  useEffect(() => {
    fetchProvinces();
  }, []);

  useEffect(() => {
    if (activeTab === "theater") fetchTheaters();
  }, [activeTab, selectedProvinceForTheater]);

  useEffect(() => {
    if (activeTab === "room" && selectedProvinceForRoom) {
      theaterService
        .getTheatersByProvince(selectedProvinceForRoom)
        .then(setTheatersForRoom);
    }
  }, [selectedProvinceForRoom]);

  useEffect(() => {
    if (activeTab === "room") fetchRooms();
  }, [activeTab, selectedTheaterForRoom]);

  useEffect(() => {
    if (activeTab === "seat" && selectedProvinceForSeat) {
      theaterService
        .getTheatersByProvince(selectedProvinceForSeat)
        .then(setTheatersForSeat);
    }
  }, [selectedProvinceForSeat]);

  useEffect(() => {
    if (activeTab === "seat" && selectedTheaterForSeat) {
      roomService
        .getRoomsByTheaterId(selectedTheaterForSeat)
        .then(setRoomsForSeat);
    }
  }, [selectedTheaterForSeat]);

  useEffect(() => {
    if (activeTab === "seat") fetchSeats();
  }, [activeTab, selectedRoomForSeat]);

  // ================= Province CRUD =================
  const openProvinceModal = (province?: ProvinceResponse) => {
    if (province) {
      setProvinceModalData({
        name: province.name,
        nameEn: province.nameEn || "",
      });
      setEditingProvinceId(province.id);
    } else {
      setProvinceModalData({
        name: "",
        nameEn: "",
      });
      setEditingProvinceId(null);
    }
    setProvinceModalOpen(true);
  };

  const saveProvince = async () => {
    if (!provinceModalData?.name.trim() || !provinceModalData?.nameEn.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Vui lòng nhập đầy đủ tên tiếng Việt và tiếng Anh",
      });
      return;
    }
    try {
      setSavingProvince(true);
      if (editingProvinceId) {
        await provinceService.updateProvince(
          editingProvinceId,
          provinceModalData
        );
        Swal.fire({
          icon: "success",
          title: "Đã cập nhật",
          timer: 1000,
          showConfirmButton: false,
        });
      } else {
        await provinceService.createProvince(provinceModalData);
        Swal.fire({
          icon: "success",
          title: "Đã thêm",
          timer: 1000,
          showConfirmButton: false,
        });
      }
      setProvinceModalOpen(false);
      fetchProvinces();
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: "error", title: "Lưu thất bại" });
    } finally {
      setSavingProvince(false);
    }
  };

  const deleteProvince = async (id: string) => {
    const confirm = await Swal.fire({
      title: "Xóa tỉnh?",
      text: "Tất cả rạp và phòng thuộc tỉnh này cũng sẽ bị xóa",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Xóa",
      cancelButtonText: "Hủy",
      confirmButtonColor: "#ef4444",
    });
    if (!confirm.isConfirmed) return;
    try {
      setDeletingProvinceId(id);
      await provinceService.deleteProvince(id);
      Swal.fire({
        icon: "success",
        title: "Đã xóa",
        timer: 1000,
        showConfirmButton: false,
      });
      fetchProvinces();
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: "error", title: "Xóa thất bại" });
    } finally {
      setDeletingProvinceId(null);
    }
  };

  // ================= Theater CRUD =================
  const openTheaterModal = (theater?: TheaterResponse) => {
    if (theater) {
      setTheaterModalData({
        name: theater.name,
        nameEn: theater.nameEn || "",
        address: theater.address,
        addressEn: theater.addressEn || "",
        provinceId: selectedProvinceForTheater || "",
        description: theater.description || "",
        descriptionEn: theater.descriptionEn || "",
        imageUrl: theater.imageUrl || "",
      });
      setEditingTheaterId(theater.id);
    } else {
      setTheaterModalData({
        name: "",
        nameEn: "",
        address: "",
        addressEn: "",
        provinceId: selectedProvinceForTheater || "",
        description: "",
        descriptionEn: "",
        imageUrl: "",
      });
      setEditingTheaterId(null);
    }
    setTheaterModalOpen(true);
  };

  const saveTheater = async () => {
    if (
      !theaterModalData?.name.trim() ||
      !theaterModalData?.nameEn.trim() ||
      !theaterModalData?.address.trim() ||
      !theaterModalData?.addressEn.trim() ||
      !theaterModalData?.description.trim() ||
      !theaterModalData?.descriptionEn.trim() ||
      !theaterModalData?.imageUrl.trim()
    ) {
      Swal.fire({
        icon: "warning",
        title: "Vui lòng nhập đầy đủ thông tin tiếng Việt và tiếng Anh",
      });
      return;
    }
    if (!theaterModalData.provinceId) {
      Swal.fire({ icon: "warning", title: "Vui lòng chọn tỉnh" });
      return;
    }
    try {
      setSavingTheater(true);
      if (editingTheaterId) {
        await theaterService.updateTheater(editingTheaterId, theaterModalData);
        Swal.fire({
          icon: "success",
          title: "Đã cập nhật",
          timer: 1000,
          showConfirmButton: false,
        });
      } else {
        await theaterService.createTheater(theaterModalData);
        Swal.fire({
          icon: "success",
          title: "Đã thêm",
          timer: 1000,
          showConfirmButton: false,
        });
      }
      setTheaterModalOpen(false);
      fetchTheaters();
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: "error", title: "Lưu thất bại" });
    } finally {
      setSavingTheater(false);
    }
  };

  const deleteTheater = async (id: string) => {
    const confirm = await Swal.fire({
      title: "Xóa rạp?",
      text: "Tất cả phòng thuộc rạp này cũng sẽ bị xóa",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Xóa",
      cancelButtonText: "Hủy",
      confirmButtonColor: "#ef4444",
    });
    if (!confirm.isConfirmed) return;
    try {
      setDeletingTheaterId(id);
      await theaterService.deleteTheater(id);
      Swal.fire({
        icon: "success",
        title: "Đã xóa",
        timer: 1000,
        showConfirmButton: false,
      });
      fetchTheaters();
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: "error", title: "Xóa thất bại" });
    } finally {
      setDeletingTheaterId(null);
    }
  };

  // ================= Room CRUD =================
  const openRoomModal = (room?: RoomResponse) => {
    if (!selectedTheaterForRoom) {
      Swal.fire({ icon: "warning", title: "Vui lòng chọn rạp trước" });
      return;
    }
    if (room) {
      setRoomModalData({
        theaterId: selectedTheaterForRoom,
        name: room.name,
        seatCount: room.seatCount,
      });
      setEditingRoomId(room.id);
    } else {
      setRoomModalData({
        theaterId: selectedTheaterForRoom,
        name: "",
        seatCount: 0,
      });
      setEditingRoomId(null);
    }
    setRoomModalOpen(true);
  };

  const saveRoom = async () => {
    if (!roomModalData?.name.trim()) {
      Swal.fire({ icon: "warning", title: "Vui lòng nhập tên phòng" });
      return;
    }
    if (!roomModalData.seatCount || roomModalData.seatCount <= 0) {
      Swal.fire({ icon: "warning", title: "Số ghế phải lớn hơn 0" });
      return;
    }
    try {
      setSavingRoom(true);
      if (editingRoomId) {
        await roomService.updateRoom(editingRoomId, roomModalData);
        Swal.fire({
          icon: "success",
          title: "Đã cập nhật",
          timer: 1000,
          showConfirmButton: false,
        });
      } else {
        await roomService.createRoom(roomModalData);
        Swal.fire({
          icon: "success",
          title: "Đã thêm",
          timer: 1000,
          showConfirmButton: false,
        });
      }
      setRoomModalOpen(false);
      fetchRooms();
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: "error", title: "Lưu thất bại" });
    } finally {
      setSavingRoom(false);
    }
  };

  const deleteRoom = async (id: string) => {
    const confirm = await Swal.fire({
      title: "Xóa phòng?",
      text: "Hành động này không thể hoàn tác",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Xóa",
      cancelButtonText: "Hủy",
      confirmButtonColor: "#ef4444",
    });
    if (!confirm.isConfirmed) return;
    try {
      setDeletingRoomId(id);
      await roomService.deleteRoom(id);
      Swal.fire({
        icon: "success",
        title: "Đã xóa",
        timer: 1000,
        showConfirmButton: false,
      });
      fetchRooms();
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: "error", title: "Xóa thất bại" });
    } finally {
      setDeletingRoomId(null);
    }
  };

  // ================= Seat CRUD =================
  const openSeatModal = (seat?: SeatResponse) => {
    if (!selectedRoomForSeat) {
      Swal.fire({ icon: "warning", title: "Vui lòng chọn phòng trước" });
      return;
    }

    if (seat) {
      // Edit mode - single seat
      setSeatModalData([
        {
          roomId: selectedRoomForSeat,
          seatNumber: seat.seatNumber,
          type: seat.type,
          rowLabel: seat.rowLabel,
          columnIndex: seat.columnIndex,
        },
      ]);
      setEditingSeatId(seat.id);
    } else {
      // Add mode - start with 1 empty row
      setSeatModalData([
        {
          roomId: selectedRoomForSeat,
          seatNumber: "",
          type: "NORMAL",
          rowLabel: "",
          columnIndex: 1,
        },
      ]);
      setEditingSeatId(null);
    }
    setSeatModalOpen(true);
  };

  const addSeatRow = () => {
    setSeatModalData((prev) => [
      ...prev,
      {
        roomId: selectedRoomForSeat,
        seatNumber: "",
        type: "NORMAL",
        rowLabel: "",
        columnIndex: 1,
      },
    ]);
  };

  const removeSeatRow = (index: number) => {
    setSeatModalData((prev) => prev.filter((_, i) => i !== index));
  };

  const updateSeatData = (
    index: number,
    field: keyof SeatRequest,
    value: any
  ) => {
    setSeatModalData((prev) =>
      prev.map((seat, i) => (i === index ? { ...seat, [field]: value } : seat))
    );
  };

  const saveSeats = async () => {
    const validSeats = seatModalData.filter(
      (seat) =>
        seat.seatNumber.trim() && seat.rowLabel.trim() && seat.columnIndex > 0
    );

    if (validSeats.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Vui lòng nhập ít nhất một ghế hợp lệ",
      });
      return;
    }

    try {
      setSavingSeat(true);

      if (editingSeatId) {
        // Edit single seat
        await seatService.updateSeat(editingSeatId, validSeats[0]);
        Swal.fire({
          icon: "success",
          title: "Đã cập nhật ghế",
          timer: 1000,
          showConfirmButton: false,
        });
      } else {
        // Create multiple seats
        await seatService.createSeats(validSeats);
        Swal.fire({
          icon: "success",
          title: `Đã thêm ${validSeats.length} ghế`,
          timer: 1000,
          showConfirmButton: false,
        });
      }

      setSeatModalOpen(false);
      fetchSeats();
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: "error", title: "Lưu thất bại" });
    } finally {
      setSavingSeat(false);
    }
  };

  const deleteSeat = async (id: string) => {
    const confirm = await Swal.fire({
      title: "Xóa ghế?",
      text: "Hành động này không thể hoàn tác",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Xóa",
      cancelButtonText: "Hủy",
      confirmButtonColor: "#ef4444",
    });
    if (!confirm.isConfirmed) return;
    try {
      setDeletingSeatId(id);
      await seatService.deleteSeat(id);
      Swal.fire({
        icon: "success",
        title: "Đã xóa",
        timer: 1000,
        showConfirmButton: false,
      });
      fetchSeats();
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: "error", title: "Xóa thất bại" });
    } finally {
      setDeletingSeatId(null);
    }
  };

  // ================= Filter Data =================
  const filteredProvinces = provinces.filter((p) =>
    p.name.toLowerCase().includes(debouncedProvinceSearch.toLowerCase())
  );

  const filteredTheaters = theaters.filter((t) =>
    t.name.toLowerCase().includes(debouncedTheaterSearch.toLowerCase())
  );

  const filteredRooms = rooms.filter((r) =>
    r.name.toLowerCase().includes(debouncedRoomSearch.toLowerCase())
  );

  const filteredSeats = seats.filter((s) =>
    s.seatNumber.toLowerCase().includes(debouncedSeatSearch.toLowerCase())
  );

  // ================= Render =================
  return (
    <div className="space-y-6">
      {/* Tab buttons */}
      <div className="flex border border-gray-400 rounded-lg p-0.5 bg-gray-50 w-fit">
        {(Object.keys(TAB_LABELS) as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2
              ${
                activeTab === tab
                  ? "bg-yellow-500 text-white shadow-sm font-semibold"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
          >
            {tab === "province" && <MapPin size={16} />}
            {tab === "theater" && <Building2 size={16} />}
            {tab === "room" && <DoorOpen size={16} />}
            {tab === "seat" && <Armchair size={16} />}
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Province Tab */}
      {activeTab === "province" && (
        <div className="bg-white border border-gray-400 rounded-lg p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div className="flex items-center w-full md:flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm tỉnh/thành..."
                className="w-full pl-10 pr-4 py-2 text-sm rounded-lg bg-white border border-gray-400 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                value={provinceSearch}
                onChange={(e) => setProvinceSearch(e.target.value)}
              />
            </div>
            <button
              onClick={() => openProvinceModal()}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-yellow-500 text-black font-medium rounded-lg hover:bg-yellow-600 transition-colors"
            >
              <Plus size={16} /> Thêm tỉnh
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-400 relative">
            {provinceLoading && (
              <div className="absolute inset-0 bg-white/60 flex items-center justify-center backdrop-blur-sm z-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
              </div>
            )}
            <table className="min-w-full divide-y divide-gray-400">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tên tỉnh/thành
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase w-32">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-400 bg-white">
                {filteredProvinces.length === 0 ? (
                  <tr>
                    <td
                      colSpan={2}
                      className="text-center py-10 text-gray-500 italic"
                    >
                      Không có dữ liệu
                    </td>
                  </tr>
                ) : (
                  filteredProvinces.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <MapPin size={16} className="text-yellow-600" />
                          {p.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openProvinceModal(p)}
                            className="p-2 rounded-lg text-blue-600 hover:bg-blue-50"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => deleteProvince(p.id)}
                            disabled={deletingProvinceId === p.id}
                            className="p-2 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            {deletingProvinceId === p.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-600 border-t-transparent"></div>
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
          <div className="pt-4 text-sm text-gray-600">
            {filteredProvinces.length} tỉnh/thành
          </div>
        </div>
      )}

      {/* Theater Tab */}
      {activeTab === "theater" && (
        <div className="bg-white border border-gray-400 rounded-lg p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div className="flex items-center gap-3 flex-1">
              <CustomDropdown
                options={[
                  { value: "", label: "Tất cả tỉnh" },
                  ...provinces.map((p) => ({ value: p.id, label: p.name })),
                ]}
                value={selectedProvinceForTheater}
                onChange={setSelectedProvinceForTheater}
                placeholder="Tất cả tỉnh"
              />
              <div className="flex items-center flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm rạp..."
                  className="w-full pl-10 pr-4 py-2 text-sm rounded-lg bg-white border border-gray-400 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  value={theaterSearch}
                  onChange={(e) => setTheaterSearch(e.target.value)}
                />
              </div>
            </div>
            <button
              onClick={() => openTheaterModal()}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-yellow-500 text-black font-medium rounded-lg hover:bg-yellow-600 transition-colors"
            >
              <Plus size={16} /> Thêm rạp
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-400 relative">
            {theaterLoading && (
              <div className="absolute inset-0 bg-white/60 flex items-center justify-center backdrop-blur-sm z-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
              </div>
            )}
            <table className="min-w-full divide-y divide-gray-400">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tên rạp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Địa chỉ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tỉnh
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase w-32">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-400 bg-white">
                {filteredTheaters.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="text-center py-10 text-gray-500 italic"
                    >
                      Không có dữ liệu
                    </td>
                  </tr>
                ) : (
                  filteredTheaters.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <Building2 size={16} className="text-blue-600" />
                          {t.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {t.address}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {t.provinceName}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openTheaterModal(t)}
                            className="p-2 rounded-lg text-blue-600 hover:bg-blue-50"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => deleteTheater(t.id)}
                            disabled={deletingTheaterId === t.id}
                            className="p-2 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            {deletingTheaterId === t.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-600 border-t-transparent"></div>
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
          <div className="pt-4 text-sm text-gray-600">
            {filteredTheaters.length} rạp
          </div>
        </div>
      )}

      {/* Room Tab */}
      {activeTab === "room" && (
        <div className="bg-white border border-gray-400 rounded-lg p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div className="flex items-center gap-3 flex-1">
              <CustomDropdown
                options={[
                  { value: "", label: "Chọn tỉnh" },
                  ...provinces.map((p) => ({ value: p.id, label: p.name })),
                ]}
                value={selectedProvinceForRoom}
                onChange={(v) => {
                  setSelectedProvinceForRoom(v);
                  setSelectedTheaterForRoom("");
                }}
                placeholder="Chọn tỉnh"
              />
              <CustomDropdown
                options={[
                  { value: "", label: "Chọn rạp" },
                  ...theatersForRoom.map((t) => ({
                    value: t.id,
                    label: t.name,
                  })),
                ]}
                value={selectedTheaterForRoom}
                onChange={setSelectedTheaterForRoom}
                placeholder="Chọn rạp"
              />
              <div className="flex items-center flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm phòng..."
                  className="w-full pl-10 pr-4 py-2 text-sm rounded-lg bg-white border border-gray-400 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  value={roomSearch}
                  onChange={(e) => setRoomSearch(e.target.value)}
                />
              </div>
            </div>
            <button
              onClick={() => openRoomModal()}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-yellow-500 text-black font-medium rounded-lg hover:bg-yellow-600 transition-colors"
            >
              <Plus size={16} /> Thêm phòng
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-400 relative">
            {roomLoading && (
              <div className="absolute inset-0 bg-white/60 flex items-center justify-center backdrop-blur-sm z-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
              </div>
            )}
            <table className="min-w-full divide-y divide-gray-400">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tên phòng
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Rạp
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Số ghế
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase w-32">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-400 bg-white">
                {!selectedTheaterForRoom ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="text-center py-10 text-gray-500 italic"
                    >
                      Vui lòng chọn rạp
                    </td>
                  </tr>
                ) : filteredRooms.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="text-center py-10 text-gray-500 italic"
                    >
                      Không có dữ liệu
                    </td>
                  </tr>
                ) : (
                  filteredRooms.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <DoorOpen size={16} className="text-purple-600" />
                          {r.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {r.theaterName}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-700">
                        {r.seatCount}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openRoomModal(r)}
                            className="p-2 rounded-lg text-blue-600 hover:bg-blue-50"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => deleteRoom(r.id)}
                            disabled={deletingRoomId === r.id}
                            className="p-2 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            {deletingRoomId === r.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-600 border-t-transparent"></div>
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
          <div className="pt-4 text-sm text-gray-600">
            {filteredRooms.length} phòng
          </div>
        </div>
      )}

      {/* Seat Tab */}
      {activeTab === "seat" && (
        <div className="bg-white border border-gray-400 rounded-lg p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div className="flex items-center gap-3 flex-1">
              <CustomDropdown
                options={[
                  { value: "", label: "Chọn tỉnh" },
                  ...provinces.map((p) => ({ value: p.id, label: p.name })),
                ]}
                value={selectedProvinceForSeat}
                onChange={(v) => {
                  setSelectedProvinceForSeat(v);
                  setSelectedTheaterForSeat("");
                  setSelectedRoomForSeat("");
                }}
                placeholder="Chọn tỉnh"
              />
              <CustomDropdown
                options={[
                  { value: "", label: "Chọn rạp" },
                  ...theatersForSeat.map((t) => ({
                    value: t.id,
                    label: t.name,
                  })),
                ]}
                value={selectedTheaterForSeat}
                onChange={(v) => {
                  setSelectedTheaterForSeat(v);
                  setSelectedRoomForSeat("");
                }}
                placeholder="Chọn rạp"
              />
              <CustomDropdown
                options={[
                  { value: "", label: "Chọn phòng" },
                  ...roomsForSeat.map((r) => ({
                    value: r.id,
                    label: r.name,
                  })),
                ]}
                value={selectedRoomForSeat}
                onChange={setSelectedRoomForSeat}
                placeholder="Chọn phòng"
              />
              <div className="flex items-center flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm ghế..."
                  className="w-full pl-10 pr-4 py-2 text-sm rounded-lg bg-white border border-gray-400 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  value={seatSearch}
                  onChange={(e) => setSeatSearch(e.target.value)}
                />
              </div>
            </div>
            <button
              onClick={() => openSeatModal()}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-yellow-500 text-black font-medium rounded-lg hover:bg-yellow-600 transition-colors"
            >
              <Plus size={16} /> Thêm ghế
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-400 relative">
            {seatLoading && (
              <div className="absolute inset-0 bg-white/60 flex items-center justify-center backdrop-blur-sm z-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
              </div>
            )}
            <table className="min-w-full divide-y divide-gray-400">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Số ghế
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Hàng
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Cột
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Loại ghế
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase w-32">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-400 bg-white">
                {!selectedRoomForSeat ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center py-10 text-gray-500 italic"
                    >
                      Vui lòng chọn phòng
                    </td>
                  </tr>
                ) : filteredSeats.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center py-10 text-gray-500 italic"
                    >
                      Không có dữ liệu
                    </td>
                  </tr>
                ) : (
                  filteredSeats.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <Armchair size={16} className="text-orange-600" />
                          {s.seatNumber}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {s.rowLabel}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-700">
                        {s.columnIndex}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            s.type === "VIP"
                              ? "bg-purple-100 text-purple-800"
                              : s.type === "COUPLE"
                                ? "bg-pink-100 text-pink-800"
                                : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {s.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openSeatModal(s)}
                            className="p-2 rounded-lg text-blue-600 hover:bg-blue-50"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => deleteSeat(s.id)}
                            disabled={deletingSeatId === s.id}
                            className="p-2 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            {deletingSeatId === s.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-600 border-t-transparent"></div>
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
          <div className="pt-4 text-sm text-gray-600">
            {filteredSeats.length} ghế
          </div>
        </div>
      )}

      {/* Province Modal */}
      {provinceModalOpen && provinceModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setProvinceModalOpen(false)}
          />
          <div className="relative w-full max-w-md bg-white border border-gray-400 rounded-2xl shadow-2xl z-10 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-xl font-bold text-gray-800">
                {editingProvinceId ? "Sửa tỉnh" : "Thêm tỉnh"}
              </h3>
              <button
                onClick={() => setProvinceModalOpen(false)}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-200"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên tỉnh/thành (Tiếng Việt)
                </label>
                <input
                  type="text"
                  value={provinceModalData.name}
                  onChange={(e) =>
                    setProvinceModalData({
                      ...provinceModalData,
                      name: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-white border border-gray-400 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  placeholder="Nhập tên tỉnh/thành"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên tỉnh/thành (Tiếng Anh)
                </label>
                <input
                  type="text"
                  value={provinceModalData.nameEn}
                  onChange={(e) =>
                    setProvinceModalData({
                      ...provinceModalData,
                      nameEn: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-white border border-gray-400 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  placeholder="Enter province/city name"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setProvinceModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-700 border border-gray-400 rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  onClick={saveProvince}
                  disabled={savingProvince}
                  className="px-4 py-2 text-sm bg-yellow-500 text-black font-medium rounded-lg hover:bg-yellow-600 disabled:opacity-50 flex items-center gap-2"
                >
                  {savingProvince && (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent"></div>
                  )}
                  Lưu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Theater Modal */}
      {theaterModalOpen && theaterModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setTheaterModalOpen(false)}
          />
          <div className="relative w-full max-w-2xl bg-white border border-gray-400 rounded-2xl shadow-2xl z-10 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-xl font-bold text-gray-800">
                {editingTheaterId ? "Sửa rạp" : "Thêm rạp"}
              </h3>
              <button
                onClick={() => setTheaterModalOpen(false)}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-200"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tỉnh/Thành
                </label>
                <select
                  value={theaterModalData.provinceId}
                  onChange={(e) =>
                    setTheaterModalData({
                      ...theaterModalData,
                      provinceId: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-white border border-gray-400 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                >
                  <option value="">Chọn tỉnh</option>
                  {provinces.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên rạp (Tiếng Việt)
                </label>
                <input
                  type="text"
                  value={theaterModalData.name}
                  onChange={(e) =>
                    setTheaterModalData({
                      ...theaterModalData,
                      name: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-white border border-gray-400 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  placeholder="Nhập tên rạp"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên rạp (Tiếng Anh)
                </label>
                <input
                  type="text"
                  value={theaterModalData.nameEn}
                  onChange={(e) =>
                    setTheaterModalData({
                      ...theaterModalData,
                      nameEn: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-white border border-gray-400 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  placeholder="Enter theater name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Địa chỉ (Tiếng Việt)
                </label>
                <input
                  type="text"
                  value={theaterModalData.address}
                  onChange={(e) =>
                    setTheaterModalData({
                      ...theaterModalData,
                      address: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-white border border-gray-400 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  placeholder="Nhập địa chỉ"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Địa chỉ (Tiếng Anh)
                </label>
                <input
                  type="text"
                  value={theaterModalData.addressEn}
                  onChange={(e) =>
                    setTheaterModalData({
                      ...theaterModalData,
                      addressEn: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-white border border-gray-400 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  placeholder="Enter address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mô tả (Tiếng Việt)
                </label>
                <textarea
                  value={theaterModalData.description}
                  onChange={(e) =>
                    setTheaterModalData({
                      ...theaterModalData,
                      description: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-white border border-gray-400 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  placeholder="Nhập mô tả"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mô tả (Tiếng Anh)
                </label>
                <textarea
                  value={theaterModalData.descriptionEn}
                  onChange={(e) =>
                    setTheaterModalData({
                      ...theaterModalData,
                      descriptionEn: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-white border border-gray-400 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  placeholder="Enter description"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL hình ảnh
                </label>
                <input
                  type="url"
                  value={theaterModalData.imageUrl}
                  onChange={(e) =>
                    setTheaterModalData({
                      ...theaterModalData,
                      imageUrl: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-white border border-gray-400 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setTheaterModalOpen(false)}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-400 rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={saveTheater}
                disabled={savingTheater}
                className="px-4 py-2 text-sm bg-yellow-500 text-black font-medium rounded-lg hover:bg-yellow-600 disabled:opacity-50 flex items-center gap-2"
              >
                {savingTheater && (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent"></div>
                )}
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Room Modal */}
      {roomModalOpen && roomModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setRoomModalOpen(false)}
          />
          <div className="relative w-full max-w-md bg-white border border-gray-400 rounded-2xl shadow-2xl z-10 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-xl font-bold text-gray-800">
                {editingRoomId ? "Sửa phòng" : "Thêm phòng"}
              </h3>
              <button
                onClick={() => setRoomModalOpen(false)}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-200"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên phòng
                </label>
                <input
                  type="text"
                  value={roomModalData.name}
                  onChange={(e) =>
                    setRoomModalData({ ...roomModalData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white border border-gray-400 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  placeholder="Nhập tên phòng"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Số ghế
                </label>
                <input
                  type="number"
                  value={roomModalData.seatCount}
                  onChange={(e) =>
                    setRoomModalData({
                      ...roomModalData,
                      seatCount: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 bg-white border border-gray-400 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  placeholder="Nhập số ghế"
                  min={1}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setRoomModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-700 border border-gray-400 rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  onClick={saveRoom}
                  disabled={savingRoom}
                  className="px-4 py-2 text-sm bg-yellow-500 text-black font-medium rounded-lg hover:bg-yellow-600 disabled:opacity-50 flex items-center gap-2"
                >
                  {savingRoom && (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent"></div>
                  )}
                  Lưu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Seat Modal */}
      {seatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSeatModalOpen(false)}
          />
          <div className="relative w-full max-w-4xl bg-white border border-gray-400 rounded-2xl shadow-2xl z-10 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50 shrink-0">
              <h3 className="text-xl font-bold text-gray-800">
                {editingSeatId ? "Chỉnh sửa ghế" : "Thêm ghế cho phòng"}
              </h3>
              <button
                onClick={() => setSeatModalOpen(false)}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-200"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 min-h-0">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-600">
                    {editingSeatId
                      ? "Chỉnh sửa ghế trong phòng"
                      : "Thêm ghế cho phòng"}
                    :{" "}
                    <span className="font-semibold">
                      {
                        roomsForSeat.find((r) => r.id === selectedRoomForSeat)
                          ?.name
                      }
                    </span>
                  </p>
                  {!editingSeatId && (
                    <button
                      type="button"
                      onClick={addSeatRow}
                      className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                      <Plus size={16} /> Thêm dòng
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="col-span-3">Số ghế</div>
                  <div className="col-span-2">Hàng</div>
                  <div className="col-span-2">Cột</div>
                  <div className="col-span-3">Loại ghế</div>
                  <div className="col-span-1">Xóa</div>
                </div>

                {seatModalData.map((seat, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-12 gap-2 items-center"
                  >
                    <div className="col-span-3">
                      <input
                        type="text"
                        value={seat.seatNumber}
                        onChange={(e) =>
                          updateSeatData(index, "seatNumber", e.target.value)
                        }
                        className="w-full px-3 py-2 text-sm bg-white border border-gray-400 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                        placeholder="A1"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="text"
                        value={seat.rowLabel}
                        onChange={(e) =>
                          updateSeatData(index, "rowLabel", e.target.value)
                        }
                        className="w-full px-3 py-2 text-sm bg-white border border-gray-400 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                        placeholder="A"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        value={seat.columnIndex}
                        onChange={(e) =>
                          updateSeatData(
                            index,
                            "columnIndex",
                            parseInt(e.target.value) || 1
                          )
                        }
                        className="w-full px-3 py-2 text-sm bg-white border border-gray-400 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                        min={1}
                      />
                    </div>
                    <div className="col-span-3">
                      <select
                        value={seat.type}
                        onChange={(e) =>
                          updateSeatData(index, "type", e.target.value)
                        }
                        className="w-full px-3 py-2 text-sm bg-white border border-gray-400 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                      >
                        <option value="NORMAL">Normal</option>
                        <option value="VIP">VIP</option>
                        <option value="COUPLE">Couple</option>
                      </select>
                    </div>
                    <div className="col-span-1">
                      {!editingSeatId && (
                        <button
                          type="button"
                          onClick={() => removeSeatRow(index)}
                          className="w-8 h-8 rounded-full bg-red-500 text-white hover:bg-red-600 flex items-center justify-center"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 shrink-0">
              <button
                onClick={() => setSeatModalOpen(false)}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-400 rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={saveSeats}
                disabled={savingSeat}
                className="px-4 py-2 text-sm bg-yellow-500 text-black font-medium rounded-lg hover:bg-yellow-600 disabled:opacity-50 flex items-center gap-2"
              >
                {savingSeat && (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent"></div>
                )}
                {editingSeatId ? "Cập nhật" : "Lưu ghế"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
