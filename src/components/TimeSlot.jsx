import { useState } from "react";

function TimeSlot({ bookedSlots, setPickupDateTime, pickupAddress, destinationAddress, fare, numberOfPedicabs }) {
    // React remembers these values between renders.
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

    // Fix to local time Cairns (actually I think it's Sydney time, Cairns daylight savings is slightly different so this needs to be accounted for)
    function formatLocalDateTime(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
    }

    // This function is recreated every render. It generates the possible booking times for the selected date.
    // This can use useMemo in the future which will prevent it from being regenerated on every render.
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
        while (cursor.getHours() < closingHour || (cursor.getHours() === closingHour && cursor.getMinutes() <= closingMinute)) {
            // Only include slots that are still bookable by time.
            if (cursor >= minimum) {
                const slotValue = formatLocalDateTime(cursor);

                slots.push({
                    value: slotValue,
                    label: cursor.toLocaleTimeString("en-AU", {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true
                    }),
                    // Check if this slot exists in the database bookings.
                    available: !bookedSlots.includes(slotValue)
                });
            }

            cursor.setMinutes(cursor.getMinutes() + 15);
        }

        return slots;
    }

    // Recreated every render. Generates slots and checks availability for the selected date.
    const timeSlots = selectedDate ? generateTimeSlots(selectedDate) : [];

    return (
        <section className="time-slot-panel">
            <div className="time-slot-heading">
                <span>01</span>
                <div>
                    <h3>Select a date</h3>
                    <p>Choose a day within the next two weeks.</p>
                </div>
            </div>

            <div className="date-grid">
                {dates.map((date) => (
                    <button
                        key={date.toDateString()}
                        className={selectedDate?.toDateString() === date.toDateString() ? "selected" : ""}
                        onClick={() => {
                            setSelectedDate(date);
                            setSelectedTime(null);
                        }}
                    >
                        <strong>{date.toLocaleDateString("en-AU", { weekday: "short" })}</strong>
                        <br />
                        {date.toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                    </button>
                ))}
            </div>

            {selectedDate && (
                <>
                    <div className="time-slot-heading time-slot-heading-followup">
                        <span>02</span>
                        <div>
                            <h3>Select a pickup time</h3>
                            <p>Available times update as bookings are made.</p>
                        </div>
                    </div>
                    <div className="time-grid">
                        {timeSlots.map((slot) => (
                            <button
                                key={slot.value}
                                disabled={!slot.available}
                                className={selectedTime === slot.value ? "selected" : ""}
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
                <div className="your-order-section">
                    <span className="your-order-section-label">Your order</span>
                    <div className="your-order-section-details">
                        <span>{numberOfPedicabs} {numberOfPedicabs === 1 ? "pedicab" : "pedicabs"}</span>
                    </div>
                    <div className="your-order-section-route">
                        <span><b>From</b><span>{pickupAddress}</span></span>
                        <span><b>To</b><span>{destinationAddress}</span></span>
                    </div>
                    <p className="your-order-section-date">
                        {new Date(selectedTime).toLocaleString("en-AU", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true
                        })}
                    </p>
                    {fare && <strong className="your-order-section-fare">${fare}</strong>}
                </div>
            )}
        </section>
    );
}

export default TimeSlot;