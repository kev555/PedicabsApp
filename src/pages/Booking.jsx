import { useState, useEffect } from "react";
import "react-datepicker/dist/react-datepicker.css";
import TimeSlot from "../components/TimeSlot";
import { supabase } from "../supabase";

function Booking({ closeBooking, bookingMode, fare, numberOfPedicabs, pickupAddress, dropoffAddress, originalFare, discountAmount, promoApplied }) {

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
        <>
            <div className="booking-flow-header">
                <div className="your-ride-section">
                    <span className="your-ride-section-label">Your ride</span>
                    <span>{bookingMode === "now" ? "Booking for right now" : "Booking for later"}</span>
                    <div className="your-ride-section-route">
                        <span className="your-ride-section-row">
                            <b>Cabs:</b>
                            <span>{numberOfPedicabs} {numberOfPedicabs === 1 ? "Pedicab" : "Pedicabs"}</span>
                        </span>
                        <span className="your-ride-section-row"><b>From:</b><span>{pickupAddress}</span></span>
                        <span className="your-ride-section-row"><b>To:</b><span>{dropoffAddress}</span></span>
                        <span className="your-ride-section-row">
                            <b>Cost:</b>
                            <span className="your-order-section-fare-wrapper">
                                {fare && (
                                    promoApplied ? (
                                        <strong className="your-order-section-fare your-order-section-fare-discounted">
                                            <span className="your-order-section-fare-discounted-original">${originalFare}</span>
                                            <span className="your-order-section-fare-discounted-discount">- ${discountAmount}</span>
                                            = <b className="your-order-section-fare-discounted-final">${fare}</b>
                                        </strong>
                                    ) : (
                                        <strong className="your-order-section-fare">${fare}</strong>
                                    )
                                )}
                            </span>
                        </span>
                    </div>
                </div>

            </div>

            {!bookingConfirmed && (
                <TimeSlot
                    setPickupDateTime={setPickupDateTime}
                    bookedSlots={bookedSlots}
                    pickupAddress={pickupAddress}
                    dropoffAddress={dropoffAddress}
                    fare={fare}
                    numberOfPedicabs={numberOfPedicabs}
                    originalFare={originalFare}
                    discountAmount={discountAmount}
                    promoApplied={promoApplied}
                />
            )}
            {!bookingConfirmed && (
                <div className="booking-actions">
                    <button
                        className="booking-primary-button"
                        onClick={() => setShowCustomerDetails(true)}
                        disabled={!pickupDateTime}
                    >
                        Continue
                    </button>
                    <button className="booking-secondary-button" onClick={closeBooking}>Cancel</button>
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
        </>
    );
}

export default Booking;