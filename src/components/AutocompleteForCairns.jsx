import { useState } from "react";
import { Autocomplete } from "@react-google-maps/api";

const cairnsServiceArea = {
    south: -16.98,
    west: 145.70,
    north: -16.85,
    east: 145.85
};

// coordinatesStateSetterFunccan be either the setPickupCoordinates or setDestinationCoordinates state function

function AutocompleteForCairns({
    placeholder,
    coordinatesStateSetterFunc,
    disabled = false,
    onLocationSelected,
    onInputChange
}) {
    const [autocompleteInstance, setAutocompleteInstance] = useState(null); // i think i should use a ref for this? or maybe that was for something elese?

    // Runs as soon as the component loads via onLoad.
    // Gets passed a new autocompleteInstance and sets the autocomplete bounds for it
    // Then stores it in the state variable autocompleteInstance
    // FareCalculator.jsx uses it for both the destination and pickup:

    function handleAutocompleteLoad(newAutocompleteInstance) {
        const cairnsServiceAreaObject =
            new window.google.maps.LatLngBounds(
                { lat: cairnsServiceArea.south, lng: cairnsServiceArea.west },
                { lat: cairnsServiceArea.north, lng: cairnsServiceArea.east }
            );
        newAutocompleteInstance.setBounds(cairnsServiceAreaObject);
        setAutocompleteInstance(newAutocompleteInstance);
    }

    // Get the coordinates of the selected location
    function handlePlaceChanged() {
        if (!autocompleteInstance) return;
        const selectedPlace = autocompleteInstance.getPlace();
        if (selectedPlace.geometry) {
            coordinatesStateSetterFunc({
                lat: selectedPlace.geometry.location.lat(),
                lng: selectedPlace.geometry.location.lng()
            });
            onLocationSelected?.();
        }
    }

    return (
        <div className="location-field">
            <Autocomplete
                onLoad={handleAutocompleteLoad}
                onPlaceChanged={handlePlaceChanged}
                options={{
                    componentRestrictions: { country: "au" },
                    bounds: cairnsServiceArea,
                    strictBounds: true
                }}
            >
                <input
                    type="text"
                    className="custom-input"
                    placeholder={placeholder}
                    disabled={disabled}
                    onChange={(event) => onInputChange?.(event.target.value)}
                />
            </Autocomplete>
            </div>
    );
}

export default AutocompleteForCairns;