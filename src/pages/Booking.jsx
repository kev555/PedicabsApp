import { useState, useEffect } from "react";
import "react-datepicker/dist/react-datepicker.css";
import TimeSlot from "../components/TimeSlot";
import { supabase } from "../supabase";

function Booking({ closeBooking, fare, numberOfPedicabs, pickupAddress, destinationAddress }) {

    const [bookedSlots, setBookedSlots] = useState([]);
    const [pickupDateTime, setPickupDateTime] = useState(null);

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
        <section className="content-box booking-flow">
            <div className="booking-flow-header">
                <div className="your-ride-section">
                    <span className="your-ride-section-label">Your ride</span>
                    <div className="your-ride-section-details">
                        <span>{numberOfPedicabs} {numberOfPedicabs === 1 ? "pedicab" : "pedicabs"}</span>
                    </div>
                    <div className="your-ride-section-route">
                        <span><b>From</b><span>{pickupAddress}</span></span>
                        <span><b>To</b><span>{destinationAddress}</span></span>
                    </div>
                </div>
                <h2>Choose a pickup date and time</h2>
            </div>

            {!bookingConfirmed && (
                <div className="booking-picker-wrap">
                    <TimeSlot
                        setPickupDateTime={setPickupDateTime}
                        bookedSlots={bookedSlots}
                        pickupAddress={pickupAddress}
                        destinationAddress={destinationAddress}
                        fare={fare}
                        numberOfPedicabs={numberOfPedicabs}
                    />
                </div>
            )}

            {!bookingConfirmed && (
                <div className="booking-actions">
                    <button className="booking-secondary-button" onClick={closeBooking}>Cancel</button>
                    <button
                        className="booking-primary-button"
                        onClick={() => setShowCustomerDetails(true)}
                        disabled={!pickupDateTime}
                    >
                        Continue
                    </button>
                </div>
            )}

            {showCustomerDetails && !bookingConfirmed && (
                <div className="booking-box">

                    <label htmlFor="customer-name">Your name</label>

                    <input
                        id="customer-name"
                        type="text"
                        placeholder="Enter your name"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                    />
                </div>
            )}

            {showCustomerDetails && !bookingConfirmed && (
                <button
                    className="booking-confirm-button"
                    onClick={confirmBooking}
                    disabled={!customerName || !pickupDateTime}
                >
                    Confirm Booking
                </button>
            )}

            {bookingConfirmed && (
                <div className="booking-confirmed">

                    <p className="booking-flow-kicker">All set</p>
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

                    <button className="booking-primary-button" onClick={() => window.location.href = "/"}>Go Home</button>
                </div>
            )}
        </section>
    );
}

export default Booking;