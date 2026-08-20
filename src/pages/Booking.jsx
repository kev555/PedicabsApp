import { useState, useEffect } from "react";
import "react-datepicker/dist/react-datepicker.css";
import TimeSlot from "../components/TimeSlot";
import { supabase } from "../supabase";

function Booking({ closeBooking, fare, numberOfPedicabs }) {

    const [bookedSlots, setBookedSlots] = useState([]);
    const [pickupDateTime, setPickupDateTime] = useState(null);
    const [pickupTimeSelectorOpen, setPickupTimeSelectorOpen] = useState(false);

    const [showCustomerDetails, setShowCustomerDetails] = useState(false);
    const [customerName, setCustomerName] = useState("");
    const [bookingConfirmed, setBookingConfirmed] = useState(false);


    // Load existing bookings from Supabase
    useEffect(() => {
        async function loadBookings() {
            const { data, error } = await supabase
                .from("bookings")
                .select("pickup_time");
            if (error) {
                console.log(error);
                return;
            }
            setBookedSlots(
                data.map(booking => booking.pickup_time.slice(0, 16))
            );
        }
        loadBookings();
    }, []);

    // Confirm booking
    async function confirmBooking() {
        const { error } = await supabase
            .from("bookings")
            .insert([{
                pickup_time: pickupDateTime,
                customer_name: customerName,
                status: "confirmed"
            }]);
        if (error) {
            console.log(error);
            return;
        }
        setBookingConfirmed(true);
    }

    return (
        <section className="content-box">

            <button onClick={() => setPickupTimeSelectorOpen(true)} > Select Pickup Date/Time </button>

            {pickupTimeSelectorOpen && (
                <TimeSlot
                    setPickupDateTime={setPickupDateTime}
                    bookedSlots={bookedSlots}
                />
            )}

            <br/><br/>

            <button onClick={closeBooking}> Cancel </button>

            <button  onClick={() => setShowCustomerDetails(true)} > Continue </button>

            {showCustomerDetails && (
                <div className="booking-box">

                    <h3>Your name</h3>

                    <input
                        type="text"
                        placeholder="Enter your name"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                    />
                </div>
            )}

            {showCustomerDetails && !bookingConfirmed && (
                <button
                    onClick={confirmBooking}
                    disabled={!customerName || !pickupDateTime}
                >
                    Confirm Booking
                </button>
            )}

            {bookingConfirmed && (
                <div className="booking-confirmed">

                    <h3>Booking Confirmed!</h3>

                    <p>
                        Thanks {customerName}, your pedicab has been booked for{" "}
                        {new Date(pickupDateTime).toLocaleString("en-AU", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true
                        })}
                    </p>

                    <button onClick={() => window.location.href = "/"}> Go Home </button>
                </div>
            )}
        </section>
    );
}

export default Booking;