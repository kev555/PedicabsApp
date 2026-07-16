import { useState } from "react";


function TimeSlot({ setPickupDateTime }) {

  const dates = [];

  const today = new Date();

  for (let i = 0; i < 14; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    dates.push({
      value: date.toISOString().split("T")[0],
      label: date.toLocaleDateString("en-AU", {
        weekday: "short",
        day: "numeric",
        month: "short"
      })
    });
  }


  const times = [];

  for (let hour = 0; hour < 24; hour++) {

    for (let minute of [0, 15, 30, 45]) {

      times.push(
        `${String(hour).padStart(2,"0")}:${String(minute).padStart(2,"0")}`
      );

    }

  }


  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);


  function confirmSelection() {

    if (!selectedDate || !selectedTime) return;

    const dateTime = new Date(
      `${selectedDate}T${selectedTime}`
    );

    setPickupDateTime(dateTime);

  }


  return (
    <div>

      <h3>Select date</h3>

      <div className="date-grid">

        {dates.map(date => (

          <button
            key={date.value}
            onClick={() => setSelectedDate(date.value)}
          >
            {date.label}
          </button>

        ))}

      </div>


      <h3>Select time</h3>

      <div className="time-grid">

        {times.map(time => (

          <button
            key={time}
            onClick={() => setSelectedTime(time)}
          >
            {time}
          </button>

        ))}

      </div>


      <button onClick={confirmSelection}>
        Confirm
      </button>


    </div>
  );

}


export default TimeSlot;