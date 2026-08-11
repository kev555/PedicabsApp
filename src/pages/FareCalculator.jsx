import { useState, useEffect } from "react";
import { GoogleMap, Marker, Autocomplete } from "@react-google-maps/api";

const mapContainerStyle = {
    width: "100%",
    height: "400px"
};

// Cairns area used to prefer local autocomplete results
const cairnsServiceArea = {
    south: -16.98,
    west: 145.70,
    north: -16.85,
    east: 145.85
};

// Fixed pickup location
const defaultPickupLocation = {
    lat: -16.9189,
    lng: 145.7763
};

function FareCalculator() {
    const [pickupLocation] = useState(defaultPickupLocation);
    const [selectedDestinationCoordinates, setSelectedDestinationCoordinates] = useState(null);
    const [destinationAutocompleteInstance, setDestinationAutocompleteInstance] = useState(null);
    const [fare, setFare] = useState(null);

    // Set the autocomplete search area to Cairns
    function handleDestinationAutocompleteLoad(autocompleteInstance) {
        const cairnsServiceAreaObject = new window.google.maps.LatLngBounds(
            { lat: cairnsServiceArea.south, lng: cairnsServiceArea.west },
            { lat: cairnsServiceArea.north, lng: cairnsServiceArea.east }
        );

        autocompleteInstance.setBounds(cairnsServiceAreaObject);
        setDestinationAutocompleteInstance(autocompleteInstance);
    }

    // Get the coordinates of the destination selected by the user
    function handleDestinationPlaceSelectionChanged() {
        if (destinationAutocompleteInstance !== null) {
            const selectedDestination = destinationAutocompleteInstance.getPlace();

            if (selectedDestination.geometry) {
                setSelectedDestinationCoordinates({
                    lat: selectedDestination.geometry.location.lat(),
                    lng: selectedDestination.geometry.location.lng()
                });
            }
        }
    }

    // Calculate the fare using Google Maps driving distance
    function calculateFare(selectedDestinationCoordinates) {
        const distanceService = new window.google.maps.DistanceMatrixService();

        distanceService.getDistanceMatrix(
            {
                origins: [pickupLocation],
                destinations: [selectedDestinationCoordinates],
                travelMode: window.google.maps.TravelMode.BICYCLING
            },
            (response, status) => {
                if (status === "OK") {
                    const distanceInMeters = response.rows[0].elements[0].distance.value;
                    const distanceInKilometres = distanceInMeters / 1000;
                    const calculatedFare = Math.max(10, distanceInKilometres * 15);

                    setFare(calculatedFare.toFixed(2));
                }
            }
        );
    }

    // Recalculate whenever the destination changes
    useEffect(() => { 
        if (selectedDestinationCoordinates) calculateFare(selectedDestinationCoordinates); 
    }, [selectedDestinationCoordinates]);

    return (
        <section className="content-box">
            <h2>Fare Calculator</h2>
            <p>Starting Point: <strong>La Pizza Restaurant, Cairns Esplanade</strong></p>

            <Autocomplete
                onLoad={handleDestinationAutocompleteLoad}
                onPlaceChanged={handleDestinationPlaceSelectionChanged}
                options={{
                    componentRestrictions: { country: "au" },
                    strictBounds: false
                }}
            >
                <input type="text" className="custom-input" placeholder="Where would you like to go?" />
            </Autocomplete>

            <GoogleMap 
                mapContainerStyle={mapContainerStyle} 
                center={pickupLocation} 
                zoom={15}
                options={{ 
                            mapTypeControl: false, 
                            mapTypeControl: false,
                            streetViewControl: false,
                            fullscreenControl: false
                        }}
            >
                <Marker position={pickupLocation} label="Start" />
                {selectedDestinationCoordinates && <Marker position={selectedDestinationCoordinates} label="End" />}
                    
            </GoogleMap>

            <h1>Total Fare: ${fare}</h1>
                ($10 minimum fare)
        </section>
    );
}

export default FareCalculator;