import React, { useState } from "react";
import OverviewShowtimeCards from "./OverviewShowtimeCards";
import AddShowtimeForm from "./AddShowtimeForm";
import ShowtimeTable from "./ShowtimeTable";

export default function ShowtimeManagement(): React.JSX.Element {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleFormSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="space-y-8">
      {/* Showtime Stats Overview */}
      <OverviewShowtimeCards />

      {/* Add Showtime Form (includes auto-generate) */}
      <AddShowtimeForm onSuccess={handleFormSuccess} />

      {/* Showtime Table */}
      <ShowtimeTable refreshTrigger={refreshTrigger} />
    </div>
  );
}
