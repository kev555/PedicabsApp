import { useState, useEffect, useRef } from "react";
import { GoogleMap, Marker, Autocomplete } from "@react-google-maps/api";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

import QUICK_LOCATIONS_json from './locations.json';

const QUICK_LOCATIONS = QUICK_LOCATIONS_json;

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
    const [promoCode, setPromoCode] = useState("");
    const [promoApplied, setPromoApplied] = useState(false);
    const [promoMessage, setPromoMessage] = useState("");
    const [bookingModeSelected, setBookingModeSelected] = useState(false);
    const [mapsReady, setMapsReady] = useState(false);
    const [BookingComponent, setBookingComponent] = useState(null);

    // and one to load in booking.jsx component div
    const [bookingVisible, setBookingVisible] = useState(false);

    // Refs for the two separate Google Autocomplete instances
    const pickupAutocompleteInstanceRef = useRef(null);
    const destinationAutocompleteInstanceRef = useRef(null);

    // Ref for the actual destination input element
    const destinationInputRef = useRef(null);

    useEffect(() => {
        setOptions({
            key: import.meta.env.VITE_GOOGLE_MAPS_KEY,
            v: "weekly"
        });

        Promise.all([
            importLibrary("maps"),
            importLibrary("places")
        ])
            .then(() => {
                setMapsReady(true);

                return import("./Booking");
            })
            .then((bookingModule) => setBookingComponent(() => bookingModule.default))
            .catch((error) => console.error("Google Maps failed to load", error));
    }, []);

    function handleUserManuallyEditingPickup() {
        setBookingVisible(false);
        setPickupSelected(false);
        setPickupCoordinatesFunc(null);
        setPickupAddress("");
        setBaseFare(null);
        setPromoApplied(false);
        setPromoMessage("");
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
        setBookingVisible(false);
        setPromoApplied(false);
        setPromoMessage("");
    }


    function handleNumberOfPedicabsChange(number) {
        setNumberOfPedicabs(number);
    }

    function applyPromoCode() {
        const normalizedPromoCode = promoCode.trim().toLowerCase();
        const validPromoCode = normalizedPromoCode === "aug" || normalizedPromoCode === "15off";

        setPromoApplied(validPromoCode);
        setPromoMessage(validPromoCode ? "15% discount applied!" : "promo code not vald");
    }

    // The following functions run via onLoad. They automatically get passed a newly generated autocompleteInstance from the Autocomplete class and they set the map area bounds area for each. These new autocompleteInstances get stored as a Refs (either "pickupAutocompleteInstanceRef" or "destinationAutocompleteInstanceRef").
    // Now the Google Autocomplete instance won't need to be re-rendered every time or have it's bounds re-set every time the user types a character, which is what was happening before. Now the Google Autocomplete instance is only created once and then stored in a Ref, and the bounds are set once when it is created. This should improve performance and reduce unnecessary re-renders.
    
    function handlePickupAutocompleteLoad(newAutocompleteInstance) {
        const cairnsServiceAreaObject =
            new window.google.maps.LatLngBounds(
                { lat: cairnsServiceArea.south, lng: cairnsServiceArea.west },
                { lat: cairnsServiceArea.north, lng: cairnsServiceArea.east }
            );

        newAutocompleteInstance.setBounds(cairnsServiceAreaObject);
        pickupAutocompleteInstanceRef.current = newAutocompleteInstance;
    }

    function handleDestinationAutocompleteLoad(newAutocompleteInstance) {
        const cairnsServiceAreaObject =
            new window.google.maps.LatLngBounds(
                { lat: cairnsServiceArea.south, lng: cairnsServiceArea.west },
                { lat: cairnsServiceArea.north, lng: cairnsServiceArea.east }
            );

        newAutocompleteInstance.setBounds(cairnsServiceAreaObject);
        destinationAutocompleteInstanceRef.current = newAutocompleteInstance;
    }



    // The following functions contain the logic for when a user selects a location from the Google Autocomplete suggestions Essentially they get the selected place from the Pickup or Destination Autocomplete instance, and then set the coordinates and address state variables accordingly. The useEffect hook below then runs to calculate the fare when both coordinates are populated and allow the user to proceed to the booking flow.
    // *The Qucik Location buttons bypass the Google Autocomplete suggestions and instead pass a location object directly to handleDestinationPlaceChanged, which then runs the same logic as if the user had selected a suggestion from the dropdown.
    
    function handlePickupPlaceChanged() {

        // Checks if the pickupAutocompleteInstanceRef.current is null, which means that the Google Autocomplete instance has not finished loading yet, as it's initialized with null (const pickupAutocompleteInstanceRef = useRef(null);), and remains null until handlePickupAutocompleteLoad above runs
        if (!pickupAutocompleteInstanceRef.current) return;

        const selectedPlace = pickupAutocompleteInstanceRef.current.getPlace();

        if (selectedPlace.geometry) {
            const selectedCoordinates = {
                lat: selectedPlace.geometry.location.lat(),
                lng: selectedPlace.geometry.location.lng()
            };

            if (selectedPlace.name) {
                selectedPlace.neat_address = selectedPlace.name + ", Cairns QLD";
            }

            setPickupCoordinatesFunc(selectedCoordinates);
            setPickupAddress(selectedPlace.neat_address  || selectedPlace.formatted_address);
            setPickupSelected(true);
        }
    }

    function handleDestinationPlaceChanged(quickLocation = null) {
        if (!pickupSelected) {
            window.alert("Choose Pick up location first");
            return;
        }

        const selectedPlace = quickLocation || destinationAutocompleteInstanceRef.current?.getPlace();
        if (!selectedPlace) return;

        selectedPlace.neat_address = selectedPlace.name + ", Cairns QLD";

        if (selectedPlace.geometry) {
            const location = selectedPlace.geometry.location;
            const selectedCoordinates = {
                lat: typeof location.lat === "function" ? location.lat() : location.lat,
                lng: typeof location.lng === "function" ? location.lng() : location.lng
            };

            setDestinationCoordinatesFunc(selectedCoordinates);
            setDestinationAddress(selectedPlace.neat_address || selectedPlace.name || selectedPlace.formatted_address || selectedPlace.address);

            if (quickLocation && destinationInputRef.current) {
                destinationInputRef.current.value = selectedPlace.address;
            }
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

    // totalFare is a normal variable, so it is recalculated during every render. It uses the current data from the persistent state variables baseFare and numberOfPedicabs, which is why it always reflects the latest total.It does not need to be state itself because it is fully derived from them and does not need to be stored independently between renders. I was previously recalculating the baseFare state variable, but there was no need as the distance wasn't changing. Now the totalFare is just a normal variable that is recalculated each render using the baseFare.
    const totalFare = baseFare === null
        ? null
        : (baseFare * numberOfPedicabs * (promoApplied ? 0.85 : 1)).toFixed(2);
    const originalTotalFare = baseFare === null
        ? null
        : (baseFare * numberOfPedicabs).toFixed(2);
    const discountAmount = baseFare === null
        ? null
        : (baseFare * numberOfPedicabs * 0.15).toFixed(2);

    useEffect(() => {
        console.log("useEffect ran");

        if (!pickupCoordinates || !destinationCoordinates) return; // Ignore initial and subsequent loads if coordinates are empty

        console.log("useEffect ran AND passed checks");

        calculateFare(pickupCoordinates, destinationCoordinates); // Runs only when both coordinates are actually populated

    }, [pickupCoordinates, destinationCoordinates]);

    return (
        <section className="content-box">

            {!bookingModeSelected && <div className="booking-choice-panel">
                <button
                    type="button"
                    className="booking-mode-option"
                    onClick={() => setBookingModeSelected(true)}
                >
                    <span className="booking-mode-option-title">Book For Right Now</span>
                    <span className="booking-mode-option-description">
                        You are ordering for right now. Meaning you can see available Pedicab(s) at your current location.
                    </span>
                </button>

                <button
                    type="button"
                    className="booking-mode-option"
                    onClick={() => setBookingModeSelected(true)}
                >
                    <span className="booking-mode-option-title">Book For Later Time/Date</span>
                    <span className="booking-mode-option-description">
                        Choose any future date/time and pick up location
                    </span>
                </button>
            </div>}

            {bookingModeSelected && <div className="location-section-parent">
                {
                    ! mapsReady ? 
                    (<p 
                        className="maps-loading-message">Loading booking tools...
                    </p>) : 
                    
                    ( <>
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
                                        onChange={handleUserManuallyEditingPickup}
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
                                    {/* 
                                        Manually plugging into Google Autocomplete:

                                        Google's Autocomplete instance doesn't provide a way to simulate a user inputting a location ie. onPlaceChanged={} can not be triggered programmatically. So for the quick pick destination buttons I need to implement the logic myself. So there a few things that need to be covered:

                                        1. The logic for updating the destination corordintaes (handleDestinationPlaceChanged).
                                        For this I just modified handleDestinationPlaceChanged to accept an optional quickLocation parameter, which is the location object from the quick pick button. If it is provided, it will use that instead of the Google Autocomplete instance. This way I can call handleDestinationPlaceChanged(quickLocation) from the quick pick button and it will update the destination coordinates and address accordingly in the same way as if the user had selected a suggestion from the Google Autocomplete dropdown.
                                        
                                        2. The logic for updating the input value to reflect the quick pick location:
                                        For this I could have used two methods, either a React state variable or a ref. I chose to use a ref because it is simpler and avoids unnecessary re-renders of the component when the input value changes. The downside is that I have to manage the input value manually, but in this case, it's a reasonable trade-off.

                                        3. The logic for clearing the destination coordinates and fare when the user starts typing in the input:
                                        This is handled by the onChange event of the input, which calls handleUserManuallyEditingDestination. This function clears the destination coordinates and fare state variables, but does not clear the input value itself, so the user can continue typing and get suggestions from Google Autocomplete.

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
                                                key={loc.shorthand_name}
                                                type="button"
                                                title={loc.shorthand_name}
                                                className="quick-locations-panel-button"
                                                onClick={() => handleDestinationPlaceChanged(loc)}
                                            >
                                                {loc.shorthand_name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>
                        </>
                    )
                }
            </div>}

            <div className={`map-frame ${!bookingModeSelected ? "map-frame-preloaded" : ""}`}>
                {mapsReady && <GoogleMap
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
                    </GoogleMap>}

            </div>

            {bookingModeSelected && mapsReady && <div className="fare-calculation-section">
                <div className="fare-cost">
                    <div className="fare-cost-left-subbox">
                        <div className="fare-cost-left-subbox-title">Total Fare:</div>

                        <div className="promo-code-control">
                            <input
                                type="text"
                                value={promoCode}
                                placeholder="Promo code"
                                aria-label="Promo code"
                                disabled={!baseFare}
                                onChange={(event) => {
                                    setPromoCode(event.target.value);
                                    setPromoMessage("");
                                    setPromoApplied(false);
                                }}
                            />
                            <button
                                type="button"
                                disabled={!baseFare || !promoCode.trim()}
                                onClick={applyPromoCode}
                            >
                                Apply
                            </button>
                        </div>
                        {promoMessage && (
                            <p className={`promo-code-message ${promoApplied ? "promo-code-success" : ""}`}>
                                {promoMessage}
                            </p>
                        )}
                    </div>

                    <div className="fare-cost-right-subbox">
                        {promoApplied && (
                            <div className="fare-cost-right-subbox-when-discounted">
                                <div className="fare-cost-right-subbox-price-when-discounted-original">${originalTotalFare}</div>
                                <div className="fare-cost-right-subbox-price-when-discounted-discount">- ${discountAmount}</div>
                            </div>
                        )}

                        {totalFare
                            ? <span className="fare-cost-right-subbox-price">${totalFare}</span>
                            : <span className="fare-placeholder">     _ _</span>}

                        <p className="fare-cost-right-subbox-note">
                            {
                                totalFare
                                    ? numberOfPedicabs + " " + (numberOfPedicabs === 1 ? "Pedicab" : "Pedicabs")
                                    : "Select pick up and drop off first"
                            }
                            {
                                baseFare !== null && baseFare < 10.01 && (
                                <>
                                    <br />
                                    ($10 min charge per cab)
                                </>
                            )}
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
            </div>}

            


                        {/* Terminology refresher: The following is:
            Two React elements inside a single React Fragment (or container tag), inside a JSX expression. */}

            {bookingModeSelected && mapsReady && !bookingVisible && (
                <>
                    <button 
                        type="button" 
                        className="book-ride-button" 
                        onClick={() => setBookingVisible(true)}
                        disabled={!totalFare}
                    >
                        Book this ride
                    </button>

                    <button 
                        type="button" 
                        //className="cancel-ride-button"
                        //onClick={handleCancel}
                    >
                        Cancel
                    </button>
                </>
            )}

            {bookingModeSelected && mapsReady && bookingVisible && BookingComponent && (
                    <BookingComponent
                        closeBooking={() => setBookingVisible(false)}
                        fare={totalFare}
                        numberOfPedicabs={numberOfPedicabs}
                        pickupAddress={pickupAddress}
                        destinationAddress={destinationAddress}
                        originalFare={originalTotalFare}
                        discountAmount={discountAmount}
                        promoApplied={promoApplied}
                    />
            )}

            <br />
            <br />
        </section>
    );
}

export default FareCalculator;