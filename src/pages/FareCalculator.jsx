import { useState, useEffect, useRef } from "react";
import { GoogleMap, Marker } from "@react-google-maps/api";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import AutocompleteForCairns from "../components/AutocompleteForCairns";
import { cairnsServiceArea } from "../serviceArea";

import QUICK_LOCATIONS_json from './locations.json';

const QUICK_LOCATIONS = QUICK_LOCATIONS_json;

const mapContainerStyle = {
    width: "90%",
    maxWidth: "800px",
    height: "300px",
    margin: "0 auto"
};

const mapCenterCoordinates = {
    lat: -16.921,   // more = lower
    lng: 145.77     // more = right
};

function FareCalculator() {
    // State needed in this component is pickupCoordinates, dropoffCoordinates, numberOfPedicabs, and the fare.
    const [pickupCoordinates, setPickupCoordinatesFunc] = useState(null);
    const [pickupAddress, setPickupAddress] = useState("");
    const [pickupSelected, setPickupSelected] = useState(false);
    const [dropoffCoordinates, setDropoffCoordinatesFunc] = useState(null);
    const [dropoffAddress, setDropoffAddress] = useState("");
    const [numberOfPedicabs, setNumberOfPedicabs] = useState(1);
    const [baseFare, setBaseFare] = useState(null);
    const [promoCode, setPromoCode] = useState("");
    const [promoApplied, setPromoApplied] = useState(false);
    const [promoMessage, setPromoMessage] = useState("");
    const [fareCalculationModeSelected, setFareCalculationModeSelected] = useState(false);
    const [fareCalculationModeTitle, setFareCalculationModeTitle] = useState("");
    const [bookingMode, setBookingMode] = useState(null);
    const [mapsReady, setMapsReady] = useState(false);
    const [BookingComponent, setBookingComponent] = useState(null);
    const [userLocation, setUserLocation] = useState(null);
    const [initialPickupPlace, setInitialPickupPlace] = useState(null);

    // and one to load in booking.jsx component div
    const [bookingVisible, setBookingVisible] = useState(false);

    // References used to keep each Places widget available for quick-location updates.
    const pickupAutocompleteInstanceRef = useRef(null);
    const dropoffAutocompleteInstanceRef = useRef(null);
    const pickupInputEditedRef = useRef(false);

    const fareCalculationModeHistoryEntryRef = useRef(false);
    const bookingHistoryEntryRef = useRef(false);

    useEffect(() => {
        setOptions({
            key: import.meta.env.VITE_GOOGLE_MAPS_KEY,
            v: "weekly"
        });

        Promise.all([
            importLibrary("maps"),
            importLibrary("places"),
            importLibrary("routes")
        ])
            .then(() => {
                setMapsReady(true);

                return import("./Booking");
            })
            .then((bookingModule) => setBookingComponent(() => bookingModule.default))
            .catch((error) => console.error("Google Maps failed to load", error));
    }, []);

    function handleUserManuallyEditingPickup() {
        pickupInputEditedRef.current = true;
        setBookingVisible(false);
        setPickupSelected(false);
        setPickupCoordinatesFunc(null);
        setPickupAddress("");
        setInitialPickupPlace(null);
        setBaseFare(null);
        setPromoApplied(false);
        setPromoMessage("");
    }

    // Clear the selected dropoff and fare when the user edits the dropoff input.
    // If the user starts changing the destination after selecting a place, clear the previously selected destination and fare.
    // But the text will remain in the input so they are free to reuse the tex/change it slightly and continue to get suggestions from Google Autocomplete.
    // !!So...!! all this is doing is clearing the destination coordinates and fare state variables to null, not the input text itself.
    // Also at first I thought this would cause a re-render on every character entered by the user, 
    // but actually a re-render only happens when the state variables are different from last time 
    // ie. setting an already null variable to null again does not cause a re-render. So no performance issues here.

    function handleUserManuallyEditingDropoff() {
        setDropoffCoordinatesFunc(null);
        setDropoffAddress("");
        setBaseFare(null);
        setBookingVisible(false);
        setPromoApplied(false);
        setPromoMessage("");
    }


    function handleNumberOfPedicabsChange(number) {
        setNumberOfPedicabs(number);
    }

    // so easy! :)
    function requestUserLocation() {
        if (!navigator.geolocation) {
            console.log("Geolocation is not supported by this browser.");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const location = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };

                setUserLocation(location);
                console.log("User coordinates:", location);

                const isWithinServiceArea =
                    location.lat >= cairnsServiceArea.south &&
                    location.lat <= cairnsServiceArea.north &&
                    location.lng >= cairnsServiceArea.west &&
                    location.lng <= cairnsServiceArea.east;

                if (!isWithinServiceArea) {
                    console.log("User location showing as outside service area");
                    return;
                }

                findNearestPlace(location);
            },
            (error) => {
                console.log("Geolocation permission or lookup failed:", error.message);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    }

    async function findNearestPlace(location) {
        try {
            const { places } = await window.google.maps.places.Place.searchNearby({
                fields: ["displayName", "formattedAddress", "location"],
                locationRestriction: {
                    center: location,
                    radius: 50000
                },
                maxResultCount: 1,
                rankPreference: window.google.maps.places.SearchNearbyRankPreference.DISTANCE
            });

            const nearestPlace = places?.[0];
            if (!nearestPlace) {
                console.log("No nearby map entities found for user location.");
                return;
            }

            if (!nearestPlace.location || !nearestPlace.displayName) {
                console.error("Nearest map entity did not include a name and location.");
                return;
            }

            console.log("Nearest map entity:", nearestPlace.displayName);
            if (pickupInputEditedRef.current) return;

            const nearestPickupPlace = {
                geometry: { location: nearestPlace.location },
                name: nearestPlace.displayName,
                neat_address: nearestPlace.formattedAddress || nearestPlace.displayName,
                address: nearestPlace.formattedAddress || nearestPlace.displayName
            };
            setInitialPickupPlace(nearestPickupPlace);
            handlePickupPlaceChanged(nearestPickupPlace, true);
        } catch (error) {
            console.error("Google Places failed to find a nearby map entity", error);
        }
    }

    function handleFareCalculationModeSelection(mode, title) {
        window.history.pushState(
            { ...window.history.state, fareCalculationModeSelected: true },
            "",
            window.location.href
        );
        fareCalculationModeHistoryEntryRef.current = true;
        setBookingMode(mode);
        setFareCalculationModeTitle(title);
        setFareCalculationModeSelected(true);
        // Only an immediate booking needs the rider's current location.
        if (mode === "now") {
            pickupInputEditedRef.current = false;
            requestUserLocation();
        }
    }

    function handleCancelFareCalculationMode() {
        setFareCalculationModeTitle("");
        setBookingMode(null);
        setFareCalculationModeSelected(false);
    }

    useEffect(() => {
        function handleBrowserBack() {
            if (bookingHistoryEntryRef.current) {
                bookingHistoryEntryRef.current = false;
                setBookingVisible(false);
                return;
            }

            if (!fareCalculationModeHistoryEntryRef.current) return;

            fareCalculationModeHistoryEntryRef.current = false;
            handleCancelFareCalculationMode();
        }

        window.addEventListener("popstate", handleBrowserBack);

        return () => window.removeEventListener("popstate", handleBrowserBack);
        
    }, []);

    function handleFareCalculationModeBack() {
        if (fareCalculationModeHistoryEntryRef.current) {
            window.history.back();
            return;
        }

        handleCancelFareCalculationMode();
    }

    function handleQuickLocationSelection(quickLocation) {
        if (!pickupSelected) {
            pickupInputEditedRef.current = true;
            handlePickupPlaceChanged(quickLocation, true);
            return;
        }

        handleDropoffPlaceChanged(quickLocation, true);
    }

    function openBooking() {
        window.history.pushState(
            { ...window.history.state, booking: true },
            "",
            window.location.href
        );
        bookingHistoryEntryRef.current = true;
        setBookingVisible(true);
    }

    function closeBooking() {
        if (bookingHistoryEntryRef.current) {
            window.history.back();
            return;
        }

        setBookingVisible(false);
    }

    function applyPromoCode() {
        const normalizedPromoCode = promoCode.trim().toLowerCase();
        const validPromoCode = normalizedPromoCode === "aug" || normalizedPromoCode === "15off";

        setPromoApplied(validPromoCode);
        setPromoMessage(validPromoCode ? "15% discount applied!" : "promo code not vald");
    }

    // These handlers process Places (New) selections or quick-location objects and update coordinates and addresses for fare calculation.

    // The following functions contain the logic for when a user selects a location from the Places suggestions. They set the coordinates and address state variables; the useEffect hook below then calculates the fare when both coordinates are populated.
    // *The Quick Location buttons bypass the Places suggestions and instead pass a location object directly to these handlers.
    
    function handlePickupPlaceChanged(selectedPlace, isQuickLocation = false) {
        if (!selectedPlace) return;

        if (selectedPlace.geometry) {
            const location = selectedPlace.geometry.location;

            // Places returns a Google LatLng object, where lat and lng are functions
            // Quick locations come from locations.json, where lat and lng are numbers already
            // Account for both:
            const selectedCoordinates = {
                lat: typeof location.lat === "function" ? location.lat() : location.lat,
                lng: typeof location.lng === "function" ? location.lng() : location.lng
            };

            if (selectedPlace.name && !selectedPlace.neat_address) {
                selectedPlace.neat_address = selectedPlace.name + ", Cairns QLD";
            }

            setBaseFare(null);
            setPickupCoordinatesFunc(selectedCoordinates);
            setPickupAddress(selectedPlace.neat_address || selectedPlace.formatted_address || selectedPlace.name || selectedPlace.address);
            setPickupSelected(true);

            // Quick locations set the input value directly; Places selections already update the input.
            if (isQuickLocation && pickupAutocompleteInstanceRef.current) {
                pickupAutocompleteInstanceRef.current.setValue(selectedPlace.address || selectedPlace.name || selectedPlace.formatted_address || "");
            }

            // I DONT THINK THIS IS NECESSARY:
            // THE EXPLINATION AI GAVE WAS:
            // "When changing pickup via a quick button, this clears the old dropoff from both places: the input’s visible text is emptied, and the handler clears the saved dropoff and fare-related state. Otherwise, the app could keep calculating or displaying a fare for the previous dropoff even though the pickup changed."
            // if (isQuickLocation && dropoffAutocompleteInstanceRef.current) {
            //     dropoffAutocompleteInstanceRef.current.setValue("");
            //     handleUserManuallyEditingDropoff();
            // }
        }
    }

    function handleDropoffPlaceChanged(selectedPlace, isQuickLocation = false) {
        if (!pickupSelected) {
            window.alert("Choose Pick up location first");
            return;
        }

        if (!selectedPlace) return;

        if (selectedPlace.geometry) {
            const location = selectedPlace.geometry.location;
            const selectedCoordinates = {
                lat: typeof location.lat === "function" ? location.lat() : location.lat,
                lng: typeof location.lng === "function" ? location.lng() : location.lng
            };

            setBaseFare(null);
            setDropoffCoordinatesFunc(selectedCoordinates);
            setDropoffAddress(selectedPlace.neat_address || (selectedPlace.name ? `${selectedPlace.name}, Cairns QLD` : null) || selectedPlace.formatted_address || selectedPlace.address);

            if (isQuickLocation && dropoffAutocompleteInstanceRef.current) {
                dropoffAutocompleteInstanceRef.current.setValue(selectedPlace.address || selectedPlace.name || selectedPlace.formatted_address || "");
            }
        }
    }

    // Calculate the fare using the Routes API's bicycling distance.
    async function calculateFare(pickupCoordinates, dropoffCoordinates) {
        const { Route } = await importLibrary("routes");
        const { routes } = await Route.computeRoutes({
            origin: pickupCoordinates,
            destination: dropoffCoordinates,
            travelMode: "BICYCLING",
            fields: ["distanceMeters"]
        });
        const distanceInMeters = routes?.[0]?.distanceMeters;

        if (distanceInMeters == null) {
            throw new Error("Google Routes returned no distance for this trip.");
        }

        const distanceInKilometres = distanceInMeters / 1000;

        // Minimum $10 fare per pedicab
        return Math.max(10, distanceInKilometres * 15);
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

        if (!pickupCoordinates || !dropoffCoordinates) return; // Ignore initial and subsequent loads if coordinates are empty

        console.log("useEffect ran AND passed checks");
        let cancelled = false;

        calculateFare(pickupCoordinates, dropoffCoordinates)
            .then((calculatedBaseFare) => {
                if (!cancelled) setBaseFare(calculatedBaseFare);
            })
            .catch((error) => {
                if (!cancelled) console.error("Google Routes failed to calculate fare", error);
            });

        return () => {
            cancelled = true;
        };

    }, [pickupCoordinates, dropoffCoordinates]);

    return (
        <section className="content-box">

            {!fareCalculationModeSelected && <div className="booking-choice-panel">
                <button
                    type="button"
                    className="booking-mode-option"
                    onClick={() => handleFareCalculationModeSelection("now", "Book For Right Now")}
                >
                    <span className="booking-mode-option-title">Book For Right Now</span>
                    <span className="booking-mode-option-description">
                        You are ordering for right now. Meaning you can see available Pedicab(s) at your current location.
                    </span>
                </button>

                <button
                    type="button"
                    className="booking-mode-option"
                    onClick={() => handleFareCalculationModeSelection("later", "Book For Later Time/Date")}
                >
                    <span className="booking-mode-option-title">Book For Later Time/Date</span>
                    <span className="booking-mode-option-description">
                        Choose any future date/time and pick up location
                    </span>
                </button>
            </div>}

            {fareCalculationModeSelected && <div className="location-section-parent">
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
                                <AutocompleteForCairns
                                    placeholder="Enter Pick Up Location.."
                                    autocompleteInstanceRef={pickupAutocompleteInstanceRef}
                                    onPlaceSelected={handlePickupPlaceChanged}
                                    onInputChange={handleUserManuallyEditingPickup}
                                    initialPlace={initialPickupPlace}
                                />
                            </div>

                            <div>
                                <AutocompleteForCairns
                                    placeholder="Enter Drop Off Location.."
                                    disabled={!pickupSelected}
                                    autocompleteInstanceRef={dropoffAutocompleteInstanceRef}
                                    onPlaceSelected={handleDropoffPlaceChanged}
                                    onInputChange={handleUserManuallyEditingDropoff}
                                />
                                    {/* 
                                        Manually plugging into Places autocomplete:

                                        The Places widget doesn't provide a way to simulate a user selecting a location, so the Popular Locations buttons implement the selection logic directly. So there a few things that need to be covered:

                                        1. The logic for updating the destination coordinates (handleDropoffPlaceChanged).
                                        For this I modified handleDropoffPlaceChanged to accept an isQuickLocation flag and the location object from the quick pick button. It uses that object instead of a result from the Places widget and updates the destination coordinates and address.
                                        
                                        2. The logic for updating the Places widget value to reflect the quick pick location:
                                        For this I use a ref because it is simpler and avoids unnecessary re-renders of the component when the widget value changes. The downside is that I have to manage the value manually, but in this case, it's a reasonable trade-off.

                                        3. The logic for clearing the destination coordinates and fare when the user starts typing:
                                        This is handled by the input event on the Places widget, which calls handleUserManuallyEditingDropoff. This function clears the destination coordinates and fare state variables, but does not clear the widget value itself, so the user can continue typing and get suggestions.
                                        */}
                            </div>

                                </div>
                            </section>

                            <section className="quick-locations-panel">
                                <h2 className="quick-locations-panel-title">
                                    {pickupSelected ? "Choose A Popular Dropoff Location" : "Choose A Popular Pickup Location"}
                                </h2>

                                <div className="quick-locations-panel-options">
                                    {QUICK_LOCATIONS.map((loc) => {
                                        return (
                                            <button
                                                key={loc.shorthand_name}
                                                type="button"
                                                title={loc.shorthand_name}
                                                className="quick-locations-panel-button"
                                                onClick={() => handleQuickLocationSelection(loc)}
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

            <div className={`map-frame ${!fareCalculationModeSelected ? "map-frame-preloaded" : ""}`}>
                {mapsReady && <GoogleMap
                        mapContainerStyle={mapContainerStyle}
                        center={pickupCoordinates || userLocation || mapCenterCoordinates}
                        zoom={14}
                        options={{
                            mapTypeControl: false,
                            streetViewControl: false,
                            fullscreenControl: false,
                        }}
                    >
                        {pickupCoordinates && <Marker position={pickupCoordinates} label="Pick Up" />}

                        {dropoffCoordinates && <Marker position={dropoffCoordinates} label="Drop Off" />}
                    </GoogleMap>}

            </div>

            {fareCalculationModeSelected && mapsReady && <div className="fare-calculation-section">
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

            {fareCalculationModeSelected && mapsReady && !bookingVisible && (
                <div className="fare-calculator-actions">
                    <button 
                        type="button" 
                        className="book-ride-button" 
                        onClick={openBooking}
                        disabled={!totalFare}
                    >
                        {fareCalculationModeTitle}
                    </button>

                    <button 
                        type="button" 
                        className="book-ride-button fare-calculator-back-button"
                        onClick={handleFareCalculationModeBack}
                    >
                        Go Back
                    </button>
                </div>
            )}

            {fareCalculationModeSelected && mapsReady && bookingVisible && BookingComponent && (
                    <BookingComponent
                        closeBooking={closeBooking}
                        bookingMode={bookingMode}
                        fare={totalFare}
                        numberOfPedicabs={numberOfPedicabs}
                        pickupAddress={pickupAddress}
                        dropoffAddress={dropoffAddress}
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