import { useRef } from "react";
import { Autocomplete } from "@react-google-maps/api";

const cairnsServiceArea = {
    south: -16.98,
    west: 145.70,
    north: -16.85,
    east: 145.85
};

// coordinatesStateSetterFunccan be either the setPickupCoordinates or setDestinationCoordinates state function

function AutocompleteForCairns({ placeholder, coordinatesStateSetterFunc, disabled = false, onLocationSelected, onInputChange, value }) 
{
    // although this ref wont save a re-render because the locations vaiables themselfs are state, is still good as Separation of Render Data vs. Instance Data
    const autocompleteInstanceRef = useRef(null);

    // Runs as soon as the component loads via onLoad. Gets passed a new autocompleteInstance and sets the autocomplete bounds for it
    // Then stores it in the ref autocompleteInstanceRef. FareCalculator.jsx uses it for both the destination and pickup:
    function handleAutocompleteLoad(newAutocompleteInstance) {
        const cairnsServiceAreaObject =
            new window.google.maps.LatLngBounds(
                { lat: cairnsServiceArea.south, lng: cairnsServiceArea.west },
                { lat: cairnsServiceArea.north, lng: cairnsServiceArea.east }
            );
        newAutocompleteInstance.setBounds(cairnsServiceAreaObject);
        autocompleteInstanceRef.current = newAutocompleteInstance;
    }

    // Get the coordinates of the selected location
    function handlePlaceChanged() {
        if (!autocompleteInstanceRef.current) return;
        const selectedPlace = autocompleteInstanceRef.current.getPlace();
        if (selectedPlace.geometry) {
            const selectedCoordinates = {
                lat: selectedPlace.geometry.location.lat(),
                lng: selectedPlace.geometry.location.lng()
            };

            coordinatesStateSetterFunc(selectedCoordinates);
            onLocationSelected?.(selectedCoordinates, selectedPlace.formatted_address || selectedPlace.name || "");
        }
    }

    return (
        <div>
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
                    value={value}
                    onChange={(event) => onInputChange?.(event.target.value)}
                />
            </Autocomplete>
        </div>
    );
}

export default AutocompleteForCairns;