import { useState } from "react";

  function TimeSlot({ bookedSlots, setPickupDateTime }) {
  

    // React remembers these values between renders.
    // When the component runs again, React gives back the previous values.
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedTime, setSelectedTime] = useState(null);




    // Normal variables are recreated every render.
    // JavaScript creates a new array every time this component function runs.
    // This is fine because generating 14 dates is extremely cheap.
    const dates = [];
    const today = new Date();

    for (let i = 0; i < 14; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        dates.push(date);
    }

    // fix to local time Cairns (actually i think it's sydney time, Cairns daylight savings is slighlty different so this needs to be accounted for)
    function formatLocalDateTime(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
    }


    // This function is recreated every render. It generates the possible booking times for the selected date.
    // This can use useMemo in the future which will prevnt it from being regenerated on every render (eg when the component is close and re-opend... wasteful)
    
    function generateTimeSlots(date) {
        const slots = [];
        const day = date.getDay();

        // Sunday-Thursday: 6pm-10pm
        // Friday-Saturday: 6pm-11:30pm
        const closingHour = day === 5 || day === 6 ? 23 : 22;
        const closingMinute = day === 5 || day === 6 ? 30 : 0;

        // Create the earliest allowed booking time. Example: 6:07pm now -> first option becomes 6:30pm.
        const minimum = new Date();
        minimum.setMinutes(minimum.getMinutes() + 15);
        minimum.setMinutes(Math.ceil(minimum.getMinutes() / 15) * 15);

        // Start generating slots from opening time (6pm)
        const cursor = new Date(date);
        cursor.setHours(18, 0, 0, 0);

        // Move through the evening in 15-minute increments.
        while (
            cursor.getHours() < closingHour ||
            (cursor.getHours() === closingHour && cursor.getMinutes() <= closingMinute)
        ) {

            // Only include slots that are still bookable by time.
            if (cursor >= minimum) {

            const slotValue = formatLocalDateTime(cursor);

            slots.push({
                value: slotValue,

                label: cursor.toLocaleTimeString("en-AU", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
                }),

                // Check if this slot exists in the database bookings.
                available: !bookedSlots.includes(slotValue)
            });
            }

            cursor.setMinutes(cursor.getMinutes() + 15);
        }

    return slots;
    }


    // Recreated every render. generates slots and checks availability for the selected date.
    const timeSlots = selectedDate ? generateTimeSlots(selectedDate) : [];


    return (
        <section className="content-box">

            <h2>Test Booking Picker</h2>

            <h3>Select a date</h3>

            <div className="date-grid">

            {dates.map((date) => (

                <button
                key={date.toDateString()}
                className={
                    selectedDate?.toDateString() === date.toDateString()
                    ? "selected"
                    : ""
                }
                onClick={() => {
                    setSelectedDate(date);
                    setSelectedTime(null);
                }}
                >
                <strong>
                    {date.toLocaleDateString("en-AU", {
                    weekday: "short"
                    })}
                </strong>
                <br />
                {date.toLocaleDateString("en-AU", {
                    day: "numeric",
                    month: "short",
                })}
                </button>

            ))}

            </div>


            {selectedDate && (

            <>
                <h3>Select a pickup time</h3>
                <div className="time-grid">
                {timeSlots.map((slot) => (
                    <button
                    key={slot.value}
                    disabled={!slot.available}
                    className={
                        selectedTime === slot.value
                        ? "selected"
                        : ""
                    }
                    onClick={() => {
    if (slot.available) {
        setSelectedTime(slot.value);
        setPickupDateTime(slot.value);
    }
}}
                    >
                    {slot.label}
                    {!slot.available && " (Booked)"}
                    </button>

                ))}

                </div>
            </>

            )}


            {selectedDate && selectedTime && (

            <div className="booking-summary">

                <h3>Booking Summary</h3>

                <p>
                {new Date(selectedTime).toLocaleString("en-AU", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                })}
                </p>

            </div>

            )}

        </section>
    );
}

export default TimeSlot;