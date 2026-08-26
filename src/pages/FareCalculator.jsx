import { useState, useEffect, useRef } from "react";
import { GoogleMap, Marker, Autocomplete } from "@react-google-maps/api";

import Booking from "./Booking";
import QUICK_LOCATIONS_json from './locations.json';

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
    lat: -16.921,   // more = lower
    lng: 145.77     // more = right
};

function FareCalculator() {
    // state needed in this component is just pickupCoordinates, destinationCoordinates, numberOfPedicabs and then obviously the fare
    const [pickupCoordinates, setPickupCoordinatesFunc] = useState(null);
    const [pickupAddress, setPickupAddress] = useState("");
    const [pickupSelected, setPickupSelected] = useState(false);
    const [destinationCoordinates, setDestinationCoordinatesFunc] = useState(null);
    const [destinationAddress, setDestinationAddress] = useState("");
    const [numberOfPedicabs, setNumberOfPedicabs] = useState(1);
    const [baseFare, setBaseFare] = useState(null);

    // and one to load in booking.jsx component div
    const [bookingVisible, setBookingVisible] = useState(false);

    // Refs for the two separate Google Autocomplete instances
    const pickupAutocompleteInstanceRef = useRef(null);
    const destinationAutocompleteInstanceRef = useRef(null);

    // Ref for the actual destination input element
    const destinationInputRef = useRef(null);

    function checkIfInputEmpty(value) {
        if (!value.trim()) {
            setPickupSelected(false);
            setPickupCoordinatesFunc(null);
            setPickupAddress("");
            setDestinationCoordinatesFunc(null);
            setDestinationAddress("");

            if (destinationInputRef.current) {
                destinationInputRef.current.value = "";
            }

            setBaseFare(null);
        }
    }

    function handleNumberOfPedicabsChange(number) {
        setNumberOfPedicabs(number);
    }

    function handlePickupLocationSelected() {
        setPickupSelected(true);
    }

    // If the user starts changing the destination after selecting a place, clear the previously selected destination and fare.
    // But the text will remain in the input so they are free to reuse the tex/change it slightly and continue to get suggestions from Google Autocomplete.
    // !!So...!! all this is doing is clearing the destination coordinates and fare state variables to null, not the input text itself.
    // Also at first I thought this would cause a re-render on every character entered by the user, 
    // but actually a re-render only happens when the state variables are different from last time 
    // ie. setting an already null variable to null again does not cause a re-render. So no performance issues here.
    function handleUserManuallyEditingDestination() {
        setDestinationCoordinatesFunc(null);
        setDestinationAddress("");
        setBaseFare(null);
    }

    function handleQuickLocationClick(location) {
        if (!pickupSelected) {
            window.alert("Choose Pick up location first");
            return;
        }

        setDestinationCoordinatesFunc(location.geometry.location);
        setDestinationAddress(location.address);

        if (destinationInputRef.current) {
            destinationInputRef.current.value = location.address;
        }
    }

    // Runs as soon as the pickup Autocomplete component loads via onLoad.
    // Gets passed a new autocompleteInstance and sets the autocomplete bounds for it.
    // Then stores it in the pickupAutocompleteInstanceRef - never a need to re-render the Google Autocomplete instance so use a Ref to store it.

    function handlePickupAutocompleteLoad(newAutocompleteInstance) {
        const cairnsServiceAreaObject =
            new window.google.maps.LatLngBounds(
                { lat: cairnsServiceArea.south, lng: cairnsServiceArea.west },
                { lat: cairnsServiceArea.north, lng: cairnsServiceArea.east }
            );

        newAutocompleteInstance.setBounds(cairnsServiceAreaObject);
        pickupAutocompleteInstanceRef.current = newAutocompleteInstance;
    }

    // Runs when a pickup location is selected from the Google Autocomplete suggestions.
    // Gets the selected place from the pickup Autocomplete instance and saves its coordinates.
    function handlePickupPlaceChanged() {
        if (!pickupAutocompleteInstanceRef.current) return;

        const selectedPlace = pickupAutocompleteInstanceRef.current.getPlace();

        if (selectedPlace.geometry) {
            const selectedCoordinates = {
                lat: selectedPlace.geometry.location.lat(),
                lng: selectedPlace.geometry.location.lng()
            };

            setPickupCoordinatesFunc(selectedCoordinates);
            setPickupAddress(selectedPlace.formatted_address || selectedPlace.name);
            handlePickupLocationSelected();
        }
    }

    // Runs as soon as the destination Autocomplete component loads via onLoad.
    // Gets passed a new autocompleteInstance and sets the autocomplete bounds for it.
    // Then stores it in the destinationAutocompleteInstanceRef.
    function handleDestinationAutocompleteLoad(newAutocompleteInstance) {
        const cairnsServiceAreaObject =
            new window.google.maps.LatLngBounds(
                { lat: cairnsServiceArea.south, lng: cairnsServiceArea.west },
                { lat: cairnsServiceArea.north, lng: cairnsServiceArea.east }
            );

        newAutocompleteInstance.setBounds(cairnsServiceAreaObject);
        destinationAutocompleteInstanceRef.current = newAutocompleteInstance;
    }

    // Runs when a destination location is selected from the Google Autocomplete suggestions.
    // Gets the selected place from the destination Autocomplete instance and saves its coordinates.
    function handleDestinationPlaceChanged() {
        if (!destinationAutocompleteInstanceRef.current) return;

        const selectedPlace = destinationAutocompleteInstanceRef.current.getPlace();

        if (selectedPlace.geometry) {
            const selectedCoordinates = {
                lat: selectedPlace.geometry.location.lat(),
                lng: selectedPlace.geometry.location.lng()
            };

            setDestinationCoordinatesFunc(selectedCoordinates);
            setDestinationAddress(selectedPlace.formatted_address || selectedPlace.name);
        }
    }

    // Calculate the fare using Google Maps driving distance
    function calculateFare(pickupCoordinates, destinationCoordinates) {
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
                    const calculatedBaseFare = Math.max(10, distanceInKilometres * 15);

                    setBaseFare(calculatedBaseFare);
                }
            }
        );
    }

    const QUICK_LOCATIONS = QUICK_LOCATIONS_json;

    // totalFare is a normal variable, so it is recalculated during every render.
    // It uses the current data from the persistent state variables baseFare and numberOfPedicabs, which is why it always reflects the latest total.
    // It does not need to be state itself because it is fully derived from them and does not need to be stored independently between renders.
    // I was previously recalculating the baseFare state variable, but there was no need as the distance wasn't changing
    // Now the totalFare is just a normal variable that is recalculated each render using the baseFare
    const totalFare = baseFare === null
        ? null
        : (baseFare * numberOfPedicabs).toFixed(2);

    useEffect(() => {
        console.log("useEffect ran");

        if (!pickupCoordinates || !destinationCoordinates) return; // Ignore initial and subsequent loads if coordinates are empty

        console.log("useEffect ran AND passed checks");

        calculateFare(pickupCoordinates, destinationCoordinates); // Runs only when both coordinates are actually populated

    }, [pickupCoordinates, destinationCoordinates]);

    return (
        <section className="content-box">

            <div className="location-section-parent">
                <section className="manual-location-panel">
                    <h2 className="manual-location-panel-title">Select pick up and drop off locations</h2>

                    <div className="manual-location-panel-inputs">

                        <div>
                            <Autocomplete
                                onLoad={handlePickupAutocompleteLoad}
                                onPlaceChanged={handlePickupPlaceChanged}
                                options={{
                                    componentRestrictions: { country: "au" },
                                    bounds: cairnsServiceArea,
                                    strictBounds: true
                                }}
                            >
                                <input
                                    type="text"
                                    className="custom-input"
                                    placeholder="Enter Pick Up Location.."
                                    onChange={(event) => checkIfInputEmpty(event.target.value)}
                                />
                            </Autocomplete>
                        </div>

                        <div>
                            <Autocomplete
                                onLoad={handleDestinationAutocompleteLoad}
                                onPlaceChanged={handleDestinationPlaceChanged}
                                options={{
                                    componentRestrictions: { country: "au" },
                                    bounds: cairnsServiceArea,
                                    strictBounds: true
                                }}
                            >
                                {/* Google's Autocomplete instance doesn't provide a nice official setInputValue() method if i want to have quick select buttons 
                                    that auto input a destination in the Autocomplete input - I need to manage it myself, either with:

                                    React state:
                                    value={destinationInputValue}
                                    onChange={(event) => handleDestinationInputChange(event.target.value)} 
                                    And then use setDestinationInputValue("new value") to set it programmatically. The downside is that it will re-render the component every time the input value changes, which is unnecessary and can be inefficient.
                                    And in general it just makes things very sticky like the text is constantly being re-rendered and reset to the state value, which is not ideal for a user typing in an input. So I chose the ref method instead.

                                    or
                                    
                                    A ref:
                                    ref={destinationInputRef}
                                    and then use destinationInputRef.current.value = "new value" to set it programmatically. I chose the ref method because it is simpler and avoids unnecessary re-renders of the component when the input value changes. The downside is that I have to manage the input value manually, but in this case, it's a reasonable trade-off. Also, I can still use the onChange event to detect when the user types in the input and clear the destination coordinates if they start typing a new destination, the Google Autocomplete will then take over and provide suggestions again as the user types, like before.
                                    */}
                                <input
                                    ref={destinationInputRef}
                                    type="text"
                                    className="custom-input"
                                    placeholder="Enter Drop Off Location.."
                                    disabled={!pickupSelected}
                                    onChange={handleUserManuallyEditingDestination}
                                />
                            </Autocomplete>
                        </div>

                    </div>
                </section>

                <section className="quick-locations-panel">
                    <h2 className="quick-locations-panel-title">Popular Destinations</h2>

                    <div className="quick-locations-panel-options">
                        {QUICK_LOCATIONS.map((loc) => {
                            return (
                                <button
                                    key={loc.name}
                                    type="button"
                                    title={loc.name}
                                    className="quick-locations-panel-button"
                                    onClick={() => handleQuickLocationClick(loc)}
                                >
                                    {loc.name}
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
                    zoom={14}
                    options={{
                        mapTypeControl: false,
                        streetViewControl: false,
                        fullscreenControl: false,
                    }}
                >
                    {pickupCoordinates && <Marker position={pickupCoordinates} label="Pick Up" />}

                    {destinationCoordinates && <Marker position={destinationCoordinates} label="Drop Off" />}
                </GoogleMap>
            </div>

            <div className="fare-calculation-section">
                <div className="fare-cost">
                    <div className="fare-cost-left-subbox">
                        <div className="fare-cost-left-subbox-title">Total Fare:</div>

                        <p className="fare-cost-left-subbox-detail">
                            {
                                totalFare
                                    ? numberOfPedicabs + " " + (numberOfPedicabs === 1 ? "pedicab" : "pedicabs")
                                    : "Select pick up and drop off first"
                            }
                        </p>
                    </div>

                    <div className="fare-cost-right-subbox">
                        {totalFare ? <span className="fare-price">${totalFare}</span> : <span className="fare-placeholder">     _ _</span>}

                        <p className="fare-cost-right-subbox-note">
                            {baseFare !== null && baseFare < 10.05 ? "($10 min charge per cab)" : ""}
                        </p>
                    </div>
                </div>

                <div className="pedicab-amount-selector">
                    <div className="pedicab-amount-selector-title">
                        How many pedicabs?
                    </div>

                    <div className="pedicab-amount-selector-buttons">
                        {[1, 2, 3, 4].map((number) => (
                            <button
                                key={number}
                                type="button"
                                onClick={() => handleNumberOfPedicabsChange(number)}
                                className={numberOfPedicabs === number ? "selected" : ""}
                            >
                                {number}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {!bookingVisible && (
                <button
                    type="button"
                    className="book-ride-button"
                    onClick={() => setBookingVisible(true)}
                    disabled={!totalFare}
                >
                    Book this ride
                </button>
            )}

            {bookingVisible && (
                <Booking
                    closeBooking={() => setBookingVisible(false)}
                    fare={totalFare}
                    numberOfPedicabs={numberOfPedicabs}
                    pickupAddress={pickupAddress}
                    destinationAddress={destinationAddress}
                />
            )}

            <br />
            <br />
        </section>
    );
}

export default FareCalculator;