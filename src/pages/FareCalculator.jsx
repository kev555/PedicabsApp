import { useState, useEffect } from "react";
import { GoogleMap, Marker, Autocomplete } from "@react-google-maps/api";

import AutocompleteForCairns from "../components/AutocompleteForCairns";
import Booking from "./Booking";

// move it to components dir in after testing
// import Booking from "../components/Booking";

const mapContainerStyle = {
    width: "90%",
    maxWidth: "800px",
    height: "300px",
    margin: "0 auto"
};

// Cairns area used to prefer local autocomplete results
const cairnsServiceArea = {
    south: -16.98,
    west: 145.70,
    north: -16.85,
    east: 145.85
};

const mapCenterCoordinates = {
    lat: (cairnsServiceArea.south + cairnsServiceArea.north) / 2,
    lng: (cairnsServiceArea.west + cairnsServiceArea.east) / 2
};

function FareCalculator() {
    // state needed in this component is just pickupCoordinates, destinationCoordinates, numberOfPedicabs and then obviously the fare
    const [pickupCoordinates, setPickupCoordinatesFunc] = useState(null);
    const [pickupSelected, setPickupSelected] = useState(false);
    const [destinationCoordinates, setDestinationCoordinatesFunc] = useState(null);
    const [numberOfPedicabs, setNumberOfPedicabs] = useState(1);
    const [fare, setFare] = useState(null);

    // and one to load in booking.jsx component div
    const [bookingVisible, setBookingVisible] = useState(false);

    function handlePickupInputChange(value) {
        if (!value.trim()) {
            setPickupSelected(false);
            setPickupCoordinatesFunc(null);
            setDestinationCoordinatesFunc(null);
            setFare(null);
        }
    }

    // Get the coordinates of the destination selected by the user
    function handleDestinationChanged() {
        if (destinationAutocompleteInstance !== null) {
            const selectedDestination = destinationAutocompleteInstance.getPlace();

            if (selectedDestination.geometry) {
                setDestinationCoordinatesFunc({
                    lat: selectedDestination.geometry.location.lat(),
                    lng: selectedDestination.geometry.location.lng()
                });
            }
        }
    }

    function handlePickupChanged() {
        if (pickupAutocompleteInstance !== null) {
            const selectedPickup = pickupAutocompleteInstance.getPlace();

            if (selectedPickup.geometry) {
                setPickupCoordinatesFunc({
                    lat: selectedPickup.geometry.location.lat(),
                    lng: selectedPickup.geometry.location.lng()
                });
            }
        }
    }

    // Calculate the fare using Google Maps driving distance
    function calculateFare(pickupCoordinates, destinationCoordinates, numberOfPedicabs){    
        const distanceService = new window.google.maps.DistanceMatrixService();
        distanceService.getDistanceMatrix(
            {
                origins: [pickupCoordinates],
                destinations: [destinationCoordinates],
                travelMode: window.google.maps.TravelMode.BICYCLING
            },
            (response, status) => {
                if (status === "OK") {
                    const distanceInMeters = response.rows[0].elements[0].distance.value;
                    const distanceInKilometres = distanceInMeters / 1000;

                    // Minimum $10 fare per pedicab
                    const calculatedFare = Math.max(10, distanceInKilometres * 15) * numberOfPedicabs;

                    setFare(calculatedFare.toFixed(2));
                }
            }
        );
    }

    // Run calculateFare function every time destination, pickup or number of pedicabs are changed
    useEffect(() => {
        if (pickupCoordinates && destinationCoordinates) {
            calculateFare(pickupCoordinates, destinationCoordinates, numberOfPedicabs);
        }
    }, [pickupCoordinates, destinationCoordinates, numberOfPedicabs]);

    return (
        <section className="content-box">

            <div className="location-selection-layout">
                <section className="manual-location-panel" aria-labelledby="manual-location-title">
                    <h2 id="manual-location-title" className="location-shortcuts-title">Select pick up and drop off locations</h2>
                    <div className="location-inputs">
                        <AutocompleteForCairns
                            placeholder="Enter Pick Up Location.."
                            coordinatesStateSetterFunc={setPickupCoordinatesFunc}
                            onLocationSelected={() => setPickupSelected(true)}
                            onInputChange={handlePickupInputChange}
                        />

                        <AutocompleteForCairns
                            placeholder="Enter Drop Off Location.."
                            coordinatesStateSetterFunc={setDestinationCoordinatesFunc}
                            disabled={!pickupSelected}
                        />
                    </div>
                </section>

                <section className="location-shortcuts" aria-labelledby="location-shortcuts-title">
                    <h2 id="location-shortcuts-title" className="location-shortcuts-title">Quick pick popular locations</h2>
                    <div className="location-shortcut-options">
                        {["Pick up 1", "Pick up 2", "Pick up 3", "Pick up 4", "Drop off 1", "Drop off 2", "Drop off 3", "Drop off 4"].map((location) => {
                            const isDropOff = location.startsWith("Drop off");

                            return (
                                <button
                                    key={location}
                                    type="button"
                                    className="location-shortcut-button"
                                    disabled={isDropOff && !pickupSelected}
                                >
                                    {location}
                                </button>
                            );
                        })}
                    </div>
                </section>
            </div>

            <div className="map-frame">
                <GoogleMap 
                    mapContainerStyle={mapContainerStyle} 
                    center={pickupCoordinates || mapCenterCoordinates} 
                    zoom={15}
                    options={{ mapTypeControl: false, streetViewControl: false, fullscreenControl: false }}
                >
                    {pickupCoordinates && <Marker position={pickupCoordinates} label="Pick Up" />}

                    { destinationCoordinates && <Marker position={destinationCoordinates} label="Drop Off" /> }
                </GoogleMap>
            </div>

            <div className="fare-selection-layout">
                <div className="fare-summary" aria-live="polite">
                    <div className="fare-summary-copy">
                        <div className="fare-summary-header">
                            <span className="fare-summary-title">Estimated fare</span>
                        </div>
                        <p className="fare-summary-detail">
                            {fare
                                ? `${numberOfPedicabs} ${numberOfPedicabs === 1 ? "pedicab" : "pedicabs"}`
                                : "Select pick up and drop off locations first*"}
                        </p>
                        <p className="fare-summary-note">$10 minimum per pedicab</p>
                    </div>
                    <p className="fare-amount">{fare ? `$${fare}` : "--"}</p>
                </div>

                <div className="pedicab-selector" role="group" aria-labelledby="pedicab-selector-title">
                    <div id="pedicab-selector-title" className="pedicab-selector-title">How many pedicabs?</div>
                    <div className="pedicab-options" role="group" aria-label="Number of pedicabs">
                        {[1, 2, 3, 4].map((number) => (
                            <button
                                key={number}
                                type="button"
                                onClick={() => setNumberOfPedicabs(number)}
                                className={numberOfPedicabs === number ? "selected" : ""}
                                aria-pressed={numberOfPedicabs === number}
                            >
                                <span className="pedicab-number">{number}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <button className="book-ride-button" onClick={() => setBookingVisible(true)}>
                Book this ride
            </button>

            {bookingVisible && (
                <Booking
                    closeBooking={() => setBookingVisible(false)}
                    fare={fare}
                    numberOfPedicabs={numberOfPedicabs}
                />
            )}
            <br/>
            <br/>
        </section>
    );
}

export default FareCalculator;